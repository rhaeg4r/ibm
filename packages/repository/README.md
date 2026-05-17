# @cross-repo-refactor/repository

Repository management package for Cross-Repo Refactor Coordinator. Handles cloning, caching, and managing multiple Git repositories efficiently.

## Features

- **Smart Caching**: LRU cache with configurable size and age limits
- **Parallel Cloning**: Clone multiple repositories concurrently
- **Progress Tracking**: Real-time progress updates during cloning
- **Workspace Management**: Manage multiple repositories in a unified workspace
- **Git Operations**: Branch creation, commits, pushes, and more
- **File Operations**: Read, write, and list files across repositories

## Installation

```bash
npm install @cross-repo-refactor/repository
```

## Quick Start

```typescript
import { createRepositoryManager } from '@cross-repo-refactor/repository';
import { Repository } from '@cross-repo-refactor/core';

// Create repository manager
const manager = createRepositoryManager({
  cache: {
    baseDir: './.cache/repositories',
    maxSize: 1024, // 1GB
    maxAge: 7, // 7 days
    cleanupInterval: 24, // 24 hours
  },
  workspace: {
    rootDir: './workspace',
    repositories: [], // Will be populated
    parallel: 3, // Clone 3 repos at a time
  },
});

// Define repositories
const repos: Repository[] = [
  {
    id: '1',
    name: 'frontend',
    fullName: 'myorg/frontend',
    url: 'https://github.com/myorg/frontend',
    cloneUrl: 'https://github.com/myorg/frontend.git',
    defaultBranch: 'main',
    language: 'TypeScript',
    lastActivity: new Date(),
  },
  // ... more repositories
];

// Clone repositories
await manager.cloner.cloneMany(repos, {
  depth: 1,
  singleBranch: true,
  token: process.env.GITHUB_TOKEN,
}, 3, (progress) => {
  console.log(`${progress.repository.name}: ${progress.status} ${progress.progress}%`);
});

// Get repository path
const repoPath = await manager.cache.get(repos[0]);
console.log('Repository cloned to:', repoPath);
```

## API Reference

### RepositoryManager

Main class that orchestrates caching, cloning, and workspace management.

```typescript
const manager = new RepositoryManager({
  cache: CacheConfig,
  workspace: WorkspaceConfig,
});

// Initialize workspace
await manager.initialize();

// Cleanup
manager.dispose();
```

### RepositoryCache

Manages cached repositories with LRU eviction.

```typescript
// Get cached repository
const path = await cache.get(repository);

// Add to cache
await cache.set(repository, localPath);

// Remove from cache
await cache.remove(repository);

// Get statistics
const stats = cache.getStats();
console.log(`Cache hit rate: ${stats.cacheHitRate * 100}%`);

// Cleanup old entries
const removed = await cache.cleanup();
```

### RepositoryCloner

Handles repository cloning with progress tracking.

```typescript
// Clone single repository
const localPath = await cloner.clone(
  repository,
  {
    depth: 1,
    branch: 'main',
    singleBranch: true,
    token: 'github_token',
  },
  (progress) => {
    console.log(`${progress.status}: ${progress.progress}%`);
  }
);

// Clone multiple repositories
const results = await cloner.cloneMany(
  repositories,
  options,
  3, // concurrency
  onProgress
);

// Update repository
await cloner.update(repository);
```

### WorkspaceManager

Manages multiple repositories in a workspace.

```typescript
// Create branch
await workspace.createBranch(repository, 'feature/refactor', 'main');

// Commit changes
const commitSha = await workspace.commit(
  repository,
  'Apply refactoring',
  ['src/file.ts']
);

// Push changes
await workspace.push(repository, 'feature/refactor');

// Get status
const status = await workspace.getStatus(repository);
console.log('Modified files:', status.modified);

// File operations
const content = await workspace.readFile(repository, 'package.json');
await workspace.writeFile(repository, 'new-file.ts', 'content');
const exists = await workspace.fileExists(repository, 'README.md');
const files = await workspace.listFiles(repository, 'src');

// Reset repository
await workspace.reset(repository, true); // hard reset
```

## Configuration

### CacheConfig

```typescript
interface CacheConfig {
  baseDir: string;        // Cache directory path
  maxSize: number;        // Max cache size in MB
  maxAge: number;         // Max age in days
  cleanupInterval: number; // Cleanup interval in hours
}
```

### WorkspaceConfig

```typescript
interface WorkspaceConfig {
  rootDir: string;        // Workspace root directory
  repositories: Repository[]; // Repositories to manage
  parallel: number;       // Parallel clone operations
}
```

### CloneOptions

```typescript
interface CloneOptions {
  depth?: number;         // Clone depth (shallow clone)
  branch?: string;        // Specific branch to clone
  singleBranch?: boolean; // Clone only one branch
  token?: string;         // Authentication token
}
```

## Examples

### Example 1: Clone with Progress Tracking

```typescript
import { createRepositoryManager } from '@cross-repo-refactor/repository';

const manager = createRepositoryManager();

await manager.cloner.clone(
  repository,
  { depth: 1, token: process.env.GITHUB_TOKEN },
  (progress) => {
    const bar = '█'.repeat(progress.progress / 2);
    const empty = '░'.repeat(50 - progress.progress / 2);
    console.log(`[${bar}${empty}] ${progress.progress}% - ${progress.status}`);
  }
);
```

### Example 2: Batch Operations

```typescript
// Clone all repositories
const results = await manager.cloner.cloneMany(
  repositories,
  { depth: 1 },
  5 // 5 concurrent clones
);

// Create branches in all repositories
for (const repo of repositories) {
  await manager.workspace.createBranch(repo, 'refactor/update-deps', 'main');
}

// Apply changes and commit
for (const repo of repositories) {
  await manager.workspace.writeFile(repo, 'package.json', newContent);
  await manager.workspace.commit(repo, 'Update dependencies');
  await manager.workspace.push(repo, 'refactor/update-deps');
}
```

### Example 3: Cache Management

```typescript
// Get cache statistics
const stats = manager.cache.getStats();
console.log(`
  Total repositories: ${stats.totalRepositories}
  Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB
  Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%
  Oldest entry: ${stats.oldestEntry}
`);

// Manual cleanup
const removed = await manager.cache.cleanup();
console.log(`Removed ${removed} old entries`);

// Clear entire cache
await manager.cache.clear();
```

## Best Practices

1. **Use Shallow Clones**: Set `depth: 1` for faster cloning when full history isn't needed
2. **Limit Concurrency**: Don't clone too many repos at once (3-5 is usually optimal)
3. **Monitor Cache Size**: Regularly check cache statistics and adjust `maxSize` as needed
4. **Use Tokens**: Always provide authentication tokens for private repositories
5. **Cleanup Regularly**: Let the automatic cleanup run or trigger manual cleanup periodically

## Performance Tips

- Use `singleBranch: true` to clone only the needed branch
- Set appropriate `maxSize` to avoid disk space issues
- Adjust `parallel` based on network bandwidth and system resources
- Use cache to avoid re-cloning repositories

## Error Handling

```typescript
try {
  await manager.cloner.clone(repository, options);
} catch (error) {
  if (error.message.includes('Authentication failed')) {
    console.error('Invalid token or insufficient permissions');
  } else if (error.message.includes('Repository not found')) {
    console.error('Repository does not exist or is not accessible');
  } else {
    console.error('Clone failed:', error);
  }
}
```

## License

MIT