# Complete Workflow Example

This example demonstrates the complete end-to-end workflow of the Cross-Repo Refactor Coordinator, showing how all components work together.

## Prerequisites

1. **Environment Variables**: Create a `.env` file:
   ```bash
   GITHUB_TOKEN=your_github_token_here
   COHERE_API_KEY=your_cohere_key_here  # Optional, for AI features
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

## What This Example Does

The workflow demonstrates:

1. **Platform Connection** - Connects to GitHub using the platform adapter
2. **Repository Discovery** - Lists all repositories in an organization
3. **Repository Management** - Clones repositories with caching
4. **Pattern Detection** - Uses AI to detect similar code patterns
5. **Refactoring Preview** - Shows what changes would be made
6. **Batch Refactoring** - Applies refactorings across multiple repos
7. **PR Creation** - Creates coordinated pull requests
8. **PR Linking** - Links related PRs together

## Running the Example

```bash
npm start
```

Or with ts-node directly:

```bash
npx ts-node end-to-end.ts
```

## Expected Output

```
🚀 Cross-Repo Refactor Coordinator - Complete Workflow

📡 Step 1: Connecting to GitHub...
✓ Connected to GitHub

🔍 Step 2: Discovering repositories...
✓ Found 15 repositories
  - frontend-app (TypeScript)
  - backend-api (JavaScript)
  - mobile-app (TypeScript)
  - shared-utils (JavaScript)
  - docs-site (Markdown)

📦 Step 3: Setting up repository manager...
✓ Repository manager configured

📥 Step 4: Cloning repositories...
  ✓ frontend-app
  ✓ backend-api
  ✓ mobile-app
✓ Cloned 3 repositories

🔬 Step 5: Setting up pattern detector...
✓ Pattern detector configured

🎯 Step 6: Detecting code patterns...
✓ Found 42 patterns
✓ Found 18 similar patterns
  Processing time: 3421ms

Top 5 matches:
  1. 94.2% similar
     frontend-app → backend-api
     function: handleUserAuth
  2. 91.8% similar
     frontend-app → mobile-app
     function: validateInput
  ...

👀 Step 8: Previewing refactoring (dry-run)...
✓ Preview generated
Diff preview:
-function handleUserAuth(user) {
-  return user.isAuthenticated;
-}
+const handleUserAuth = (user) => user.isAuthenticated;
  ...

🔧 Step 9: Applying refactorings...
✓ Refactoring complete
Statistics:
  Total: 3
  Successful: 3
  Failed: 0
  Skipped: 0

📝 Step 10: Creating pull requests...
  ✓ Created branch: refactor/arrow-functions
  ✓ Committed changes: a1b2c3d
  ✓ Pushed to remote
  ✓ Created PR: https://github.com/my-org/frontend-app/pull/123

🔗 Step 11: Linking related PRs...
  (This would link all PRs created in the batch)

📊 Workflow Summary:
==================================================
Repositories scanned: 15
Repositories cloned: 3
Patterns detected: 42
Matches found: 18
Refactorings applied: 0 (dry-run mode)
PRs created: 1 (demo)
==================================================

✨ Workflow complete!
```

## Customization

### Change Organization

Edit line 33 in `end-to-end.ts`:

```typescript
const organization = 'your-org-name';
```

### Change Refactoring Strategy

Edit line 157 in `end-to-end.ts`:

```typescript
const preview = await engine.previewRefactoring(match, 'your-strategy');
```

Available strategies:
- `function-to-arrow`
- `var-to-const`
- `promise-to-async`
- `class-to-function`
- `remove-unused-imports`
- `add-type-annotations`
- `extract-function`
- `inline-variable`
- `rename-symbol`
- `modernize-syntax`

### Adjust Pattern Detection

Edit lines 107-113 in `end-to-end.ts`:

```typescript
detection: {
  minPatternSize: 10,        // Minimum lines of code
  maxPatternSize: 50,        // Maximum lines of code
  similarityThreshold: 0.8,  // 80% similarity required
  extractTypes: ['function', 'class', 'method'],
}
```

### Enable Actual Refactoring

Change `dryRun` to `false` on line 171:

```typescript
{
  dryRun: false,  // Actually apply changes
  validate: true,
  createBackup: true,
}
```

## Architecture

This example integrates:

- **@cross-repo-refactor/platform** - GitHub/GitLab/Bitbucket adapters
- **@cross-repo-refactor/repository** - Repository cloning and management
- **@cross-repo-refactor/pattern-detection** - AI-powered pattern matching
- **@cross-repo-refactor/refactoring** - Code transformation engine

## Next Steps

1. Review the generated PRs
2. Run tests on the refactored code
3. Merge the PRs once validated
4. Monitor for any issues

## Troubleshooting

### Authentication Errors

Ensure your GitHub token has the required scopes:
- `repo` - Full control of private repositories
- `read:org` - Read org and team membership

### Pattern Detection Issues

If no patterns are detected:
1. Check that repositories contain code files
2. Adjust `minPatternSize` and `maxPatternSize`
3. Lower `similarityThreshold`

### Refactoring Failures

If refactorings fail:
1. Check syntax errors in source code
2. Enable `validate: true` to catch issues early
3. Review the error logs in `.cache/logs/`

## Learn More

- [Architecture Documentation](../../ARCHITECTURE.md)
- [API Reference](../../docs/API.md)
- [Contributing Guide](../../CONTRIBUTING.md)