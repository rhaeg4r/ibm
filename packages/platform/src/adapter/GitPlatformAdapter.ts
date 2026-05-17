/**
 * Abstract base class for Git platform adapters
 * Provides a unified interface for interacting with different Git hosting platforms
 */

import {
  Repository,
  Credentials,
  PR,
  PRConfig,
  PlatformError,
} from '@cross-repo-refactor/core';

export abstract class GitPlatformAdapter {
  protected credentials: Credentials;
  protected authenticated: boolean = false;

  constructor(credentials: Credentials) {
    this.credentials = credentials;
  }

  /**
   * Authenticate with the platform using provided credentials
   * Supports multiple token types including CI/CD tokens
   */
  abstract authenticate(): Promise<void>;

  /**
   * Verify if the current authentication is valid
   */
  abstract verifyAuthentication(): Promise<boolean>;

  /**
   * List all repositories in an organization/group
   */
  abstract listRepositories(org: string, page?: number): Promise<Repository[]>;

  /**
   * Get a specific repository by full name (org/repo)
   */
  abstract getRepository(fullName: string): Promise<Repository>;

  /**
   * Create a new branch from an existing branch
   */
  abstract createBranch(repo: string, branch: string, from: string): Promise<void>;

  /**
   * Check if a branch exists
   */
  abstract branchExists(repo: string, branch: string): Promise<boolean>;

  /**
   * Delete a branch
   */
  abstract deleteBranch(repo: string, branch: string): Promise<void>;

  /**
   * Create a pull/merge request
   */
  abstract createPR(repo: string, config: PRConfig): Promise<PR>;

  /**
   * Update an existing pull/merge request
   */
  abstract updatePR(repo: string, prNumber: number, updates: Partial<PRConfig>): Promise<void>;

  /**
   * Get pull/merge request details
   */
  abstract getPR(repo: string, prNumber: number): Promise<PR>;

  /**
   * Link multiple PRs together by updating their descriptions
   */
  abstract linkPRs(prs: PR[]): Promise<void>;

  /**
   * Get the default branch of a repository
   */
  abstract getDefaultBranch(repo: string): Promise<string>;

  /**
   * Get the latest commit SHA of a branch
   */
  abstract getLatestCommit(repo: string, branch: string): Promise<string>;

  /**
   * Check if the adapter is authenticated
   */
  isAuthenticated(): boolean {
    return this.authenticated;
  }

  /**
   * Get platform-specific rate limit information
   */
  abstract getRateLimit(): Promise<{
    limit: number;
    remaining: number;
    reset: Date;
  }>;

  /**
   * Handle platform-specific errors
   */
  protected handleError(error: unknown, context: string): never {
    if (error instanceof Error) {
      throw new PlatformError(`${context}: ${error.message}`, {
        platform: this.credentials.platform,
        originalError: error,
      });
    }
    throw new PlatformError(`${context}: Unknown error`, {
      platform: this.credentials.platform,
    });
  }

  /**
   * Validate repository full name format
   */
  protected validateRepoName(fullName: string): { owner: string; repo: string } {
    const parts = fullName.split('/');
    if (parts.length !== 2) {
      throw new PlatformError(`Invalid repository name format: ${fullName}`, {
        expected: 'owner/repo',
        received: fullName,
      });
    }
    return { owner: parts[0], repo: parts[1] };
  }

  /**
   * Sleep for rate limiting
   */
  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   */
  protected async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Retry failed');
  }
}

// Made with Bob
