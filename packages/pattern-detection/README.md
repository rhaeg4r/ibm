# @cross-repo-refactor/pattern-detection

AI-powered pattern detection package for Cross-Repo Refactor Coordinator. Detects code patterns across repositories using AST parsing and semantic embeddings.

## Features

- **Multi-Language Support**: TypeScript, JavaScript, Python, Java, Go, Rust (extensible)
- **AST-Based Parsing**: Accurate code structure extraction using Babel and Tree-sitter
- **AI-Powered Matching**: Semantic similarity using embeddings (OpenAI, Cohere, local models)
- **Pattern Extraction**: Functions, classes, methods, imports, and more
- **Cross-Repository Analysis**: Find similar patterns across multiple repositories
- **Configurable Detection**: Fine-tune what patterns to extract and match

## Installation

```bash
npm install @cross-repo-refactor/pattern-detection
```

## Quick Start

```typescript
import { createPatternDetector, createDefaultDetectionConfig, createDefaultAIConfig } from '@cross-repo-refactor/pattern-detection';
import { createRepositoryManager } from '@cross-repo-refactor/repository';

// Create repository manager
const repoManager = createRepositoryManager({
  cache: { baseDir: './.cache/repos' },
  workspace: { rootDir: './workspace', repositories: [], parallel: 3 }
});

// Create pattern detector
const detector = createPatternDetector(
  {
    ai: createDefaultAIConfig('openai'), // or 'anthropic', 'local'
    detection: createDefaultDetectionConfig(),
  },
  repoManager.workspace
);

// Detect patterns in repositories
const result = await detector.detectInRepositories(repositories);

console.log(`Found ${result.patterns.length} patterns`);
console.log(`Found ${result.matches.length} similar patterns`);
```

## Configuration

### Detection Config

```typescript
interface DetectionConfig {
  languages: string[];              // Languages to analyze
  minPatternSize: number;           // Min lines of code (default: 5)
  maxPatternSize: number;           // Max lines of code (default: 100)
  similarityThreshold: number;      // 0-1 (default: 0.75)
  excludePatterns: string[];        // Glob patterns to exclude
  includePatterns: string[];        // Glob patterns to include
  extractTypes: PatternType[];      // Types to extract
}
```

### AI Config

```typescript
interface AIConfig {
  embeddingModel: string;           // Model name
  similarityThreshold: number;      // 0-1
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;                  // API key for cloud providers
}
```

## API Reference

### PatternDetector

Main class for pattern detection.

```typescript
// Detect in single repository
const patterns = await detector.detectInRepository(repository);

// Detect across multiple repositories
const result = await detector.detectInRepositories(repositories);

// Find matches between patterns
const matches = await detector.findMatches(patterns, {
  threshold: 0.8,
  maxMatches: 100,
  crossLanguage: false,
});
```

### EmbeddingService

Generate and compare code embeddings.

```typescript
const service = new EmbeddingService(aiConfig);

// Generate single embedding
const embedding = await service.generateEmbedding(code, 'typescript');

// Generate batch embeddings
const embeddings = await service.generateBatchEmbeddings(codes, 'typescript');

// Calculate similarity
const similarity = service.cosineSimilarity(embedding1, embedding2);
```

### TypeScriptParser

Parse TypeScript/JavaScript code.

```typescript
const parser = new TypeScriptParser();

// Parse code and extract nodes
const nodes = await parser.parse(code, filePath);

// Check if file is supported
if (parser.supportsFile('app.ts')) {
  // Parse file
}
```

## Pattern Types

The detector can extract the following pattern types:

- **function**: Function declarations and expressions
- **class**: Class declarations
- **method**: Class methods
- **import**: Import statements
- **config**: Configuration objects (planned)

## Examples

### Example 1: Detect Patterns in Repository

```typescript
import { createPatternDetector, createDefaultDetectionConfig, createDefaultAIConfig } from '@cross-repo-refactor/pattern-detection';

const detector = createPatternDetector(
  {
    ai: createDefaultAIConfig('local'), // Use local embeddings
    detection: {
      ...createDefaultDetectionConfig(),
      minPatternSize: 10,
      maxPatternSize: 50,
      extractTypes: ['function', 'class'],
    },
  },
  workspace
);

const patterns = await detector.detectInRepository(repository);

for (const pattern of patterns) {
  console.log(`${pattern.metadata.type}: ${pattern.metadata.name}`);
  console.log(`  Lines: ${pattern.context.startLine}-${pattern.context.endLine}`);
  console.log(`  Complexity: ${pattern.metadata.complexity}`);
}
```

### Example 2: Find Similar Patterns

```typescript
// Detect patterns in all repositories
const result = await detector.detectInRepositories(repositories);

// Group matches by similarity
const highSimilarity = result.matches.filter(m => m.similarity > 0.9);
const mediumSimilarity = result.matches.filter(m => m.similarity > 0.75 && m.similarity <= 0.9);

console.log(`High similarity matches: ${highSimilarity.length}`);
console.log(`Medium similarity matches: ${mediumSimilarity.length}`);

// Show top matches
for (const match of highSimilarity.slice(0, 10)) {
  console.log(`\nMatch: ${(match.similarity * 100).toFixed(1)}% similar`);
  console.log(`  Source: ${match.pattern.repository?.name} - ${match.pattern.context.filePath}`);
  console.log(`  Target: ${match.targetRepo.name} - ${match.targetLocation.filePath}`);
}
```

### Example 3: Custom Embedding Provider

```typescript
import { EmbeddingService } from '@cross-repo-refactor/pattern-detection';

const service = new EmbeddingService({
  provider: 'openai',
  embeddingModel: 'text-embedding-3-large',
  apiKey: process.env.OPENAI_API_KEY,
  similarityThreshold: 0.8,
});

// Generate embeddings
const codes = [
  'function add(a, b) { return a + b; }',
  'const add = (a, b) => a + b;',
  'function subtract(a, b) { return a - b; }',
];

const embeddings = await service.generateBatchEmbeddings(codes, 'javascript');

// Compare similarities
for (let i = 0; i < embeddings.length; i++) {
  for (let j = i + 1; j < embeddings.length; j++) {
    const similarity = service.cosineSimilarity(embeddings[i], embeddings[j]);
    console.log(`Code ${i} vs Code ${j}: ${(similarity * 100).toFixed(1)}% similar`);
  }
}
```

### Example 4: Filter by Complexity

```typescript
const result = await detector.detectInRepositories(repositories);

// Find complex patterns (potential refactoring candidates)
const complexPatterns = result.patterns.filter(p => 
  p.metadata.complexity && p.metadata.complexity > 10
);

console.log(`Found ${complexPatterns.length} complex patterns`);

// Sort by complexity
complexPatterns.sort((a, b) => 
  (b.metadata.complexity || 0) - (a.metadata.complexity || 0)
);

// Show top 10 most complex
for (const pattern of complexPatterns.slice(0, 10)) {
  console.log(`${pattern.metadata.name} - Complexity: ${pattern.metadata.complexity}`);
  console.log(`  ${pattern.repository?.name}:${pattern.context.filePath}`);
}
```

## Supported Languages

### Currently Implemented
- TypeScript (.ts, .tsx)
- JavaScript (.js, .jsx)

### Planned
- Python (.py)
- Java (.java)
- Go (.go)
- Rust (.rs)
- C# (.cs)
- Ruby (.rb)

## Embedding Providers

### OpenAI
- Model: `text-embedding-3-small` (default), `text-embedding-3-large`
- Requires: `OPENAI_API_KEY`
- Best for: High-quality semantic matching

### Cohere
- Model: `embed-english-v3.0` (default)
- Requires: `COHERE_API_KEY`
- Best for: Multilingual support

### Local
- Model: Simple hash-based (placeholder)
- Requires: Nothing
- Best for: Testing, offline development
- Note: In production, integrate CodeBERT or similar

## Performance Tips

1. **Batch Processing**: Use `generateBatchEmbeddings` for multiple patterns
2. **Filter Early**: Set appropriate `minPatternSize` and `maxPatternSize`
3. **Limit Scope**: Use `includePatterns` to focus on specific files
4. **Cache Embeddings**: Store embeddings to avoid regeneration
5. **Parallel Detection**: Process repositories in parallel

## Best Practices

1. **Start with Local Provider**: Test your setup without API costs
2. **Tune Thresholds**: Adjust `similarityThreshold` based on your needs
3. **Filter by Type**: Focus on specific pattern types for better results
4. **Review Matches**: Always review high-similarity matches manually
5. **Monitor Complexity**: Use complexity metrics to prioritize refactoring

## Troubleshooting

### Issue: No patterns detected

**Solution**: Check your detection config:
```typescript
{
  minPatternSize: 5,  // Lower this
  extractTypes: ['function', 'class', 'method'],  // Include more types
}
```

### Issue: Too many false positives

**Solution**: Increase similarity threshold:
```typescript
{
  similarityThreshold: 0.85,  // Increase from 0.75
}
```

### Issue: API rate limits

**Solution**: Use batch processing and caching:
```typescript
// Process in smaller batches
const batchSize = 20;
for (let i = 0; i < patterns.length; i += batchSize) {
  const batch = patterns.slice(i, i + batchSize);
  await generateEmbeddings(batch);
  await sleep(1000); // Rate limit
}
```

## License

MIT