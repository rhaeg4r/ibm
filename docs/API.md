# API Reference

Complete API documentation for the Cross-Repo Refactor Coordinator.

## Table of Contents

1. [Platform Package](#platform-package)
2. [Repository Package](#repository-package)
3. [Pattern Detection Package](#pattern-detection-package)
4. [Refactoring Package](#refactoring-package)
5. [Core Types](#core-types)

---

## Platform Package

### `createPlatformAdapter(credentials: Credentials): GitPlatformAdapter`

Creates a platform adapter for GitHub, GitLab, or Bitbucket.

**Parameters:**
- `credentials.platform`: `'github' | 'gitlab' | 'bitbucket'`
- `credentials.token`: Authentication token
- `credentials.tokenType`: `'personal' | 'oauth' | 'app'`
- `credentials.baseUrl?`: Custom API base URL (for self-hosted)

**Returns:** `GitPlatformAdapter`

**Example:**
```typescript
const platform = createPlatformAdapter({
  platform: 'github',
  token: process.env.GITHUB_TOKEN!,
  tokenType: 'personal',
});
```

### GitPlatformAdapter Interface

#### `authenticate(): Promise<void>`

Authenticates with the platform and validates credentials.

**Throws:** `Error` if authentication fails

**Example:**
```typescript
await platform.authenticate();
```

#### `listRepositories(owner: string, options?: ListOptions): Promise<Repository[]>`

Lists all repositories for an organization or user.

**Parameters:**
- `owner`: Organization or user name
- `options.page?`: Page number (default: 1)
- `options.perPage?`: Results per page (default: 100)
- `options.type?`: `'all' | 'public' | 'private'` (default: 'all')

**Returns:** Array of `Repository` objects

**Example:**
```typescript
const repos = await platform.listRepositories('my-org', {
  type: 'all',
  perPage: 50,
});
```

#### `getRepository(id: string): Promise<Repository>`

Gets a single repository by ID or full name.

**Parameters:**
- `id`: Repository ID or "owner/name"

**Returns:** `Repository` object

**Example:**
```typescript
const repo = await platform.getRepository('my-org/my-repo');
```

#### `createPR(repoId: string, options: PROptions): Promise<PullRequest>`

Creates a pull request.

**Parameters:**
- `repoId`: Repository ID
- `options.title`: PR title
- `options.description`: PR description
- `options.sourceBranch`: Source branch name
- `options.targetBranch`: Target branch name
- `options.labels?`: Array of label names
- `options.draft?`: Create as draft (default: false)

**Returns:** `PullRequest` object

**Example:**
```typescript
const pr = await platform.createPR('repo-id', {
  title: 'Refactor: Convert to arrow functions',
  description: 'Automated refactoring',
  sourceBranch: 'refactor/arrows',
  targetBranch: 'main',
  labels: ['refactoring', 'automated'],
  draft: true,
});
```

#### `updatePR(prId: string, updates: Partial<PROptions>): Promise<PullRequest>`

Updates an existing pull request.

**Parameters:**
- `prId`: Pull request ID
- `updates`: Partial PR options to update

**Returns:** Updated `PullRequest` object

#### `mergePR(prId: string, options?: MergeOptions): Promise<void>`

Merges a pull request.

**Parameters:**
- `prId`: Pull request ID
- `options.method?`: `'merge' | 'squash' | 'rebase'` (default: 'merge')
- `options.deleteSourceBranch?`: Delete branch after merge (default: false)

#### `linkPRs(prIds: string[], message: string): Promise<void>`

Links related pull requests together.

**Parameters:**
- `prIds`: Array of PR IDs to link
- `message`: Link description

**Example:**
```typescript
await platform.linkPRs(
  ['pr-1', 'pr-2', 'pr-3'],
  'Related refactoring changes across repositories'
);
```

---

## Repository Package

### `createRepositoryManager(config: RepositoryManagerConfig): RepositoryManager`

Creates a repository manager for cloning and managing repositories.

**Parameters:**
- `config.cache`: Cache configuration
- `config.workspace`: Workspace configuration

**Returns:** `RepositoryManager`

**Example:**
```typescript
const repoManager = createRepositoryManager({
  cache: {
    baseDir: './.cache/repos',
    maxSize: 2048,
    maxAge: 14,
    cleanupInterval: 24,
  },
  workspace: {
    rootDir: './workspace',
    repositories: repos,
    parallel: 3,
  },
});
```

### RepositoryManager Interface

#### `cloner: RepositoryCloner`

Repository cloning operations.

##### `clone(repo: Repository, options?: CloneOptions): Promise<string>`

Clones a single repository.

**Parameters:**
- `repo`: Repository to clone
- `options.depth?`: Clone depth (default: full)
- `options.singleBranch?`: Clone only default branch (default: false)
- `options.token?`: Authentication token

**Returns:** Local path to cloned repository

**Example:**
```typescript
const localPath = await repoManager.cloner.clone(repo, {
  depth: 1,
  singleBranch: true,
  token: process.env.GITHUB_TOKEN,
});
```

##### `cloneMany(repos: Repository[], options?: CloneOptions, parallel?: number, onProgress?: ProgressCallback): Promise<Map<string, string>>`

Clones multiple repositories in parallel.

**Parameters:**
- `repos`: Array of repositories to clone
- `options`: Clone options
- `parallel`: Number of parallel clones (default: 3)
- `onProgress`: Progress callback function

**Returns:** Map of repository ID to local path

**Example:**
```typescript
const results = await repoManager.cloner.cloneMany(
  repos,
  { depth: 1 },
  5,
  (progress) => {
    console.log(`${progress.current}/${progress.total}: ${progress.repository.name}`);
  }
);
```

#### `cache: RepositoryCache`

Repository caching operations.

##### `get(repoId: string): Promise<string | null>`

Gets cached repository path.

##### `set(repoId: string, path: string): Promise<void>`

Caches repository path.

##### `has(repoId: string): Promise<boolean>`

Checks if repository is cached.

##### `clear(): Promise<void>`

Clears entire cache.

##### `cleanup(): Promise<void>`

Removes old cached repositories.

#### `workspace: WorkspaceManager`

Workspace management operations.

##### `getRepositoryPath(repo: Repository): string`

Gets local path for a repository.

##### `createBranch(repo: Repository, branchName: string, baseBranch: string): Promise<void>`

Creates a new branch.

**Example:**
```typescript
await repoManager.workspace.createBranch(
  repo,
  'refactor/arrows',
  'main'
);
```

##### `commit(repo: Repository, message: string): Promise<string>`

Commits changes.

**Returns:** Commit SHA

##### `push(repo: Repository, branch: string): Promise<void>`

Pushes branch to remote.

##### `hasUncommittedChanges(repo: Repository): Promise<boolean>`

Checks for uncommitted changes.

#### `dispose(): void`

Cleans up resources.

---

## Pattern Detection Package

### `createPatternDetector(config: PatternDetectorConfig, workspace: WorkspaceManager): PatternDetector`

Creates a pattern detector for finding similar code patterns.

**Parameters:**
- `config.ai`: AI configuration
- `config.detection`: Detection configuration
- `workspace`: Workspace manager

**Returns:** `PatternDetector`

**Example:**
```typescript
const detector = createPatternDetector(
  {
    ai: {
      provider: 'cohere',
      apiKey: process.env.COHERE_API_KEY!,
      model: 'embed-english-v3.0',
    },
    detection: {
      minPatternSize: 10,
      maxPatternSize: 50,
      similarityThreshold: 0.8,
      extractTypes: ['function', 'class'],
    },
  },
  workspace
);
```

### PatternDetector Interface

#### `detectInRepository(repo: Repository): Promise<Pattern[]>`

Detects patterns in a single repository.

**Returns:** Array of detected patterns

**Example:**
```typescript
const patterns = await detector.detectInRepository(repo);
console.log(`Found ${patterns.length} patterns`);
```

#### `detectInRepositories(repos: Repository[]): Promise<DetectionResult>`

Detects patterns across multiple repositories.

**Returns:** `DetectionResult` with patterns and matches

**Example:**
```typescript
const result = await detector.detectInRepositories(repos);
console.log(`Patterns: ${result.patterns.length}`);
console.log(`Matches: ${result.matches.length}`);
```

#### `findSimilarPatterns(pattern: Pattern, repos: Repository[]): Promise<PatternMatch[]>`

Finds patterns similar to a given pattern.

**Parameters:**
- `pattern`: Source pattern
- `repos`: Repositories to search

**Returns:** Array of pattern matches

---

## Refactoring Package

### `createRefactoringEngine(workspace: WorkspaceManager): RefactoringEngine`

Creates a refactoring engine for applying code transformations.

**Parameters:**
- `workspace`: Workspace manager

**Returns:** `RefactoringEngine`

**Example:**
```typescript
const engine = createRefactoringEngine(workspace);
```

### RefactoringEngine Interface

#### `previewRefactoring(match: PatternMatch, strategy: string): Promise<RefactoringPreview>`

Previews refactoring without applying changes.

**Parameters:**
- `match`: Pattern match to refactor
- `strategy`: Refactoring strategy name

**Returns:** `RefactoringPreview` with diff

**Example:**
```typescript
const preview = await engine.previewRefactoring(match, 'function-to-arrow');
console.log(preview.diff);
```

#### `applyRefactoring(match: PatternMatch, strategy: string, options?: RefactoringOptions): Promise<RefactoringResult>`

Applies refactoring to a single match.

**Parameters:**
- `match`: Pattern match to refactor
- `strategy`: Refactoring strategy name
- `options.dryRun?`: Preview only (default: false)
- `options.validate?`: Validate syntax (default: true)
- `options.createBackup?`: Create backup (default: true)

**Returns:** `RefactoringResult`

**Example:**
```typescript
const result = await engine.applyRefactoring(
  match,
  'function-to-arrow',
  { validate: true, createBackup: true }
);

if (result.success) {
  console.log(`Applied ${result.changes} changes`);
}
```

#### `applyBatchRefactoring(matches: PatternMatch[], strategy: string, options?: RefactoringOptions): Promise<Map<string, RefactoringResult>>`

Applies refactoring to multiple matches.

**Returns:** Map of match ID to result

**Example:**
```typescript
const results = await engine.applyBatchRefactoring(
  matches,
  'function-to-arrow',
  { validate: true }
);

for (const [id, result] of results.entries()) {
  console.log(`${id}: ${result.success ? 'Success' : 'Failed'}`);
}
```

#### `listStrategies(): string[]`

Lists available refactoring strategies.

**Returns:** Array of strategy names

**Example:**
```typescript
const strategies = engine.listStrategies();
// ['function-to-arrow', 'var-to-const', 'promise-to-async', ...]
```

#### `getStatistics(results: Map<string, RefactoringResult>): string`

Gets formatted statistics for batch results.

**Returns:** Formatted statistics string

---

## Core Types

### Repository

```typescript
interface Repository {
  id: string;
  name: string;
  owner: string;
  url: string;
  defaultBranch: string;
  language?: string;
  description?: string;
  private: boolean;
  localPath?: string;
}
```

### Pattern

```typescript
interface Pattern {
  id: string;
  repository?: Repository;
  file: string;
  startLine: number;
  endLine: number;
  code: string;
  embedding?: number[];
  metadata: {
    type: 'function' | 'class' | 'method' | 'block';
    name?: string;
    language: string;
  };
}
```

### PatternMatch

```typescript
interface PatternMatch {
  pattern: Pattern;
  targetRepo: Repository;
  targetFile: string;
  targetLines: [number, number];
  similarity: number;
}
```

### PullRequest

```typescript
interface PullRequest {
  id: string;
  number: number;
  title: string;
  description: string;
  url: string;
  state: 'open' | 'closed' | 'merged';
  sourceBranch: string;
  targetBranch: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### RefactoringResult

```typescript
interface RefactoringResult {
  success: boolean;
  filePath: string;
  changes: number;
  diff?: string;
  error?: string;
  validationErrors?: string[];
}
```

### DetectionResult

```typescript
interface DetectionResult {
  patterns: Pattern[];
  matches: PatternMatch[];
  statistics: {
    totalPatterns: number;
    totalMatches: number;
    processingTime: number;
  };
}
```

---

## Helper Functions

### `createDefaultAIConfig(provider: 'cohere' | 'local'): AIConfig`

Creates default AI configuration.

### `createDefaultDetectionConfig(): DetectionConfig`

Creates default detection configuration.

### `createDefaultRefactoringOptions(): RefactoringOptions`

Creates default refactoring options.

---

## Error Handling

All async methods may throw errors. Always use try-catch:

```typescript
try {
  const result = await engine.applyRefactoring(match, strategy);
} catch (error) {
  console.error('Refactoring failed:', error.message);
}
```

Common error types:
- `AuthenticationError`: Invalid credentials
- `RepositoryNotFoundError`: Repository doesn't exist
- `CloneError`: Failed to clone repository
- `RefactoringError`: Refactoring failed
- `ValidationError`: Code validation failed

---

## Best Practices

1. **Always authenticate first**
   ```typescript
   await platform.authenticate();
   ```

2. **Use validation**
   ```typescript
   { validate: true, createBackup: true }
   ```

3. **Handle errors**
   ```typescript
   for (const [id, result] of results.entries()) {
     if (!result.success) {
       console.error(`Failed: ${result.error}`);
     }
   }
   ```

4. **Clean up resources**
   ```typescript
   repoManager.dispose();
   ```

5. **Use progress callbacks**
   ```typescript
   await cloner.cloneMany(repos, {}, 3, (progress) => {
     console.log(`${progress.current}/${progress.total}`);
   });
   ```

---

## See Also

- [Integration Guide](../INTEGRATION_GUIDE.md)
- [Getting Started](../GETTING_STARTED.md)
- [Examples](../examples/)