/**
 * Pattern detection types
 */

import { Pattern, Repository, Embedding, Match } from '@cross-repo-refactor/core';

export interface ParserConfig {
  language: string;
  extensions: string[];
  parser: 'babel' | 'tree-sitter';
}

export interface CodeNode {
  type: string;
  name?: string;
  startLine: number;
  endLine: number;
  code: string;
  children: CodeNode[];
  metadata: Record<string, any>;
}

export interface ExtractedPattern {
  node: CodeNode;
  filePath: string;
  repository: Repository;
}

export interface EmbeddingProvider {
  name: string;
  generateEmbedding(code: string, language: string): Promise<Embedding>;
  generateBatchEmbeddings(codes: string[], language: string): Promise<Embedding[]>;
}

export interface SimilarityResult {
  pattern1: Pattern;
  pattern2: Pattern;
  similarity: number;
  method: 'cosine' | 'euclidean' | 'dot-product';
}

export interface DetectionConfig {
  languages: string[];
  minPatternSize: number; // minimum lines of code
  maxPatternSize: number; // maximum lines of code
  similarityThreshold: number; // 0-1
  excludePatterns: string[]; // glob patterns to exclude
  includePatterns: string[]; // glob patterns to include
  extractTypes: ('function' | 'class' | 'method' | 'import' | 'config')[];
}

export interface DetectionResult {
  patterns: Pattern[];
  matches: Match[];
  statistics: {
    filesScanned: number;
    patternsExtracted: number;
    matchesFound: number;
    processingTime: number;
  };
}

export interface MatchingOptions {
  threshold: number;
  maxMatches?: number;
  crossLanguage?: boolean;
  includeContext?: boolean;
}

// Made with Bob
