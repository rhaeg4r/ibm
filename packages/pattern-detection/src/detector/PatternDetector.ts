/**
 * Pattern detector - main orchestrator for pattern detection
 */

import { glob } from 'glob';
import { Repository, Pattern, Match } from '@cross-repo-refactor/core';
import { WorkspaceManager } from '@cross-repo-refactor/repository';
import { DetectionConfig, DetectionResult, MatchingOptions } from '../types';
import { BaseParser } from '../parsers/BaseParser';
import { TypeScriptParser } from '../parsers/TypeScriptParser';
import { EmbeddingService } from '../embeddings/EmbeddingService';

export class PatternDetector {
  private config: DetectionConfig;
  private workspace: WorkspaceManager;
  private embeddingService: EmbeddingService;
  private parsers: Map<string, BaseParser> = new Map();

  constructor(
    config: DetectionConfig,
    workspace: WorkspaceManager,
    embeddingService: EmbeddingService
  ) {
    this.config = config;
    this.workspace = workspace;
    this.embeddingService = embeddingService;
    this.initializeParsers();
  }

  /**
   * Detect patterns in a single repository
   */
  async detectInRepository(repository: Repository): Promise<Pattern[]> {
    const startTime = Date.now();
    const patterns: Pattern[] = [];

    try {
      // Get repository path
      const repoPath = await this.workspace.getRepositoryPath(repository);
      if (!repoPath) {
        throw new Error(`Repository not found: ${repository.fullName}`);
      }

      // Find files to analyze
      const files = await this.findFiles(repoPath);
      console.log(`Found ${files.length} files to analyze in ${repository.name}`);

      // Extract patterns from files
      for (const file of files) {
        const filePatterns = await this.extractPatternsFromFile(file, repository);
        patterns.push(...filePatterns);
      }

      console.log(`Extracted ${patterns.length} patterns from ${repository.name} in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error(`Failed to detect patterns in ${repository.name}:`, error);
    }

    return patterns;
  }

  /**
   * Detect patterns across multiple repositories
   */
  async detectInRepositories(repositories: Repository[]): Promise<DetectionResult> {
    const startTime = Date.now();
    const allPatterns: Pattern[] = [];
    let filesScanned = 0;

    // Extract patterns from each repository
    for (const repo of repositories) {
      const patterns = await this.detectInRepository(repo);
      allPatterns.push(...patterns);
    }

    // Generate embeddings for all patterns
    console.log('Generating embeddings for patterns...');
    await this.generateEmbeddings(allPatterns);

    // Find matches between patterns
    console.log('Finding pattern matches...');
    const matches = await this.findMatches(allPatterns, {
      threshold: this.config.similarityThreshold,
      crossLanguage: false,
    });

    const processingTime = Date.now() - startTime;

    return {
      patterns: allPatterns,
      matches,
      statistics: {
        filesScanned,
        patternsExtracted: allPatterns.length,
        matchesFound: matches.length,
        processingTime,
      },
    };
  }

  /**
   * Find similar patterns
   */
  async findMatches(patterns: Pattern[], options: MatchingOptions): Promise<Match[]> {
    const matches: Match[] = [];
    const threshold = options.threshold || this.config.similarityThreshold;

    // Compare each pattern with every other pattern
    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const pattern1 = patterns[i];
        const pattern2 = patterns[j];

        // Skip if same repository (unless looking for duplicates)
        if (pattern1.repository?.id === pattern2.repository?.id) {
          continue;
        }

        // Skip if different languages (unless cross-language matching enabled)
        if (!options.crossLanguage && pattern1.language !== pattern2.language) {
          continue;
        }

        // Calculate similarity
        const similarity = await this.calculateSimilarity(pattern1, pattern2);

        if (similarity >= threshold) {
          const match: Match = {
            pattern: pattern1,
            targetRepo: pattern2.repository!,
            targetLocation: pattern2.context,
            similarity,
            confidence: similarity,
            reasoning: `Found similar ${pattern1.metadata.type} pattern with ${(similarity * 100).toFixed(1)}% similarity`,
          };

          matches.push(match);
        }
      }
    }

    // Sort by similarity (highest first)
    matches.sort((a, b) => b.similarity - a.similarity);

    // Limit matches if specified
    if (options.maxMatches) {
      return matches.slice(0, options.maxMatches);
    }

    return matches;
  }

  /**
   * Calculate similarity between two patterns
   */
  private async calculateSimilarity(pattern1: Pattern, pattern2: Pattern): Promise<number> {
    // If embeddings are not available, use simple text similarity
    if (!pattern1.metadata || !pattern2.metadata) {
      return this.textSimilarity(pattern1.code, pattern2.code);
    }

    // Use embedding similarity if available
    const embedding1 = (pattern1.metadata as any).embedding;
    const embedding2 = (pattern2.metadata as any).embedding;

    if (embedding1 && embedding2) {
      return this.embeddingService.cosineSimilarity(embedding1, embedding2);
    }

    // Fallback to text similarity
    return this.textSimilarity(pattern1.code, pattern2.code);
  }

  /**
   * Simple text-based similarity (Jaccard similarity)
   */
  private textSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  /**
   * Generate embeddings for patterns
   */
  private async generateEmbeddings(patterns: Pattern[]): Promise<void> {
    const batchSize = 20;
    
    for (let i = 0; i < patterns.length; i += batchSize) {
      const batch = patterns.slice(i, i + batchSize);
      const codes = batch.map(p => p.code);
      const language = batch[0].language;

      try {
        const embeddings = await this.embeddingService.generateBatchEmbeddings(codes, language);
        
        // Attach embeddings to patterns
        for (let j = 0; j < batch.length; j++) {
          (batch[j].metadata as any).embedding = embeddings[j];
        }
      } catch (error) {
        console.error('Failed to generate embeddings for batch:', error);
      }
    }
  }

  /**
   * Extract patterns from a file
   */
  private async extractPatternsFromFile(filePath: string, repository: Repository): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    try {
      // Read file content
      const content = await this.workspace.readFile(repository, filePath);

      // Get appropriate parser
      const parser = this.getParserForFile(filePath);
      if (!parser) {
        return patterns;
      }

      // Parse file and extract code nodes
      const nodes = await parser.parse(content, filePath);

      // Convert nodes to patterns
      for (const node of nodes) {
        // Filter by type
        if (!this.config.extractTypes.includes(node.type as any)) {
          continue;
        }

        // Filter by size
        const lineCount = node.endLine - node.startLine + 1;
        if (lineCount < this.config.minPatternSize || lineCount > this.config.maxPatternSize) {
          continue;
        }

        const pattern: Pattern = {
          id: `${repository.id}-${filePath}-${node.startLine}`,
          code: node.code,
          language: parser.getLanguage(),
          context: {
            filePath,
            startLine: node.startLine,
            endLine: node.endLine,
            surroundingCode: content,
          },
          metadata: {
            type: node.type as any,
            name: node.name || 'anonymous',
            tags: [],
            complexity: node.metadata.complexity,
            dependencies: node.metadata.dependencies || [],
          },
          repository,
          createdAt: new Date(),
        };

        patterns.push(pattern);
      }
    } catch (error) {
      console.error(`Failed to extract patterns from ${filePath}:`, error);
    }

    return patterns;
  }

  /**
   * Find files to analyze
   */
  private async findFiles(repoPath: string): Promise<string[]> {
    const patterns = this.config.includePatterns.length > 0
      ? this.config.includePatterns
      : ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.java', '**/*.go', '**/*.rs'];

    const files = await glob(patterns, {
      cwd: repoPath,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        ...this.config.excludePatterns,
      ],
      absolute: false,
    });

    return files;
  }

  /**
   * Get parser for file
   */
  private getParserForFile(filePath: string): BaseParser | null {
    for (const parser of this.parsers.values()) {
      if (parser.supportsFile(filePath)) {
        return parser;
      }
    }
    return null;
  }

  /**
   * Initialize parsers
   */
  private initializeParsers(): void {
    // Add TypeScript/JavaScript parser
    this.parsers.set('typescript', new TypeScriptParser());

    // TODO: Add more parsers for other languages
    // this.parsers.set('python', new PythonParser());
    // this.parsers.set('java', new JavaParser());
    // this.parsers.set('go', new GoParser());
  }
}

// Made with Bob
