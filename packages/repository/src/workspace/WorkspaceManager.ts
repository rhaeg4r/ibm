/**
 * Workspace manager
 * Manages multiple repositories in a workspace
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import simpleGit, { SimpleGit } from 'simple-git';
import { Repository } from '@cross-repo-refactor/core';
import { WorkspaceConfig } from '../types';
import { RepositoryCloner } from '../clone/RepositoryCloner';
import { RepositoryCache } from '../cache/RepositoryCache';

export class WorkspaceManager {
  private config: WorkspaceConfig;
  private cloner: RepositoryCloner;
  private cache: RepositoryCache;

  constructor(
    config: WorkspaceConfig,
    cache: RepositoryCache,
    cloner: RepositoryCloner
  ) {
    this.config = config;
    this.cache = cache;
    this.cloner = cloner;
  }

  /**
   * Initialize workspace with repositories
   */
  async initialize(): Promise<void> {
    // Ensure workspace directory exists
    await fs.ensureDir(this.config.rootDir);

    // Clone all repositories
    await this.cloner.cloneMany(
      this.config.repositories,
      {},
      this.config.parallel
    );
  }

  /**
   * Get repository path in workspace
   */
  async getRepositoryPath(repository: Repository): Promise<string | null> {
    return await this.cache.get(repository);
  }

  /**
   * Get all repository paths
   */
  async getAllRepositoryPaths(): Promise<Map<string, string>> {
    const paths = new Map<string, string>();

    for (const repo of this.config.repositories) {
      const localPath = await this.cache.get(repo);
      if (localPath) {
        paths.set(repo.id, localPath);
      }
    }

    return paths;
  }

  /**
   * Create a new branch in a repository
   */
  async createBranch(
    repository: Repository,
    branchName: string,
    baseBranch?: string
  ): Promise<void> {
    const localPath = await this.cache.get(repository);
    
    if (!localPath) {
      throw new Error(`Repository not found: ${repository.fullName}`);
    }

    const git: SimpleGit = simpleGit(localPath);

    // Checkout base branch if specified
    if (baseBranch) {
      await git.checkout(baseBranch);
      await git.pull();
    }

    // Create and checkout new branch
    await git.checkoutLocalBranch(branchName);
  }

  /**
   * Commit changes in a repository
   */
  async commit(
    repository: Repository,
    message: string,
    files?: string[]
  ): Promise<string> {
    const localPath = await this.cache.get(repository);
    
    if (!localPath) {
      throw new Error(`Repository not found: ${repository.fullName}`);
    }

    const git: SimpleGit = simpleGit(localPath);

    // Add files
    if (files && files.length > 0) {
      await git.add(files);
    } else {
      await git.add('.');
    }

    // Commit
    const result = await git.commit(message);
    
    return result.commit;
  }

  /**
   * Push changes to remote
   */
  async push(
    repository: Repository,
    branch?: string,
    force: boolean = false
  ): Promise<void> {
    const localPath = await this.cache.get(repository);
    
    if (!localPath) {
      throw new Error(`Repository not found: ${repository.fullName}`);
    }

    const git: SimpleGit = simpleGit(localPath);

    // Get current branch if not specified
    if (!branch) {
      const status = await git.status();
      branch = status.current || 'main';
    }

    // Push
    const options = force ? ['--force'] : [];
    await git.push('origin', branch, options);
  }

  /**
   * Get current branch
   */
  async getCurrentBranch(repository: Repository): Promise<string> {
    const localPath = await this.cache.get(repository);
    
    if (!localPath) {
      throw new Error(`Repository not found: ${repository.fullName}`);
    }

    const git: SimpleGit = simpleGit(localPath);
    const status = await git.status();
    
    return status.current || 'main';
  }

  /**
   * Get repository status
   */
  async getStatus(repository: Repository): Promise<{
    modified: string[];
    added: string[];
    deleted: string[];
    untracked: string[];
  }> {
    const localPath = await this.cache.get(repository);
    
    if (!localPath) {
      throw new Error(`Repository not found: ${repository.fullName}`);
    }

    const git: SimpleGit = simpleGit(localPath);
    const status = await git.status();

    return {
      modified: status.modified,
      added: status.created,
      deleted: status.deleted,
      untracked: status.not_added,
    };
  }

  /**
   * Reset repository to clean state
   */
  async reset(repository: Repository, hard: boolean = false): Promise<void> {
    const localPath = await this.cache.get(repository);
    
    if (!localPath) {
      throw new Error(`Repository not found: ${repository.fullName}`);
    }

    const git: SimpleGit = simpleGit(localPath);

    if (hard) {
      await git.reset(['--hard', 'HEAD']);
      await git.clean('f', ['-d']);
    } else {
      await git.reset(['HEAD']);
    }
  }

  /**
   * Update all repositories
   */
  async updateAll(): Promise<void> {
    const promises = this.config.repositories.map(repo =>
      this.cloner.update(repo).catch(error => {
        console.error(`Failed to update ${repo.fullName}:`, error);
      })
    );

    await Promise.all(promises);
  }

  /**
   * Read file from repository
   */
  async readFile(repository: Repository, filePath: string): Promise<string> {
    const localPath = await this.cache.get(repository);
    
    if (!localPath) {
      throw new Error(`Repository not found: ${repository.fullName}`);
    }

    const fullPath = path.join(localPath, filePath);
    return await fs.readFile(fullPath, 'utf-8');
  }

  /**
   * Write file to repository
   */
  async writeFile(
    repository: Repository,
    filePath: string,
    content: string
  ): Promise<void> {
    const localPath = await this.cache.get(repository);
    
    if (!localPath) {
      throw new Error(`Repository not found: ${repository.fullName}`);
    }

    const fullPath = path.join(localPath, filePath);
    
    // Ensure directory exists
    await fs.ensureDir(path.dirname(fullPath));
    
    // Write file
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  /**
   * Check if file exists in repository
   */
  async fileExists(repository: Repository, filePath: string): Promise<boolean> {
    const localPath = await this.cache.get(repository);
    
    if (!localPath) {
      return false;
    }

    const fullPath = path.join(localPath, filePath);
    return await fs.pathExists(fullPath);
  }

  /**
   * List files in repository directory
   */
  async listFiles(
    repository: Repository,
    dirPath: string = '.'
  ): Promise<string[]> {
    const localPath = await this.cache.get(repository);
    
    if (!localPath) {
      throw new Error(`Repository not found: ${repository.fullName}`);
    }

    const fullPath = path.join(localPath, dirPath);
    
    if (!(await fs.pathExists(fullPath))) {
      return [];
    }

    return await fs.readdir(fullPath);
  }

  /**
   * Clean up workspace
   */
  async cleanup(): Promise<void> {
    await this.cache.clear();
  }
}

// Made with Bob
