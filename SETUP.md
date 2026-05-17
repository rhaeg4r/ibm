# Setup Instructions

This document provides instructions for setting up the Cross-Repo Refactor Coordinator development environment.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

## Installation

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Bootstrap all packages (installs dependencies for all packages)
npm run bootstrap
```

### 2. Build All Packages

```bash
# Build all packages in the correct order
npm run build
```

This will:
1. Build the `core` package (type definitions)
2. Build the `platform` package (Git platform adapters)
3. Build other packages that depend on these

### 3. Verify Installation

```bash
# Run type checking
npm run typecheck

# Run linting
npm run lint
```

## Current TypeScript Errors

The following TypeScript errors are **expected** until dependencies are installed:

### Missing Module Errors

These will be resolved after running `npm install`:

```
Cannot find module '@cross-repo-refactor/core'
Cannot find module '@octokit/rest'
Cannot find module '@gitbeaker/rest'
Cannot find module 'axios'
```

### Resolution Steps

1. **Install root dependencies**:
   ```bash
   npm install
   ```

2. **Install package-specific dependencies**:
   ```bash
   cd packages/core && npm install
   cd ../platform && npm install
   ```

3. **Build packages in order**:
   ```bash
   # Build core first (no dependencies)
   cd packages/core && npm run build
   
   # Build platform (depends on core)
   cd ../platform && npm run build
   ```

## Package Dependencies

### Core Package
- No external dependencies
- Provides type definitions for all other packages

### Platform Package
Depends on:
- `@cross-repo-refactor/core` (workspace)
- `@octokit/rest` (GitHub API)
- `@gitbeaker/rest` (GitLab API)
- `axios` (HTTP client)

## Development Workflow

### 1. Make Changes

Edit files in any package:
```bash
# Example: Edit GitLab provider
code packages/platform/src/providers/gitlab.ts
```

### 2. Build Changed Package

```bash
cd packages/platform
npm run build
```

### 3. Run Tests

```bash
npm run test
```

### 4. Lint and Format

```bash
npm run lint
npm run format
```

## Troubleshooting

### Error: Cannot find module '@cross-repo-refactor/core'

**Cause**: Core package not built or not linked

**Solution**:
```bash
cd packages/core
npm run build
cd ../..
npm run bootstrap
```

### Error: Cannot find module '@octokit/rest'

**Cause**: Dependencies not installed

**Solution**:
```bash
cd packages/platform
npm install
```

### Error: Type definition file for 'node' not found

**Cause**: @types/node not installed

**Solution**:
```bash
npm install --save-dev @types/node
```

### Lerna Bootstrap Fails

**Cause**: Circular dependencies or missing packages

**Solution**:
```bash
# Clean everything
npm run clean
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json

# Reinstall
npm install
npm run bootstrap
```

## IDE Setup

### VS Code

Recommended extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### TypeScript Language Server

The project uses TypeScript project references for better performance:
```bash
# Build all projects
npm run build

# Watch mode for development
npm run dev
```

## Next Steps

After setup is complete:

1. Review the [Architecture Documentation](ARCHITECTURE.md)
2. Check the [Implementation Plan](IMPLEMENTATION_PLAN.md)
3. Read the [Getting Started Guide](GETTING_STARTED.md)
4. Explore the [GitLab CI/CD Integration Example](examples/gitlab-ci-integration/)

## Common Commands

```bash
# Install and setup
npm install                 # Install root dependencies
npm run bootstrap          # Install all package dependencies
npm run build              # Build all packages

# Development
npm run dev                # Watch mode for all packages
npm run typecheck          # Type check without building
npm run lint               # Lint all packages
npm run format             # Format all files

# Testing
npm run test               # Run all tests
npm run test:watch         # Run tests in watch mode

# Cleanup
npm run clean              # Remove all build artifacts
```

## Support

If you encounter issues not covered here:
1. Check the [main README](README.md)
2. Review package-specific README files
3. Open an issue on GitHub