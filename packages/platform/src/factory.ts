/**
 * Factory function for creating platform adapters
 */

import { Credentials, PlatformError } from '@cross-repo-refactor/core';
import { GitPlatformAdapter } from './adapter/GitPlatformAdapter';
import { GitHubProvider } from './providers/github';
import { GitLabProvider } from './providers/gitlab';

/**
 * Create a platform adapter based on credentials
 * 
 * @param credentials - Platform credentials including type and token
 * @returns Appropriate platform adapter instance
 * 
 * @example
 * ```typescript
 * // GitHub with Personal Access Token
 * const github = createPlatformAdapter({
 *   platform: 'github',
 *   token: process.env.GITHUB_TOKEN,
 *   tokenType: 'personal'
 * });
 * 
 * // GitLab with CI/CD token
 * const gitlab = createPlatformAdapter({
 *   platform: 'gitlab',
 *   token: process.env.CI_JOB_TOKEN,
 *   tokenType: 'ci-cd',
 *   url: 'https://gitlab.company.com'
 * });
 * ```
 */
export function createPlatformAdapter(credentials: Credentials): GitPlatformAdapter {
  switch (credentials.platform) {
    case 'github':
      return new GitHubProvider(credentials);
    
    case 'gitlab':
      return new GitLabProvider(credentials);
    
    case 'bitbucket':
      throw new PlatformError('Bitbucket provider not yet implemented', {
        platform: 'bitbucket',
        suggestion: 'Use GitHub or GitLab for now',
      });
    
    case 'azure-devops':
      throw new PlatformError('Azure DevOps provider not yet implemented', {
        platform: 'azure-devops',
        suggestion: 'Use GitHub or GitLab for now',
      });
    
    default:
      throw new PlatformError(`Unsupported platform: ${credentials.platform}`, {
        platform: credentials.platform,
        supportedPlatforms: ['github', 'gitlab'],
      });
  }
}

/**
 * Validate credentials before creating adapter
 */
export function validateCredentials(credentials: Credentials): void {
  if (!credentials.token) {
    throw new PlatformError('Token is required', {
      platform: credentials.platform,
    });
  }

  if (!credentials.platform) {
    throw new PlatformError('Platform type is required', {
      supportedPlatforms: ['github', 'gitlab', 'bitbucket', 'azure-devops'],
    });
  }

  // Validate token type
  const validTokenTypes = ['personal', 'oauth', 'ci-cd', 'app'];
  if (!validTokenTypes.includes(credentials.tokenType)) {
    throw new PlatformError(`Invalid token type: ${credentials.tokenType}`, {
      validTokenTypes,
    });
  }

  // Platform-specific validation
  if (credentials.platform === 'gitlab' && credentials.tokenType === 'ci-cd') {
    // GitLab CI/CD tokens have specific requirements
    if (!credentials.url) {
      throw new PlatformError('URL is required for GitLab CI/CD tokens', {
        platform: 'gitlab',
        tokenType: 'ci-cd',
      });
    }
  }
}

/**
 * Create and authenticate a platform adapter
 * 
 * @param credentials - Platform credentials
 * @returns Authenticated platform adapter
 */
export async function createAuthenticatedAdapter(
  credentials: Credentials
): Promise<GitPlatformAdapter> {
  validateCredentials(credentials);
  
  const adapter = createPlatformAdapter(credentials);
  await adapter.authenticate();
  
  return adapter;
}

// Made with Bob
