# Integration Guide

This guide shows how all components of the Cross-Repo Refactor Coordinator work together to solve the cross-repository refactoring problem.

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Integration](#component-integration)
3. [Data Flow](#data-flow)
4. [Usage Patterns](#usage-patterns)
5. [Examples](#examples)
6. [Troubleshooting](#troubleshooting)

## System Overview

The Cross-Repo Refactor Coordinator is a monorepo containing 7 packages that work together:

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface Layer                     │
├──────────────────────┬────────────────────────────────────────┤
│   CLI Tool           │   VS Code Extension                    │
│   (packages/cli)     │   (packages/vscode-extension)          │
└──────────────────────┴────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Core Business Logic                       │
├──────────────────────┬──────────────────┬───────────────────┤
│  Pattern Detection   │  Refactoring     │  Repository       │
│  (AI-powered)        │  Engine          │  Management       │
└──────────────────────┴──────────────────┴───────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Platform Abstraction                       │
├──────────────────────┬──────────────────┬───────────────────┤
│  GitHub Adapter      │  GitLab Adapter  │  Bitbucket        │
└──────────────────────┴──────────────────┴───────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Core Types                              │
│                   (packages/core)                            │
└─────────────────────────────────────────────────────────────┘
```

## Component Integration

### 1. Platform Layer → Repository Layer

**Purpose**: Discover and clone repositories from different platforms

```typescript
// Platform provides repository metadata
const platform = createPlatformAdapter({ platform: 'github', token });
const repos = await platform.listRepositories('my-org');

// Repository layer clones and manages them
const repoManager = createRepositoryManager({
  workspace: { repositories: repos }
});
await repoManager.cloner.cloneMany(repos);
```

**Key Integration Points**:
- Platform adapter returns `Repository[]` objects
- Repository manager accepts these objects for cloning
- Workspace manager tracks local paths for each repository

### 2. Repository Layer → Pattern Detection

**Purpose**: Analyze code across all cloned repositories

```typescript
// Repository layer provides workspace
const workspace = repoManager.workspace;

// Pattern detector uses workspace to access files
const detector = createPatternDetector(config, workspace);
const result = await detector.detectInRepositories(repos);
```

**Key Integration Points**:
- Workspace manager provides file access methods
- Pattern detector reads files from workspace
- Detection results include repository references

### 3. Pattern Detection → Refactoring Engine

**Purpose**: Apply transformations to detected patterns

```typescript
// Pattern detector finds similar code
const matches = result.matches;

// Refactoring engine transforms the code
const engine = createRefactoringEngine(workspace);
const batchResult = await engine.applyBatchRefactoring(
  matches,
  'function-to-arrow'
);
```

**Key Integration Points**:
- Pattern matches include file paths and line numbers
- Refactoring engine uses workspace to read/write files
- Results map back to original repositories

### 4. Refactoring Engine → Platform Layer

**Purpose**: Create pull requests for changes

```typescript
// After refactoring, commit and push changes
for (const repo of modifiedRepos) {
  await workspace.createBranch(repo, 'refactor/changes');
  await workspace.commit(repo, 'refactor: apply changes');
  await workspace.push(repo, 'refactor/changes');
  
  // Create PR via platform adapter
  await platform.createPR(repo.id, {
    title: 'Automated Refactoring',
    sourceBranch: 'refactor/changes',
    targetBranch: 'main',
  });
}
```

**Key Integration Points**:
- Workspace manager handles git operations
- Platform adapter creates PRs
- PR linking connects related changes

## Data Flow

### Complete Workflow Data Flow

```
1. User Input
   ↓
2. Platform Adapter
   → Credentials
   → Organization/Owner
   ↓
3. Repository Discovery
   → Repository[] metadata
   ↓
4. Repository Cloning
   → Local file paths
   → Git repositories
   ↓
5. Pattern Detection
   → Code patterns
   → Embeddings
   → Similarity scores
   ↓
6. Pattern Matching
   → PatternMatch[] objects
   → Source/target pairs
   ↓
7. Refactoring Preview
   → Diff previews
   → Validation results
   ↓
8. Refactoring Application
   → Modified files
   → Git commits
   ↓
9. PR Creation
   → Pull requests
   → PR links
   ↓
10. User Review
```

### Data Structures

**Repository Object** (flows through all layers):
```typescript
interface Repository {
  id: string;
  name: string;
  owner: string;
  url: string;
  defaultBranch: string;
  language?: string;
  localPath?: string;  // Added by repository layer
}
```

**Pattern Match** (connects detection to refactoring):
```typescript
interface PatternMatch {
  pattern: Pattern;           // Source pattern
  targetRepo: Repository;     // Target repository
  targetFile: string;         // Target file path
  targetLines: [number, number];
  similarity: number;         // Confidence score
}
```

**Refactoring Result** (output of transformation):
```typescript
interface RefactoringResult {
  success: boolean;
  filePath: string;
  changes: number;
  diff?: string;
  error?: string;
}
```

## Usage Patterns

### Pattern 1: Single Repository Refactoring

```typescript
// 1. Setup
const platform = createPlatformAdapter({ /* ... */ });
const repo = await platform.getRepository('owner/repo');

// 2. Clone
const repoManager = createRepositoryManager({ /* ... */ });
await repoManager.cloner.clone(repo);

// 3. Detect patterns
const detector = createPatternDetector(config, repoManager.workspace);
const patterns = await detector.detectInRepository(repo);

// 4. Apply refactoring
const engine = createRefactoringEngine(repoManager.workspace);
for (const pattern of patterns) {
  await engine.applyRefactoring(
    { pattern, targetRepo: repo, /* ... */ },
    'function-to-arrow'
  );
}
```

### Pattern 2: Cross-Repository Refactoring

```typescript
// 1. Discover all repos
const repos = await platform.listRepositories('my-org');

// 2. Clone all repos
await repoManager.cloner.cloneMany(repos, {}, 5); // 5 parallel

// 3. Detect patterns across all repos
const result = await detector.detectInRepositories(repos);

// 4. Apply refactoring to all matches
const batchResult = await engine.applyBatchRefactoring(
  result.matches,
  'function-to-arrow'
);

// 5. Create coordinated PRs
for (const match of result.matches) {
  // Create branch, commit, push, PR
}
```

### Pattern 3: Selective Refactoring

```typescript
// 1. Detect patterns
const result = await detector.detectInRepositories(repos);

// 2. Filter by confidence
const highConfidence = result.matches.filter(m => m.similarity > 0.95);

// 3. Preview changes
for (const match of highConfidence) {
  const preview = await engine.previewRefactoring(match, strategy);
  console.log(preview.diff);
}

// 4. Apply only approved changes
const approved = highConfidence.slice(0, 10); // First 10
await engine.applyBatchRefactoring(approved, strategy);
```

### Pattern 4: Multi-Platform Refactoring

```typescript
// 1. Setup multiple platforms
const github = createPlatformAdapter({ platform: 'github', /* ... */ });
const gitlab = createPlatformAdapter({ platform: 'gitlab', /* ... */ });

// 2. Get repos from both
const githubRepos = await github.listRepositories('org1');
const gitlabRepos = await gitlab.listRepositories('org2');

// 3. Process together
const allRepos = [...githubRepos, ...gitlabRepos];
const result = await detector.detectInRepositories(allRepos);

// 4. Create PRs on respective platforms
for (const match of result.matches) {
  const platform = match.targetRepo.url.includes('github.com') 
    ? github 
    : gitlab;
  await platform.createPR(match.targetRepo.id, { /* ... */ });
}
```

## Examples

### Example 1: Convert Functions to Arrow Functions

See [examples/complete-workflow/](examples/complete-workflow/) for a complete example.

### Example 2: Update API Calls

```typescript
// Detect old API pattern
const detector = createPatternDetector({
  detection: {
    extractTypes: ['function'],
    minPatternSize: 5,
  }
}, workspace);

// Find all instances of old API
const result = await detector.detectInRepositories(repos);

// Apply custom refactoring
const engine = createRefactoringEngine(workspace);
await engine.applyBatchRefactoring(
  result.matches,
  'custom-api-update',
  { validate: true }
);
```

### Example 3: Add Type Annotations

```typescript
// Detect untyped functions
const result = await detector.detectInRepositories(
  repos.filter(r => r.language === 'TypeScript')
);

// Add type annotations
await engine.applyBatchRefactoring(
  result.matches,
  'add-type-annotations'
);
```

## Troubleshooting

### Issue: Pattern Detection Finds No Matches

**Causes**:
- Similarity threshold too high
- Pattern size constraints too restrictive
- Different code styles across repos

**Solutions**:
```typescript
// Lower similarity threshold
detection: {
  similarityThreshold: 0.7,  // Instead of 0.9
}

// Adjust pattern size
detection: {
  minPatternSize: 5,   // Smaller patterns
  maxPatternSize: 100, // Larger patterns
}

// Use AI-powered detection
ai: {
  provider: 'cohere',  // Instead of 'local'
}
```

### Issue: Refactoring Fails Validation

**Causes**:
- Syntax errors in source code
- Incompatible refactoring strategy
- Missing dependencies

**Solutions**:
```typescript
// Preview before applying
const preview = await engine.previewRefactoring(match, strategy);
console.log(preview.diff);

// Use validation
await engine.applyRefactoring(match, strategy, {
  validate: true,
  createBackup: true,
});

// Check individual results
for (const [id, result] of batchResult.entries()) {
  if (!result.success) {
    console.error(`Failed: ${result.error}`);
  }
}
```

### Issue: PR Creation Fails

**Causes**:
- Insufficient permissions
- Branch already exists
- No changes to commit

**Solutions**:
```typescript
// Check authentication
await platform.authenticate();

// Use unique branch names
const branchName = `refactor/${Date.now()}`;

// Check for changes before creating PR
const hasChanges = await workspace.hasUncommittedChanges(repo);
if (hasChanges) {
  await platform.createPR(repo.id, { /* ... */ });
}
```

### Issue: Memory Issues with Large Repos

**Causes**:
- Too many repos cloned at once
- Large repository sizes
- Insufficient cache cleanup

**Solutions**:
```typescript
// Limit parallel operations
workspace: {
  parallel: 2,  // Instead of 5
}

// Use shallow clones
await repoManager.cloner.clone(repo, {
  depth: 1,
  singleBranch: true,
});

// Configure cache limits
cache: {
  maxSize: 1024,  // 1GB instead of 2GB
  maxAge: 7,      // 7 days instead of 14
}
```

## Next Steps

1. **Try the Examples**: Start with [examples/programmatic-api/](examples/programmatic-api/)
2. **Read the API Docs**: See detailed API documentation
3. **Use the CLI**: Try the command-line interface
4. **Extend the System**: Add custom refactoring strategies
5. **Contribute**: Submit PRs for improvements

## Learn More

- [Architecture Documentation](ARCHITECTURE.md)
- [Getting Started Guide](GETTING_STARTED.md)
- [API Reference](docs/API.md)
- [Contributing Guide](CONTRIBUTING.md)