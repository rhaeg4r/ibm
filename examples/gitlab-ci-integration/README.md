# GitLab CI/CD Integration Example

This example demonstrates how to use the Cross-Repo Refactor Coordinator with GitLab CI/CD tokens for automated refactoring workflows.

## Overview

GitLab CI/CD provides job tokens (`$CI_JOB_TOKEN`) that can be used to authenticate API requests during pipeline execution. This example shows how to leverage these tokens for automated cross-repository refactoring.

## Features

- **Automated Scanning**: Scan repositories on every commit to main/develop
- **Pattern Detection**: Detect similar patterns across your organization
- **Dry-Run Refactoring**: Preview changes before applying them
- **Manual MR Creation**: Create merge requests with manual approval
- **Scheduled Scans**: Regular scans for refactoring opportunities
- **Cache Management**: Efficient caching for faster pipeline execution

## Setup

### 1. Add CI/CD Configuration

Copy `.gitlab-ci.yml` to your repository root:

```bash
cp examples/gitlab-ci-integration/.gitlab-ci.yml .gitlab-ci.yml
```

### 2. Configure CI/CD Variables

In your GitLab project, go to **Settings > CI/CD > Variables** and add:

| Variable | Value | Protected | Masked |
|----------|-------|-----------|--------|
| `DRY_RUN` | `true` | No | No |
| `NODE_VERSION` | `18` | No | No |

**Note**: `CI_JOB_TOKEN` is automatically provided by GitLab and doesn't need to be configured.

### 3. Enable CI/CD Token Permissions

Ensure your project has the necessary permissions:

1. Go to **Settings > CI/CD > Token Access**
2. Enable "Limit CI_JOB_TOKEN access scope"
3. Add projects that should be accessible during CI/CD

### 4. Create Configuration File

The pipeline automatically creates `.refactorrc.json` using the CI/CD token:

```json
{
  "platform": {
    "type": "gitlab",
    "url": "${CI_SERVER_URL}",
    "token": "${CI_JOB_TOKEN}",
    "tokenType": "ci-cd"
  },
  "organization": "${CI_PROJECT_NAMESPACE}",
  ...
}
```

## Pipeline Stages

### Stage 1: Scan

Scans the current repository for refactoring patterns.

```bash
refactor scan . --output scan-results.json
```

**Triggers**: Automatic on push to main/develop

### Stage 2: Detect

Detects similar patterns across all repositories in the organization.

```bash
refactor detect --input scan-results.json --output matches.json
```

**Triggers**: Automatic after scan stage

### Stage 3: Refactor

Applies refactoring in dry-run mode to preview changes.

```bash
refactor apply --input matches.json --dry-run --output results.json
```

**Triggers**: Automatic after detect stage

### Stage 4: Propose

Creates coordinated merge requests across affected repositories.

```bash
refactor propose --input results.json --output prs.json
```

**Triggers**: Manual (requires approval)

## Usage Examples

### Basic Workflow

1. **Push changes** to main or develop branch
2. **Pipeline runs** automatically through scan, detect, and refactor stages
3. **Review results** in the pipeline artifacts
4. **Manually trigger** the propose stage to create MRs
5. **Review and merge** the coordinated MRs

### Scheduled Scans

Set up a pipeline schedule for regular scans:

1. Go to **CI/CD > Schedules**
2. Create new schedule (e.g., daily at 2 AM)
3. Set target branch to `main`
4. The `scheduled_scan` job will run automatically

### Manual Refactoring

Trigger a manual refactoring workflow:

```bash
# In your local environment
export GITLAB_TOKEN=$CI_JOB_TOKEN
refactor workflow . --pattern "oldFunction()" --strategy replace
```

## CI/CD Token Limitations

GitLab CI/CD tokens have some limitations compared to Personal Access Tokens:

### Permissions

- ✅ Read repository information
- ✅ Clone repositories
- ✅ Create branches
- ✅ Create merge requests
- ❌ Limited to job scope
- ❌ Cannot access all API endpoints

### Workarounds

For operations requiring broader permissions:

1. **Use Project Access Tokens**: Create a project access token with required scopes
2. **Use Group Access Tokens**: For group-wide operations
3. **Use Personal Access Tokens**: For user-specific operations

Add these as CI/CD variables:

```yaml
variables:
  GITLAB_TOKEN: $PROJECT_ACCESS_TOKEN  # or $GROUP_ACCESS_TOKEN
```

## Security Best Practices

### 1. Token Scope

Always use the minimum required token scope:

```yaml
# Good: Use CI_JOB_TOKEN for read operations
GITLAB_TOKEN: $CI_JOB_TOKEN

# Better: Use project token for write operations
GITLAB_TOKEN: $PROJECT_ACCESS_TOKEN
```

### 2. Protected Branches

Only run refactoring on protected branches:

```yaml
only:
  - main
  - develop
```

### 3. Manual Approval

Require manual approval for creating MRs:

```yaml
propose_changes:
  when: manual
```

### 4. Dry-Run by Default

Always use dry-run mode by default:

```yaml
variables:
  DRY_RUN: "true"
```

## Troubleshooting

### Token Authentication Failed

**Error**: `GitLab authentication failed`

**Solution**: 
1. Check if CI/CD token access is enabled
2. Verify project permissions in Token Access settings
3. Use a project or group access token instead

### Insufficient Permissions

**Error**: `403 Forbidden`

**Solution**:
1. Use a token with broader permissions
2. Add required projects to Token Access scope
3. Check if the token has expired

### Rate Limiting

**Error**: `429 Too Many Requests`

**Solution**:
1. Reduce scan frequency
2. Implement caching
3. Use pagination for large organizations

## Advanced Configuration

### Custom Refactoring Rules

Create custom rules in `.refactorrc.json`:

```json
{
  "refactoring": {
    "validation": {
      "enabled": true,
      "rules": [
        {
          "type": "custom",
          "command": "npm run lint",
          "required": true
        }
      ]
    }
  }
}
```

### Webhook Notifications

Send notifications on pipeline events:

```json
{
  "webhooks": [
    {
      "url": "https://hooks.slack.com/services/YOUR/WEBHOOK",
      "events": ["pr:created", "operation:completed"]
    }
  ]
}
```

### Multi-Stage Refactoring

Split refactoring into multiple stages:

```yaml
refactor_stage_1:
  script:
    - refactor apply --pattern "pattern1" --output stage1.json

refactor_stage_2:
  script:
    - refactor apply --pattern "pattern2" --output stage2.json
  dependencies:
    - refactor_stage_1
```

## Resources

- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [CI Job Token](https://docs.gitlab.com/ee/ci/jobs/ci_job_token.html)
- [Project Access Tokens](https://docs.gitlab.com/ee/user/project/settings/project_access_tokens.html)
- [Cross-Repo Refactor Documentation](../../README.md)

## Support

For issues or questions:
- Open an issue on GitHub
- Check the main documentation
- Review GitLab CI/CD logs for detailed error messages