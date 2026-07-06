# Cross-Repo Refactor Coordinator

AI-powered tool for coordinating refactoring patterns across multiple repositories in an organization.

## The Problem

Every org has this ghost: a pattern copied across a dozen repos, in three languages, by four people who have since left. You fix it in one place, feel briefly virtuous, and forget the other eleven. Six weeks later a bug report arrives from a service you forgot existed.

The Cross-Repo Refactor Coordinator finds those eleven other places, applies the same fix, and opens linked pull requests so your reviewers can see the whole blast radius in one glance. It does not care that the Python version uses `requests` and the Go version uses `net/http`. It matches on what the code *means*, not how it's spelled.

## What It Does

- **Finds patterns by meaning, not by grep.** Semantic code embeddings match `fetchUserData` in TypeScript to `get_user_data` in Python to `FetchUserData` in Go, even when the surface syntax shares nothing.
- **Speaks GitHub, GitLab, and Bitbucket.** One config, one workflow, three platforms.
- **Opens coordinated PRs.** Linked, cross-referenced, labeled, and pointed at the right reviewers, so nobody has to play detective.
- **Runs from your terminal or your editor.** CLI for the automators, VS Code extension for the point-and-clickers.
- **Doesn't panic about polyglot repos.** Multiple languages in one codebase is the normal case, not the edge case.
- **Assumes it might be wrong.** Dry-run is the default. Backups happen automatically. Rollback is one command. You have to *ask* it to touch anything for real.
- **Doesn't waste your afternoon.** Parallel processing, cached embeddings, incremental scans.

## When You'd Reach For This

**API migration.** You bump an endpoint in one service. Every microservice that calls it gets the update, coordinated, before the old route 404s in production.

**Security patches.** You write the fix once. The tool hunts down every repo with the same vulnerable shape and propagates it, instead of you filing eleven tickets and hoping.

**Killing a deprecated dependency.** That library everyone was told to stop using two years ago? Find every last usage and retire it in one sweep.

**Standardization that actually sticks.** Refactor a pattern into the shape you want, then stamp it across the org. Coding standards enforced by machines instead of by nagging in code review.

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

Three layers, one job: turn "I fixed it here" into "it's fixed everywhere."

## Quick Start

### Installation

```bash
# Install CLI globally
npm install -g @cross-repo-refactor/cli

# Or install VS Code extension
code --install-extension cross-repo-refactor
```

### Configuration

Drop a `.refactorrc.json` in your project root:

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

# Detect similar patterns across the org
refactor detect --pattern-id abc123

# Apply refactoring (dry-run by default, because we're not reckless)
refactor apply --pattern-id abc123

# Create coordinated PRs
refactor propose --pattern-id abc123

# Or do the whole dance in one command
refactor workflow ./my-repo --pattern "function oldApi()"
```

#### VS Code Extension

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `Cross-Repo Refactor: Scan Repository`
3. Pick a detected pattern
4. Review the matches across your repos
5. Hit "Create Coordinated PRs" and go make coffee

## How It Actually Works

### 1. It reads your code and picks out patterns

```typescript
// This gets noticed
function fetchUserData(userId: string) {
  return axios.get(`/api/users/${userId}`);
}
```

### 2. It finds the cousins, no matter the accent

Embeddings match on meaning, so these all light up as the same pattern:

```python
# Python, different library, same idea
def get_user_data(user_id: str):
    return requests.get(f"/api/users/{user_id}")
```

```go
// Go, different everything, still matched
func FetchUserData(userId string) (*User, error) {
    return http.Get("/api/users/" + userId)
}
```

### 3. It applies the change to the whole family

```typescript
// TypeScript, now on v2
function fetchUserData(userId: string) {
  return axios.get(`/api/v2/users/${userId}`);
}
```

```python
# Python, also on v2
def get_user_data(user_id: str):
    return requests.get(f"/api/v2/users/{user_id}")
```

```go
// Go, you get the idea
func FetchUserData(userId string) (*User, error) {
    return http.Get("/api/v2/users/" + userId)
}
```

### 4. It opens PRs that reference each other

Every pull request lands with a consistent title and body, links to its siblings, the right labels, and the reviewers you named. Your team sees one coordinated change instead of eleven mysterious drive-bys.

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

- **Language**: TypeScript / Node.js
- **AI/ML**: Transformers.js, CodeBERT embeddings
- **Git Operations**: simple-git
- **Platform APIs**: Octokit (GitHub), GitBeaker (GitLab)
- **Storage**: SQLite
- **CLI**: Commander.js
- **VS Code**: Extension API

## Configuration Reference

### Platform

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

### AI

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

The `similarityThreshold` is your paranoia dial. Crank it toward 1.0 and it only matches near-identical code. Loosen it and it starts finding distant relatives, some of which you may not want at the reunion.

### Refactoring

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

Refactoring across an entire org is the kind of power that should come with a seatbelt. Here are the seatbelts.

### Dry-run mode

Nothing is real until you say so:

```bash
refactor apply --dry-run
```

### Automatic backups

Every change is backed up before it touches disk. Regret is reversible:

```bash
refactor rollback --refactoring-id abc123
```

### Validation

Code gets checked coming and going: syntax, build, and optionally the test suite.

### One repo at a time

If you'd rather not bet the whole org on a single command:

```bash
refactor apply --repo my-org/repo1
```

## Advanced Features

### Custom pattern detectors

Bring your own idea of what counts as a pattern:

```typescript
import { PatternDetector } from '@cross-repo-refactor/core';

class CustomDetector extends PatternDetector {
  async extractPatterns(code: string): Promise<Pattern[]> {
    // Your pattern extraction logic here
  }
}
```

### Custom refactoring strategies

Describe the transformation you want in plain rules:

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

### Webhooks

Get pinged when things happen:

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

Repos are processed in parallel. Embeddings and repo metadata are cached, so the second scan is cheap. Only changed files get reprocessed. Memory and disk limits are yours to set.

## Honest Limitations

- It needs API access to your Git platform. No access, no magic.
- Generating embeddings is CPU-hungry. Your laptop fan will have opinions.
- Big orgs mean big caches. Budget the disk.
- Some refactors are genuinely gnarly and want a human in the loop. The tool will not pretend otherwise.

## Roadmap

- [ ] More platforms (Azure DevOps, Gitea)
- [ ] AST-based transformations for the truly structural refactors
- [ ] ML-driven refactoring suggestions
- [ ] Code review tool integrations
- [ ] Monorepo support
- [ ] Real-time collaboration

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and guidelines. New contributors welcome, ghost patterns unwelcome.

## License

MIT License. See [LICENSE](LICENSE).

## Documentation

- [Getting Started](GETTING_STARTED.md)
- [Architecture](ARCHITECTURE.md)
- [Integration Guide](INTEGRATION_GUIDE.md)
- [API Reference](docs/API.md)
- [Implementation Plan](IMPLEMENTATION_PLAN.md)
- [Project Structure](PROJECT_STRUCTURE.md)

## Examples

- [Complete Workflow](examples/complete-workflow/)
- [Programmatic API](examples/programmatic-api/)
- [GitLab CI Integration](examples/gitlab-ci-integration/)

## Support

- [Documentation](docs/)
- [Discussions](https://github.com/your-org/cross-repo-refactor/discussions)
- [Issue Tracker](https://github.com/your-org/cross-repo-refactor/issues)
- support@cross-repo-refactor.dev

## Acknowledgments

- Built on [Transformers.js](https://github.com/xenova/transformers.js)
- Born from the very specific pain of fixing the same bug in twelve places
- Thanks to the contributors and early adopters who trusted it near their repos

---

**Status**: Base implementation complete. 7 packages, working examples, full docs.
