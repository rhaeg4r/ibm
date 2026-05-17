/**
 * Cross-Repo Refactor Coordinator - Platform Package
 * 
 * Provides unified interface for interacting with different Git hosting platforms
 * including GitHub, GitLab, and Bitbucket.
 */

// Export adapter
export { GitPlatformAdapter } from './adapter/GitPlatformAdapter';

// Export providers
export { GitHubProvider } from './providers/github';
export { GitLabProvider } from './providers/gitlab';

// Export factory function
export { createPlatformAdapter } from './factory';

// Version information
export const VERSION = '0.1.0';
export const NAME = '@cross-repo-refactor/platform';

// Made with Bob
