# Cross-Repo Refactor Coordinator - Project Structure

## Directory Structure

```
cross-repo-refactor/
├── packages/
│   ├── core/                      # Core refactoring engine
│   │   ├── src/
│   │   │   ├── orchestrator/      # Main orchestration logic
│   │   │   ├── pattern-detector/  # Pattern detection engine
│   │   │   ├── refactor-engine/   # Refactoring application
│   │   │   ├── coordinator/       # PR/MR coordination
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── platform/                  # Git platform abstraction
│   │   ├── src/
│   │   │   ├── adapter/           # Platform adapter interface
│   │   │   ├── providers/
│   │   │   │   ├── github.ts
│   │   │   │   ├── gitlab.ts
│   │   │   │   └── bitbucket.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── repository/                # Repository management
│   │   ├── src/
│   │   │   ├── discovery/         # Repository discovery
│   │   │   ├── cloner/            # Repository cloning
│   │   │   ├── cache/             # Local cache management
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── ai/                        # AI/ML services
│   │   ├── src/
│   │   │   ├── embeddings/        # Code embedding generation
│   │   │   ├── matcher/           # Semantic pattern matching
│   │   │   ├── generator/         # AI refactor generation
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── storage/                   # Storage and configuration
│   │   ├── src/
│   │   │   ├── config/            # Configuration management
│   │   │   ├── state/             # State store
│   │   │   ├── cache-db/          # Cache database
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── cli/                       # CLI tool
│   │   ├── src/
│   │   │   ├── commands/          # CLI commands
│   │   │   ├── ui/                # Interactive UI components
│   │   │   ├── utils/             # CLI utilities
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   └── vscode-extension/          # VS Code extension
│       ├── src/
│       │   ├── extension.ts       # Extension entry point
│       │   ├── commands/          # Extension commands
│       │   ├── views/             # Tree views and webviews
│       │   ├── providers/         # Code lens, hover providers
│       │   └── ui/                # UI components
│       ├── media/                 # Icons and assets
│       ├── tests/
│       └── package.json
│
├── docs/                          # Documentation
│   ├── getting-started.md
│   ├── cli-reference.md
│   ├── vscode-extension.md
│   ├── api-reference.md
│   └── examples/
│
├── examples/                      # Example configurations
│   ├── basic-refactor/
│   ├── multi-language/
│   └── ci-cd-integration/
│
├── scripts/                       # Build and utility scripts
│   ├── build.sh
│   ├── test.sh
│   └── release.sh
│
├── .github/                       # GitHub workflows
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
│
├── package.json                   # Root package.json (monorepo)
├── tsconfig.json                  # Root TypeScript config
├── lerna.json                     # Lerna configuration
├── .gitignore
├── README.md
├── LICENSE
├── ARCHITECTURE.md
└── CONTRIBUTING.md
```

## Package Dependencies

### Core Package Dependencies
```json
{
  "@cross-repo-refactor/platform": "workspace:*",
  "@cross-repo-refactor/repository": "workspace:*",
  "@cross-repo-refactor/ai": "workspace:*",
  "@cross-repo-refactor/storage": "workspace:*"
}
```

### Platform Package Dependencies
```json
{
  "@octokit/rest": "^20.0.0",
  "@gitbeaker/node": "^39.0.0",
  "axios": "^1.6.0"
}
```

### Repository Package Dependencies
```json
{
  "simple-git": "^3.22.0",
  "fs-extra": "^11.2.0",
  "glob": "^10.3.0"
}
```

### AI Package Dependencies
```json
{
  "@xenova/transformers": "^2.10.0",
  "hnswlib-node": "^3.0.0",
  "tree-sitter": "^0.20.0",
  "tree-sitter-javascript": "^0.20.0",
  "tree-sitter-python": "^0.20.0",
  "tree-sitter-typescript": "^0.20.0"
}
```

### Storage Package Dependencies
```json
{
  "better-sqlite3": "^9.3.0",
  "cosmiconfig": "^9.0.0",
  "node-cache": "^5.1.2"
}
```

### CLI Package Dependencies
```json
{
  "commander": "^11.1.0",
  "inquirer": "^9.2.0",
  "chalk": "^5.3.0",
  "ora": "^7.0.0",
  "cli-table3": "^0.6.3"
}
```

### VS Code Extension Dependencies
```json
{
  "@vscode/extension-api": "^1.85.0",
  "@cross-repo-refactor/core": "workspace:*"
}
```

## Module Interfaces

### Core Orchestrator Interface
```typescript
interface RefactorOrchestrator {
  scanRepository(repoPath: string): Promise<Pattern[]>;
  detectPatterns(pattern: Pattern, targetRepos: string[]): Promise<Match[]>;
  generateRefactoring(match: Match, strategy: RefactorStrategy): Promise<Refactoring>;
  applyRefactoring(refactoring: Refactoring): Promise<Result>;
  coordinatePRs(results: Result[]): Promise<PR[]>;
}
```

### Platform Adapter Interface
```typescript
interface GitPlatformAdapter {
  authenticate(credentials: Credentials): Promise<void>;
  listRepositories(org: string): Promise<Repository[]>;
  createBranch(repo: string, branch: string): Promise<void>;
  createPR(repo: string, pr: PRConfig): Promise<PR>;
  linkPRs(prs: PR[]): Promise<void>;
}
```

### Pattern Detector Interface
```typescript
interface PatternDetector {
  extractPatterns(code: string, language: string): Promise<Pattern[]>;
  generateEmbedding(pattern: Pattern): Promise<Embedding>;
  findSimilarPatterns(embedding: Embedding, threshold: number): Promise<Match[]>;
}
```

### Repository Manager Interface
```typescript
interface RepositoryManager {
  discover(org: string, filters: Filter[]): Promise<Repository[]>;
  clone(repo: Repository): Promise<string>;
  update(repoPath: string): Promise<void>;
  cleanup(maxAge: number): Promise<void>;
}
```

## Configuration Schema

### Main Configuration File (.refactorrc.json)
```json
{
  "platform": {
    "type": "github|gitlab|bitbucket",
    "url": "https://api.github.com",
    "token": "${GITHUB_TOKEN}"
  },
  "organization": "my-org",
  "repositories": {
    "include": ["repo1", "repo2"],
    "exclude": ["archived-*"],
    "filters": {
      "languages": ["typescript", "python", "go"],
      "minActivity": "2024-01-01"
    }
  },
  "ai": {
    "embeddingModel": "codebert-base",
    "similarityThreshold": 0.85,
    "provider": "local|openai|anthropic"
  },
  "refactoring": {
    "dryRun": true,
    "autoApply": false,
    "branchPrefix": "refactor/",
    "prTemplate": "templates/pr-template.md"
  },
  "cache": {
    "directory": ".refactor-cache",
    "maxSize": "10GB",
    "ttl": 86400
  }
}
```

## Build Configuration

### Root package.json
```json
{
  "name": "cross-repo-refactor",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "lerna run build",
    "test": "lerna run test",
    "lint": "eslint packages/*/src/**/*.ts",
    "clean": "lerna run clean",
    "publish": "lerna publish"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "eslint": "^8.55.0",
    "jest": "^29.7.0",
    "lerna": "^8.0.0"
  }
}
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}