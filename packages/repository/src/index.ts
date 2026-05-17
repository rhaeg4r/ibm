/**
 * Repository management package
 * Exports all public APIs
 */

export * from './types';
export { RepositoryCache } from './cache/RepositoryCache';
export { RepositoryCloner } from './clone/RepositoryCloner';
export { WorkspaceManager } from './workspace/WorkspaceManager';

// Factory function for easy setup
import { RepositoryCache } from './cache/RepositoryCache';
import { RepositoryCloner } from './clone/RepositoryCloner';
import { WorkspaceManager } from './workspace/WorkspaceManager';
import { CacheConfig, WorkspaceConfig } from './types';

export interface RepositoryManagerConfig {
  cache: CacheConfig;
  workspace: WorkspaceConfig;
}

export class RepositoryManager {
  public cache: RepositoryCache;
  public cloner: RepositoryCloner;
  public workspace: WorkspaceManager;

  constructor(config: RepositoryManagerConfig) {
    this.cache = new RepositoryCache(config.cache);
    this.cloner = new RepositoryCloner(this.cache);
    this.workspace = new WorkspaceManager(
      config.workspace,
      this.cache,
      this.cloner
    );
  }

  /**
   * Initialize the repository manager
   */
  async initialize(): Promise<void> {
    await this.workspace.initialize();
  }

  /**
   * Cleanup and dispose resources
   */
  dispose(): void {
    this.cache.dispose();
  }
}

/**
 * Create a repository manager with default configuration
 */
export function createRepositoryManager(
  config: Partial<RepositoryManagerConfig> = {}
): RepositoryManager {
  const defaultConfig: RepositoryManagerConfig = {
    cache: {
      baseDir: config.cache?.baseDir || './.cache/repositories',
      maxSize: config.cache?.maxSize || 1024, // 1GB
      maxAge: config.cache?.maxAge || 7, // 7 days
      cleanupInterval: config.cache?.cleanupInterval || 24, // 24 hours
    },
    workspace: {
      rootDir: config.workspace?.rootDir || './workspace',
      repositories: config.workspace?.repositories || [],
      parallel: config.workspace?.parallel || 3,
    },
  };

  return new RepositoryManager(defaultConfig);
}

// Made with Bob
