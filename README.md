# Cross-Repo Refactor Coordinator

> AI-powered tool for coordinating refactoring patterns across multiple repositories in an organization

## Overview

The Cross-Repo Refactor Coordinator solves a critical problem that traditional AI assistants cannot: **coordinating code refactoring across multiple repositories with full context awareness**. When you refactor a pattern in one repository, this tool automatically detects similar patterns across all your organization's repositories and proposes coordinated pull requests.

## Key Features

- 🔍 **AI-Powered Pattern Detection**: Uses semantic code embeddings to find similar patterns across different languages and codebases
- 🌐 **Multi-Platform Support**: Works with GitHub, GitLab, and Bitbucket
- 🔄 **Coordinated PRs**: Creates linked pull requests across all affected repositories
- 💻 **Dual Interface**: Available as both CLI tool and VS Code extension
- 🎯 **Language Agnostic**: Supports polyglot repositories with multiple programming languages
- 🛡️ **Safe by Default**: Dry-run mode, automatic backups, and rollback capabilities
- ⚡ **Efficient**: Parallel processing, intelligent caching, and incremental updates

## Use Cases

### 1. API Migration
Refactor an API endpoint in one service, and automatically update all microservices that consume it.

### 2. Security Patches
Apply a security fix pattern in one repository and propagate it across all repositories with similar vulnerable code.

### 3. Dependency Updates
Update a deprecated library usage pattern and coordinate the change across your entire organization.

### 4. Code Standardization
Enforce coding standards by refactoring patterns in one repository and applying them organization-wide.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   CLI Tool       │         │  VS Code Ext     │         │
│  └──────────────────┘         └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Core Engine                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Orchestrator │  │   Pattern    │  │   Refactor   │     │
│  │              │──│   Detector   │──│    Engine    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Platform Abstraction                       │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │  GitHub  │    │  GitLab  │    │ Bitbucket│             │
│  └──────────┘    └──────────┘    └──────────┘             │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Installation

```bash
# Install CLI globally
npm install -g @cross-repo-refactor/cli

# Or install VS Code extension
code --install-extension cross-repo-refactor
```

### Configuration

Create a `.refactorrc.json` file in your project root:

```json
{
  "platform": {
    "type": "github",
    "url": "https://api.github.com",
    "token": "${GITHUB_TOKEN}"
  },
  "organization": "my-org",
  "repositories": {
    "include": ["*"],
    "exclude": ["archived-*"],
    "filters": {
      "languages": ["typescript", "python", "go"],
      "minActivity": "2024-01-01"
    }
  },
  "ai": {
    "embeddingModel": "codebert-base",
    "similarityThreshold": 0.85,
    "provider": "local"
  },
  "refactoring": {
    "dryRun": true,
    "autoApply": false,
    "branchPrefix": "refactor/",
    "prTemplate": "templates/pr-template.md"
  }
}
```

### Basic Usage

#### CLI

```bash
# Scan a repository for patterns
refactor scan ./my-repo

# Detect similar patterns across organization
refactor detect --pattern-id abc123

# Apply refactoring (dry-run by default)
refactor apply --pattern-id abc123

# Create coordinated PRs
refactor propose --pattern-id abc123

# Full workflow
refactor workflow ./my-repo --pattern "function oldApi()"
```

#### VS Code Extension

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `Cross-Repo Refactor: Scan Repository`
3. Select detected pattern
4. Review matches across repositories
5. Click "Create Coordinated PRs"

## How It Works

### 1. Pattern Detection

The system analyzes your source code and extracts meaningful patterns:

```typescript
// Source pattern detected
function fetchUserData(userId: string) {
  return axios.get(`/api/users/${userId}`);
}
```

### 2. Semantic Matching

Using AI embeddings, it finds similar patterns across repositories, even if they're written differently:

```python
# Similar pattern in Python repository
def get_user_data(user_id: str):
    return requests.get(f"/api/users/{user_id}")
```

```go
// Similar pattern in Go repository
func FetchUserData(userId string) (*User, error) {
    return http.Get("/api/users/" + userId)
}
```

### 3. Coordinated Refactoring

Applies the refactoring strategy to all matched patterns:

```typescript
// Refactored TypeScript
function fetchUserData(userId: string) {
  return axios.get(`/api/v2/users/${userId}`);
}
```

```python
# Refactored Python
def get_user_data(user_id: str):
    return requests.get(f"/api/v2/users/{user_id}")
```

```go
// Refactored Go
func FetchUserData(userId string) (*User, error) {
    return http.Get("/api/v2/users/" + userId)
}
```

### 4. PR Coordination

Creates linked pull requests across all repositories with:
- Consistent titles and descriptions
- Cross-references to related PRs
- Appropriate labels and reviewers
- Coordinated merge strategy

## Project Structure

```
cross-repo-refactor/
├── packages/
│   ├── core/              # Core refactoring engine
│   ├── platform/          # Git platform abstraction
│   ├── repository/        # Repository management
│   ├── ai/                # AI/ML services
│   ├── storage/           # Storage and configuration
│   ├── cli/               # CLI tool
│   └── vscode-extension/  # VS Code extension
├── docs/                  # Documentation
├── examples/              # Example configurations
└── scripts/               # Build and utility scripts
```

## Technology Stack

- **Language**: TypeScript/Node.js
- **AI/ML**: Transformers.js, CodeBERT embeddings
- **Git Operations**: simple-git
- **Platform APIs**: Octokit (GitHub), GitBeaker (GitLab)
- **Storage**: SQLite
- **CLI**: Commander.js
- **VS Code**: Extension API

## Configuration Options

### Platform Configuration

```json
{
  "platform": {
    "type": "github|gitlab|bitbucket",
    "url": "API endpoint URL",
    "token": "Access token"
  }
}
```

### Repository Filters

```json
{
  "repositories": {
    "include": ["repo1", "repo2", "prefix-*"],
    "exclude": ["archived-*", "deprecated-*"],
    "filters": {
      "languages": ["typescript", "python"],
      "minActivity": "2024-01-01"
    }
  }
}
```

### AI Configuration

```json
{
  "ai": {
    "embeddingModel": "codebert-base",
    "similarityThreshold": 0.85,
    "provider": "local|openai|anthropic",
    "apiKey": "Optional API key for cloud providers"
  }
}
```

### Refactoring Options

```json
{
  "refactoring": {
    "dryRun": true,
    "autoApply": false,
    "branchPrefix": "refactor/",
    "prTemplate": "templates/pr-template.md",
    "reviewers": ["@team/reviewers"],
    "labels": ["refactoring", "automated"]
  }
}
```

## Safety Features

### Dry-Run Mode
Test refactoring without making changes:
```bash
refactor apply --dry-run
```

### Automatic Backups
All changes are backed up before application:
```bash
refactor rollback --refactoring-id abc123
```

### Validation
Code is validated before and after refactoring:
- Syntax checking
- Build verification
- Test execution (optional)

### Incremental Application
Apply changes to one repository at a time:
```bash
refactor apply --repo my-org/repo1
```

## Advanced Features

### Custom Pattern Detectors

Create custom pattern detection logic:

```typescript
import { PatternDetector } from '@cross-repo-refactor/core';

class CustomDetector extends PatternDetector {
  async extractPatterns(code: string): Promise<Pattern[]> {
    // Custom pattern extraction logic
  }
}
```

### Custom Refactoring Strategies

Define custom refactoring strategies:

```typescript
import { RefactorStrategy } from '@cross-repo-refactor/core';

const strategy: RefactorStrategy = {
  type: 'transform',
  description: 'Update API endpoint',
  rules: [
    {
      condition: 'contains("/api/users/")',
      action: 'replace',
      parameters: {
        pattern: '/api/users/',
        replacement: '/api/v2/users/'
      }
    }
  ]
};
```

### Webhooks and Notifications

Configure webhooks for PR events:

```json
{
  "webhooks": {
    "onPRCreated": "https://your-webhook.com/pr-created",
    "onPRMerged": "https://your-webhook.com/pr-merged"
  }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Cross-Repo Refactor
on:
  push:
    branches: [main]

jobs:
  refactor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run refactor scan
        run: |
          npm install -g @cross-repo-refactor/cli
          refactor scan . --output scan-results.json
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: scan-results
          path: scan-results.json
```

### GitLab CI

```yaml
refactor:
  stage: analyze
  script:
    - npm install -g @cross-repo-refactor/cli
    - refactor scan . --output scan-results.json
  artifacts:
    paths:
      - scan-results.json
```

## Performance

- **Parallel Processing**: Processes multiple repositories concurrently
- **Intelligent Caching**: Caches embeddings and repository metadata
- **Incremental Updates**: Only processes changed files
- **Resource Management**: Configurable memory and disk limits

## Limitations

- Requires API access to Git platform
- Embedding generation can be CPU-intensive
- Large organizations may require significant cache storage
- Some complex refactoring patterns may require manual review

## Roadmap

- [ ] Support for more Git platforms (Azure DevOps, Gitea)
- [ ] Advanced refactoring strategies (AST-based transformations)
- [ ] Machine learning for refactoring suggestion
- [ ] Integration with code review tools
- [ ] Support for monorepos
- [ ] Real-time collaboration features

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Documentation

- [Getting Started](GETTING_STARTED.md) - Detailed setup guide
- [Architecture](ARCHITECTURE.md) - System design and architecture
- [Integration Guide](INTEGRATION_GUIDE.md) - How components work together
- [API Reference](docs/API.md) - Complete API documentation
- [Implementation Plan](IMPLEMENTATION_PLAN.md) - Development roadmap
- [Project Structure](PROJECT_STRUCTURE.md) - Codebase organization

## Examples

- [Complete Workflow](examples/complete-workflow/) - End-to-end example
- [Programmatic API](examples/programmatic-api/) - Using as a library
- [GitLab CI Integration](examples/gitlab-ci-integration/) - CI/CD pipeline

## Support

- 📖 [Documentation](docs/)
- 💬 [Discussions](https://github.com/your-org/cross-repo-refactor/discussions)
- 🐛 [Issue Tracker](https://github.com/your-org/cross-repo-refactor/issues)
- 📧 Email: support@cross-repo-refactor.dev

## Acknowledgments

- Built with [Transformers.js](https://github.com/xenova/transformers.js)
- Inspired by the need for cross-repository context in AI-assisted development
- Thanks to all contributors and early adopters

---

**Status**: Base implementation complete with 7 packages, comprehensive examples, and full documentation.