/**
 * Repository cache manager
 * Handles caching of cloned repositories with LRU eviction
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Repository } from '@cross-repo-refactor/core';
import { CacheEntry, CacheConfig, RepositoryStats } from '../types';

export class RepositoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private hits = 0;
  private misses = 0;

  constructor(config: CacheConfig) {
    this.config = config;
    this.ensureCacheDir();
    this.loadCache();
    this.startCleanupTimer();
  }

  /**
   * Get cached repository path
   */
  async get(repository: Repository): Promise<string | null> {
    const key = this.getCacheKey(repository);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if cache entry is still valid
    const age = Date.now() - entry.clonedAt.getTime();
    const maxAge = this.config.maxAge * 24 * 60 * 60 * 1000;

    if (age > maxAge) {
      await this.remove(repository);
      this.misses++;
      return null;
    }

    // Check if directory still exists
    if (!(await fs.pathExists(entry.localPath))) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update last accessed time
    entry.lastAccessed = new Date();
    this.cache.set(key, entry);
    this.hits++;

    return entry.localPath;
  }

  /**
   * Add repository to cache
   */
  async set(repository: Repository, localPath: string): Promise<void> {
    const key = this.getCacheKey(repository);
    
    // Get directory size
    const size = await this.getDirectorySize(localPath);
    
    // Get branches
    const branches = await this.getBranches(localPath);

    const entry: CacheEntry = {
      repository,
      localPath,
      clonedAt: new Date(),
      lastAccessed: new Date(),
      size,
      branches,
    };

    this.cache.set(key, entry);
    await this.saveCache();

    // Check if we need to evict entries
    await this.evictIfNeeded();
  }

  /**
   * Remove repository from cache
   */
  async remove(repository: Repository): Promise<void> {
    const key = this.getCacheKey(repository);
    const entry = this.cache.get(key);

    if (entry) {
      // Remove directory
      if (await fs.pathExists(entry.localPath)) {
        await fs.remove(entry.localPath);
      }
      this.cache.delete(key);
      await this.saveCache();
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    for (const entry of this.cache.values()) {
      if (await fs.pathExists(entry.localPath)) {
        await fs.remove(entry.localPath);
      }
    }
    this.cache.clear();
    await this.saveCache();
  }

  /**
   * Get cache statistics
   */
  getStats(): RepositoryStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const dates = entries.map(e => e.clonedAt.getTime());

    return {
      totalRepositories: entries.length,
      totalSize,
      oldestEntry: dates.length > 0 ? new Date(Math.min(...dates)) : null,
      newestEntry: dates.length > 0 ? new Date(Math.max(...dates)) : null,
      cacheHitRate: this.hits + this.misses > 0 
        ? this.hits / (this.hits + this.misses) 
        : 0,
    };
  }

  /**
   * Get all cached repositories
   */
  getAll(): CacheEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * Check if repository is cached
   */
  has(repository: Repository): boolean {
    return this.cache.has(this.getCacheKey(repository));
  }

  /**
   * Cleanup old entries
   */
  async cleanup(): Promise<number> {
    const maxAge = this.config.maxAge * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let removed = 0;

    for (const entry of this.cache.values()) {
      const age = now - entry.clonedAt.getTime();
      if (age > maxAge) {
        await this.remove(entry.repository);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Dispose cache manager
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  // Private methods

  private getCacheKey(repository: Repository): string {
    return `${repository.fullName}`;
  }

  private ensureCacheDir(): void {
    fs.ensureDirSync(this.config.baseDir);
  }

  private async loadCache(): Promise<void> {
    const cacheFile = path.join(this.config.baseDir, '.cache.json');
    
    if (await fs.pathExists(cacheFile)) {
      try {
        const data = await fs.readJson(cacheFile);
        
        for (const entry of data.entries || []) {
          // Convert date strings back to Date objects
          entry.clonedAt = new Date(entry.clonedAt);
          entry.lastAccessed = new Date(entry.lastAccessed);
          
          const key = this.getCacheKey(entry.repository);
          this.cache.set(key, entry);
        }
      } catch (error) {
        console.error('Failed to load cache:', error);
      }
    }
  }

  private async saveCache(): Promise<void> {
    const cacheFile = path.join(this.config.baseDir, '.cache.json');
    const entries = Array.from(this.cache.values());
    
    try {
      await fs.writeJson(cacheFile, { entries }, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  private async evictIfNeeded(): Promise<void> {
    const stats = this.getStats();
    const maxSizeBytes = this.config.maxSize * 1024 * 1024;

    if (stats.totalSize > maxSizeBytes) {
      // Sort by last accessed time (LRU)
      const entries = Array.from(this.cache.values())
        .sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

      // Remove oldest entries until we're under the limit
      let currentSize = stats.totalSize;
      for (const entry of entries) {
        if (currentSize <= maxSizeBytes) {
          break;
        }
        await this.remove(entry.repository);
        currentSize -= entry.size;
      }
    }
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let size = 0;

    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          size += await this.getDirectorySize(filePath);
        } else {
          size += stats.size;
        }
      }
    } catch (error) {
      console.error(`Failed to get directory size for ${dirPath}:`, error);
    }

    return size;
  }

  private async getBranches(repoPath: string): Promise<string[]> {
    try {
      const gitDir = path.join(repoPath, '.git', 'refs', 'heads');
      if (await fs.pathExists(gitDir)) {
        return await fs.readdir(gitDir);
      }
    } catch (error) {
      console.error(`Failed to get branches for ${repoPath}:`, error);
    }
    return [];
  }

  private startCleanupTimer(): void {
    const interval = this.config.cleanupInterval * 60 * 60 * 1000;
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(error => {
        console.error('Cleanup failed:', error);
      });
    }, interval);
  }
}

// Made with Bob
