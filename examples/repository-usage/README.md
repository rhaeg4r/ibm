# Repository Management Examples

This directory contains examples demonstrating the repository management capabilities of the Cross-Repo Refactor Coordinator.

## Examples

### basic-usage.ts

Demonstrates the core functionality of the repository management package:

- Creating a repository manager with custom configuration
- Cloning multiple repositories in parallel with progress tracking
- Viewing cache statistics
- Creating branches across all repositories
- Reading and modifying files
- Committing and pushing changes

**Run the example:**

```bash
# Set your GitHub token
export GITHUB_TOKEN=your_token_here

# Run the example
npx ts-node examples/repository-usage/basic-usage.ts
```

## Key Concepts

### 1. Repository Manager

The `RepositoryManager` is the main entry point that coordinates caching, cloning, and workspace operations:

```typescript
const manager = createRepositoryManager({
  cache: { /* cache config */ },
  workspace: { /* workspace config */ }
});
```

### 2. Smart Caching

The cache automatically manages cloned repositories with LRU eviction:

- Stores repositories locally to avoid re-cloning
- Automatically removes old entries based on age
- Evicts least recently used entries when size limit is reached
- Provides statistics on cache usage

### 3. Parallel Cloning

Clone multiple repositories concurrently for better performance:

```typescript
await manager.cloner.cloneMany(
  repositories,
  options,
  3 // concurrency level
);
```

### 4. Workspace Operations

Perform Git operations across multiple repositories:

- Create branches
- Commit changes
- Push to remote
- Read/write files
- Check status

## Configuration

### Cache Configuration

```typescript
{
  baseDir: './.cache/repos',  // Where to store cloned repos
  maxSize: 2048,              // Max cache size in MB
  maxAge: 14,                 // Max age in days
  cleanupInterval: 12         // Cleanup interval in hours
}
```

### Workspace Configuration

```typescript
{
  rootDir: './workspace',     // Workspace root directory
  repositories: [],           // Repositories to manage
  parallel: 5                 // Parallel operations
}
```

### Clone Options

```typescript
{
  depth: 1,                   // Shallow clone
  branch: 'main',             // Specific branch
  singleBranch: true,         // Clone only one branch
  token: 'github_token'       // Authentication token
}
```

## Best Practices

1. **Use Environment Variables**: Store tokens in environment variables, never in code
2. **Shallow Clones**: Use `depth: 1` for faster cloning when full history isn't needed
3. **Limit Concurrency**: Don't clone too many repos at once (3-5 is optimal)
4. **Monitor Cache**: Regularly check cache statistics and adjust limits
5. **Error Handling**: Always wrap operations in try-catch blocks

## Common Patterns

### Pattern 1: Batch File Updates

```typescript
for (const repo of repositories) {
  const content = await manager.workspace.readFile(repo, 'package.json');
  const pkg = JSON.parse(content);
  
  // Update package.json
  pkg.version = '2.0.0';
  
  await manager.workspace.writeFile(
    repo,
    'package.json',
    JSON.stringify(pkg, null, 2)
  );
}
```

### Pattern 2: Conditional Operations

```typescript
for (const repo of repositories) {
  const hasConfig = await manager.workspace.fileExists(repo, 'config.json');
  
  if (hasConfig) {
    // Perform operation only if file exists
  }
}
```

### Pattern 3: Status Checking

```typescript
for (const repo of repositories) {
  const status = await manager.workspace.getStatus(repo);
  
  if (status.modified.length > 0) {
    await manager.workspace.commit(repo, 'Update files');
  }
}
```

## Troubleshooting

### Issue: Clone fails with authentication error

**Solution**: Ensure your token has the correct permissions and is properly set:

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

### Issue: Cache fills up quickly

**Solution**: Adjust cache configuration:

```typescript
{
  maxSize: 4096,  // Increase size limit
  maxAge: 7,      // Reduce max age
}
```

### Issue: Slow cloning

**Solution**: Use shallow clones and increase concurrency:

```typescript
{
  depth: 1,
  singleBranch: true
}
// And increase parallel parameter
```

## Next Steps

After mastering repository management, explore:

1. **Pattern Detection**: Detect code patterns across repositories
2. **Refactoring Engine**: Apply transformations automatically
3. **PR Coordination**: Create coordinated pull requests
4. **CLI Tool**: Automate workflows from command line

## Resources

- [Repository Package README](../../packages/repository/README.md)
- [Core Types Documentation](../../packages/core/src/types/index.ts)
- [Architecture Overview](../../ARCHITECTURE.md)