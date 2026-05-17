/**
 * Repository management types
 */

import { Repository } from '@cross-repo-refactor/core';

export interface CloneOptions {
  depth?: number;
  branch?: string;
  singleBranch?: boolean;
  token?: string;
}

export interface CacheEntry {
  repository: Repository;
  localPath: string;
  clonedAt: Date;
  lastAccessed: Date;
  size: number;
  branches: string[];
}

export interface CacheConfig {
  baseDir: string;
  maxSize: number; // in MB
  maxAge: number; // in days
  cleanupInterval: number; // in hours
}

export interface RepositoryStats {
  totalRepositories: number;
  totalSize: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  cacheHitRate: number;
}

export interface CloneProgress {
  repository: Repository;
  status: 'pending' | 'cloning' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
}

export interface WorkspaceConfig {
  rootDir: string;
  repositories: Repository[];
  parallel: number;
}

// Made with Bob
