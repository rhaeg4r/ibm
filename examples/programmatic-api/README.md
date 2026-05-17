# Programmatic API Example

This example shows how to use the Cross-Repo Refactor Coordinator as a library in your own Node.js applications.

## Quick Start

```bash
# Set environment variables
export GITHUB_TOKEN=your_token_here

# Run the example
npm start
```

## Code Overview

```typescript
import { createPlatformAdapter } from '@cross-repo-refactor/platform';
import { createRepositoryManager } from '@cross-repo-refactor/repository';
import { createPatternDetector } from '@cross-repo-refactor/pattern-detection';
import { createRefactoringEngine } from '@cross-repo-refactor/refactoring';

// 1. Connect to platform
const platform = createPlatformAdapter({
  platform: 'github',
  token: process.env.GITHUB_TOKEN!,
  tokenType: 'personal',
});

// 2. Get repositories
const repos = await platform.listRepositories('my-org');

// 3. Setup managers
const repoManager = createRepositoryManager({ /* config */ });
const detector = createPatternDetector({ /* config */ }, repoManager.workspace);
const engine = createRefactoringEngine(repoManager.workspace);

// 4. Clone repositories
await repoManager.cloner.cloneMany(repos);

// 5. Detect patterns
const result = await detector.detectInRepositories(repos);

// 6. Apply refactoring
const batchResult = await engine.applyBatchRefactoring(
  result.matches,
  'function-to-arrow'
);

// 7. Create PRs
for (const match of result.matches) {
  await repoManager.workspace.createBranch(match.targetRepo, 'refactor/...');
  await repoManager.workspace.commit(match.targetRepo, 'refactor: ...');
  await repoManager.workspace.push(match.targetRepo, 'refactor/...');
  await platform.createPR(match.targetRepo.id, { /* PR config */ });
}
```

## Use Cases

### 1. Automated Refactoring Pipeline

```typescript
// Run as part of CI/CD
async function refactorPipeline() {
  const platform = createPlatformAdapter({ /* ... */ });
  const repos = await platform.listRepositories('my-org');
  
  // Filter repos by criteria
  const targetRepos = repos.filter(r => 
    r.language === 'TypeScript' && 
    r.defaultBranch === 'main'
  );
  
  // Run refactoring
  // ...
}
```

### 2. Custom Pattern Detection

```typescript
// Detect custom patterns
const detector = createPatternDetector({
  detection: {
    minPatternSize: 20,
    maxPatternSize: 100,
    similarityThreshold: 0.9,
    extractTypes: ['function', 'class'],
  },
  ai: { provider: 'cohere', apiKey: process.env.COHERE_API_KEY },
}, workspace);
```

### 3. Selective Refactoring

```typescript
// Apply refactoring only to specific matches
const highConfidenceMatches = result.matches.filter(
  m => m.similarity > 0.95
);

await engine.applyBatchRefactoring(
  highConfidenceMatches,
  'function-to-arrow',
  { validate: true, createBackup: true }
);
```

### 4. Multi-Platform Support

```typescript
// Work with multiple platforms
const github = createPlatformAdapter({ platform: 'github', /* ... */ });
const gitlab = createPlatformAdapter({ platform: 'gitlab', /* ... */ });

const githubRepos = await github.listRepositories('org1');
const gitlabRepos = await gitlab.listRepositories('org2');

// Process all repos together
const allRepos = [...githubRepos, ...gitlabRepos];
```

## API Reference

### Platform Adapter

```typescript
interface PlatformAdapter {
  authenticate(): Promise<void>;
  listRepositories(owner: string): Promise<Repository[]>;
  getRepository(id: string): Promise<Repository>;
  createPR(repoId: string, options: PROptions): Promise<PullRequest>;
  updatePR(prId: string, updates: Partial<PROptions>): Promise<PullRequest>;
  mergePR(prId: string, options?: MergeOptions): Promise<void>;
  linkPRs(prIds: string[], message: string): Promise<void>;
}
```

### Repository Manager

```typescript
interface RepositoryManager {
  cloner: RepositoryCloner;
  cache: RepositoryCache;
  workspace: WorkspaceManager;
  dispose(): void;
}
```

### Pattern Detector

```typescript
interface PatternDetector {
  detectInRepository(repo: Repository): Promise<Pattern[]>;
  detectInRepositories(repos: Repository[]): Promise<DetectionResult>;
  findSimilarPatterns(pattern: Pattern, repos: Repository[]): Promise<PatternMatch[]>;
}
```

### Refactoring Engine

```typescript
interface RefactoringEngine {
  previewRefactoring(match: PatternMatch, strategy: string): Promise<RefactoringPreview>;
  applyRefactoring(match: PatternMatch, strategy: string, options?: RefactoringOptions): Promise<RefactoringResult>;
  applyBatchRefactoring(matches: PatternMatch[], strategy: string, options?: RefactoringOptions): Promise<Map<string, RefactoringResult>>;
  listStrategies(): string[];
  getStatistics(results: Map<string, RefactoringResult>): string;
}
```

## Configuration

### Repository Manager Config

```typescript
{
  cache: {
    baseDir: './.cache/repos',
    maxSize: 2048,        // MB
    maxAge: 14,           // days
    cleanupInterval: 24,  // hours
  },
  workspace: {
    rootDir: './workspace',
    repositories: repos,
    parallel: 3,          // concurrent operations
  }
}
```

### Pattern Detection Config

```typescript
{
  ai: {
    provider: 'cohere' | 'local',
    apiKey: 'your-key',
    model: 'embed-english-v3.0',
  },
  detection: {
    minPatternSize: 10,
    maxPatternSize: 50,
    similarityThreshold: 0.8,
    extractTypes: ['function', 'class', 'method'],
  }
}
```

### Refactoring Options

```typescript
{
  dryRun: false,        // Preview only
  validate: true,       // Validate syntax
  createBackup: true,   // Backup before changes
}
```

## Error Handling

```typescript
try {
  const result = await engine.applyBatchRefactoring(matches, strategy);
  
  // Check for failures
  for (const [id, res] of result.entries()) {
    if (!res.success) {
      console.error(`Failed for ${id}:`, res.error);
    }
  }
} catch (error) {
  console.error('Batch refactoring failed:', error);
}
```

## Best Practices

1. **Always validate**: Use `validate: true` to catch syntax errors
2. **Create backups**: Use `createBackup: true` for safety
3. **Start with dry-run**: Preview changes before applying
4. **Filter matches**: Only refactor high-confidence matches
5. **Handle errors**: Check individual results in batch operations
6. **Clean up**: Call `repoManager.dispose()` when done

## Learn More

- [Complete Workflow Example](../complete-workflow/)
- [CLI Tool](../../packages/cli/)
- [API Documentation](../../docs/API.md)