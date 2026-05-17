/**
 * Repository cloner
 * Handles cloning repositories with progress tracking
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import simpleGit, { SimpleGit, SimpleGitProgressEvent } from 'simple-git';
import { Repository } from '@cross-repo-refactor/core';
import { CloneOptions, CloneProgress } from '../types';
import { RepositoryCache } from '../cache/RepositoryCache';

export class RepositoryCloner {
  private cache: RepositoryCache;
  private progressCallbacks: Map<string, (progress: CloneProgress) => void> = new Map();

  constructor(cache: RepositoryCache) {
    this.cache = cache;
  }

  /**
   * Clone a repository
   */
  async clone(
    repository: Repository,
    options: CloneOptions = {},
    onProgress?: (progress: CloneProgress) => void
  ): Promise<string> {
    // Check cache first
    const cachedPath = await this.cache.get(repository);
    if (cachedPath) {
      console.log(`Using cached repository: ${repository.fullName}`);
      return cachedPath;
    }

    const localPath = this.getLocalPath(repository);
    
    // Ensure parent directory exists
    await fs.ensureDir(path.dirname(localPath));

    // Setup progress tracking
    if (onProgress) {
      this.progressCallbacks.set(repository.id, onProgress);
    }

    try {
      // Report starting
      this.reportProgress(repository, 'cloning', 0);

      // Prepare clone URL with token if provided
      const cloneUrl = this.prepareCloneUrl(repository.cloneUrl, options.token);

      // Clone options
      const cloneOptions: string[] = [];
      
      if (options.depth) {
        cloneOptions.push(`--depth=${options.depth}`);
      }
      
      if (options.branch) {
        cloneOptions.push(`--branch=${options.branch}`);
      }
      
      if (options.singleBranch) {
        cloneOptions.push('--single-branch');
      }

      // Create git instance with progress tracking
      const git: SimpleGit = simpleGit({
        progress: ({ progress }: SimpleGitProgressEvent) => {
          this.reportProgress(repository, 'cloning', progress);
        },
      });

      // Clone the repository
      await git.clone(cloneUrl, localPath, cloneOptions);

      // Report completion
      this.reportProgress(repository, 'completed', 100);

      // Add to cache
      await this.cache.set(repository, localPath);

      return localPath;
    } catch (error) {
      this.reportProgress(repository, 'failed', 0, (error as Error).message);
      throw error;
    } finally {
      this.progressCallbacks.delete(repository.id);
    }
  }

  /**
   * Clone multiple repositories in parallel
   */
  async cloneMany(
    repositories: Repository[],
    options: CloneOptions = {},
    concurrency: number = 3,
    onProgress?: (progress: CloneProgress) => void
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const queue: Repository[] = [...repositories];
    const inProgress: Promise<void>[] = [];

    while (queue.length > 0 || inProgress.length > 0) {
      // Start new clones up to concurrency limit
      while (queue.length > 0 && inProgress.length < concurrency) {
        const repo = queue.shift()!;
        
        const promise = this.clone(repo, options, onProgress)
          .then(localPath => {
            results.set(repo.id, localPath);
          })
          .catch(error => {
            console.error(`Failed to clone ${repo.fullName}:`, error);
          });

        inProgress.push(promise);
      }

      // Wait for at least one to complete
      if (inProgress.length > 0) {
        await Promise.race(inProgress);
        // Remove completed promises
        for (let i = inProgress.length - 1; i >= 0; i--) {
          const promise = inProgress[i];
          if (await this.isPromiseSettled(promise)) {
            inProgress.splice(i, 1);
          }
        }
      }
    }

    return results;
  }

  /**
   * Update an existing repository
   */
  async update(repository: Repository): Promise<void> {
    const localPath = await this.cache.get(repository);
    
    if (!localPath) {
      throw new Error(`Repository not found in cache: ${repository.fullName}`);
    }

    const git: SimpleGit = simpleGit(localPath);
    
    // Fetch latest changes
    await git.fetch();
    
    // Pull changes for current branch
    await git.pull();
  }

  /**
   * Get local path for repository
   */
  getLocalPath(repository: Repository): string {
    // Use cache base directory
    const cacheDir = this.cache['config'].baseDir;
    
    // Create safe directory name from repository full name
    const safeName = repository.fullName.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    return path.join(cacheDir, safeName);
  }

  /**
   * Check if repository is cloned
   */
  async isCloned(repository: Repository): Promise<boolean> {
    return this.cache.has(repository);
  }

  /**
   * Remove cloned repository
   */
  async remove(repository: Repository): Promise<void> {
    await this.cache.remove(repository);
  }

  // Private methods

  private prepareCloneUrl(url: string, token?: string): string {
    if (!token) {
      return url;
    }

    // Add token to URL for authentication
    try {
      const urlObj = new URL(url);
      
      // For HTTPS URLs, add token as username
      if (urlObj.protocol === 'https:') {
        urlObj.username = token;
        urlObj.password = 'x-oauth-basic';
      }
      
      return urlObj.toString();
    } catch (error) {
      console.error('Failed to parse clone URL:', error);
      return url;
    }
  }

  private reportProgress(
    repository: Repository,
    status: CloneProgress['status'],
    progress: number,
    error?: string
  ): void {
    const callback = this.progressCallbacks.get(repository.id);
    
    if (callback) {
      callback({
        repository,
        status,
        progress,
        error,
      });
    }
  }

  private async isPromiseSettled(promise: Promise<void>): Promise<boolean> {
    try {
      await Promise.race([
        promise,
        new Promise((resolve) => setTimeout(resolve, 0)),
      ]);
      return true;
    } catch {
      return true;
    }
  }
}

// Made with Bob
