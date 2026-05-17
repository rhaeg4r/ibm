# Quick Start - Running Locally

Follow these steps to get the Cross-Repo Refactor Coordinator running on your local machine.

## Step 1: Prerequisites

Ensure you have the following installed:

```bash
# Check Node.js version (must be >= 18.0.0)
node --version

# Check npm version (must be >= 9.0.0)
npm --version

# Check Git
git --version
```

If you need to install or update:
- **Node.js**: Download from [nodejs.org](https://nodejs.org/) (LTS version recommended)
- **npm**: Comes with Node.js, or update with `npm install -g npm@latest`
- **Git**: Download from [git-scm.com](https://git-scm.com/)

## Step 2: Navigate to Project Directory

```bash
cd c:/Users/diara/Desktop/ibm
```

## Step 3: One-Command Setup (Recommended)

```bash
# This single command does everything:
# 1. Installs all dependencies (including for all packages)
# 2. Links packages together automatically (npm workspaces)
# 3. Builds all TypeScript code
npm run setup
```

**Expected output:**
```
> cross-repo-refactor@0.1.0 setup
> npm install && npm run build

added 500+ packages in 30s

> cross-repo-refactor@0.1.0 build
> npm run build --workspaces --if-present

> @cross-repo-refactor/core@0.1.0 build
> tsc

> @cross-repo-refactor/platform@0.1.0 build
> tsc

✓ Setup complete!
```

## Alternative: Step-by-Step Setup

If you prefer to run commands individually:

### Step 3a: Install Dependencies

```bash
npm install
```

This installs:
- All root dependencies (TypeScript, ESLint, Prettier, Lerna)
- All package dependencies (automatically via npm workspaces)
- Links packages together (core → platform)

**Note**: npm workspaces (configured in package.json) automatically handles package linking. No separate bootstrap command needed!

### Step 3b: Build All Packages

```bash
npm run build
```

This compiles TypeScript to JavaScript for:
1. `packages/core` - Type definitions
2. `packages/platform` - Git platform adapters

You can also build packages individually:
```bash
npm run build:core      # Build only core package
npm run build:platform  # Build only platform package
```

## Step 4: Verify Installation

```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint
```

**Expected output:**
```
✓ Type checking passed
✓ Linting passed
```

## Step 5: Test the Platform Adapters

Create a test file to verify the setup:

```bash
# Create a test directory
mkdir -p test

# Create test file
cat > test/test-platform.js << 'EOF'
const { createPlatformAdapter } = require('../packages/platform/dist/index.js');

async function test() {
  console.log('Testing platform adapter creation...');
  
  try {
    // Test GitLab adapter creation
    const gitlab = createPlatformAdapter({
      platform: 'gitlab',
      token: 'test-token',
      tokenType: 'personal',
      url: 'https://gitlab.com'
    });
    console.log('✓ GitLab adapter created successfully');
    
    // Test GitHub adapter creation
    const github = createPlatformAdapter({
      platform: 'github',
      token: 'test-token',
      tokenType: 'personal'
    });
    console.log('✓ GitHub adapter created successfully');
    
    console.log('\n✓ All tests passed!');
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    process.exit(1);
  }
}

test();
EOF

# Run the test
node test/test-platform.js
```

## Step 6: Set Up Configuration

```bash
# Copy example configuration
cp .refactorrc.example.json .refactorrc.json

# Edit with your settings
code .refactorrc.json  # or use your preferred editor
```

Update the configuration with your credentials:

```json
{
  "platform": {
    "type": "gitlab",
    "url": "https://gitlab.com",
    "token": "YOUR_GITLAB_TOKEN_HERE",
    "tokenType": "personal"
  },
  "organization": "your-organization-name",
  "repositories": {
    "include": ["*"],
    "exclude": ["archived-*"],
    "filters": {
      "languages": ["typescript", "javascript", "python"]
    }
  }
}
```

## Step 7: Get API Tokens

### For GitLab:

1. Go to GitLab → Settings → Access Tokens
2. Create a new token with scopes:
   - `api` (full API access)
   - `read_repository`
   - `write_repository`
3. Copy the token and add to `.refactorrc.json`

### For GitHub:

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic) with scopes:
   - `repo` (full repository access)
   - `workflow` (if using GitHub Actions)
3. Copy the token and add to `.refactorrc.json`

## Step 8: Development Workflow

### Watch Mode (Recommended for Development)

```bash
# Start watch mode for all packages
npm run dev
```

This will:
- Watch for file changes
- Automatically rebuild on save
- Show compilation errors in real-time

### Manual Build

```bash
# Build all packages
npm run build

# Build specific package
npm run build:core
npm run build:platform

# Or navigate to package directory
cd packages/platform
npm run build
```

### Run Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests for specific package
cd packages/platform
npm run test
```

## Common Commands Reference

```bash
# Installation & Setup
npm install              # Install all dependencies (root + packages)
npm run setup           # Install + build everything
npm run build           # Build all packages

# Build Individual Packages
npm run build:core      # Build core package only
npm run build:platform  # Build platform package only

# Development
npm run dev             # Watch mode for development
npm run typecheck       # Type check without building
npm run lint            # Lint all code
npm run format          # Format all code with Prettier

# Testing
npm run test            # Run all tests

# Cleanup
npm run clean           # Remove all build artifacts
rm -rf node_modules     # Remove all dependencies
```

## Troubleshooting

### Issue: "bootstrap command was removed in Lerna v7"

**Cause**: Lerna v7+ removed the bootstrap command

**Solution**: This has been fixed! The project now uses npm workspaces instead of Lerna bootstrap.

```bash
# Just run setup - it uses npm workspaces now
npm run setup
```

**What changed**:
- ❌ Old: Used `lerna bootstrap` to link packages
- ✅ New: Uses npm workspaces (automatic linking)
- No separate bootstrap step needed!

### Issue: "404 Not Found - @cross-repo-refactor/ai" (or similar package)

**Cause**: Package.json files referenced packages that don't exist yet

**Solution**: This has been fixed! The package.json files have been updated to only include packages that exist (core and platform).

```bash
# Clean any previous failed installs
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json

# Run setup again
npm run setup
```

### Issue: "'lerna' is not recognized as an internal or external command"

**Cause**: Old scripts tried to use Lerna commands

**Solution**: This has been fixed! Scripts now use npm workspaces instead of Lerna.

```bash
# Just run the setup
npm run setup
```

### Issue: "Cannot find module '@cross-repo-refactor/core'"

**Solution:**
```bash
# Run the full setup again
npm run setup

# Or manually:
cd packages/core
npm run build
cd ../..
npm run bootstrap
```

### Issue: "npm ERR! code ENOENT"

**Solution:**
```bash
# Clean everything and reinstall
npm run clean
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json
npm run setup
```

### Issue: TypeScript errors after changes

**Solution:**
```bash
# Rebuild the affected package
cd packages/platform
npm run build

# Or rebuild everything
npm run build
```

### Issue: Lerna bootstrap fails

**Solution:**
```bash
# Update Lerna
npm install -g lerna@latest

# Try again
npm run bootstrap
```

## Next Steps

Now that you have the project running locally:

1. **Explore the Code**
   - Check `packages/core/src/types/index.ts` for type definitions
   - Review `packages/platform/src/providers/` for platform implementations

2. **Read Documentation**
   - [Architecture](ARCHITECTURE.md) - System design
   - [Implementation Plan](IMPLEMENTATION_PLAN.md) - Development roadmap
   - [Getting Started](GETTING_STARTED.md) - User guide

3. **Try Examples**
   - Review GitLab CI/CD integration: `examples/gitlab-ci-integration/`
   - Test with your own repositories

4. **Start Development**
   - Pick a task from the implementation plan
   - Create a new branch
   - Make changes in watch mode
   - Run tests and linting

## Development Tips

### VS Code Setup

Install recommended extensions:
```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test
npm run dev  # in one terminal
# Edit files in another terminal

# Before committing
npm run lint
npm run test
npm run build

# Commit
git add .
git commit -m "feat: your feature description"
```

### Debugging

Add this to your test files:
```javascript
// Enable debug logging
process.env.DEBUG = '*';

// Or use Node.js debugger
node --inspect-brk test/your-test.js
```

## Getting Help

- **Documentation**: Check the docs in the root directory
- **Examples**: Look at `examples/` directory
- **Issues**: Review `BUGFIXES.md` for known issues
- **Setup Problems**: See `SETUP.md` for detailed troubleshooting

## Summary

You should now have:
- ✅ All dependencies installed
- ✅ Packages built and linked
- ✅ Configuration file ready
- ✅ Development environment set up

You're ready to start developing! 🚀