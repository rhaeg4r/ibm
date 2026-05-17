# Cross-Repo Refactor Coordinator - Implementation Plan

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Project Setup
- Initialize monorepo with Lerna/pnpm workspaces
- Set up TypeScript configuration
- Configure ESLint and Prettier
- Set up Jest for testing
- Create CI/CD pipeline (GitHub Actions)

### 1.2 Core Type Definitions
Create shared type definitions across all packages:

```typescript
// packages/core/src/types/index.ts

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  language: string;
  lastActivity: Date;
}

export interface Pattern {
  id: string;
  code: string;
  language: string;
  context: CodeContext;
  metadata: PatternMetadata;
}

export interface CodeContext {
  filePath: string;
  startLine: number;
  endLine: number;
  surroundingCode: string;
}

export interface PatternMetadata {
  type: 'function' | 'class' | 'import' | 'config' | 'custom';
  name: string;
  description?: string;
  tags: string[];
}

export interface Embedding {
  vector: number[];
  model: string;
  dimension: number;
}

export interface Match {
  pattern: Pattern;
  targetRepo: Repository;
  targetLocation: CodeContext;
  similarity: number;
  confidence: number;
}

export interface RefactorStrategy {
  type: 'replace' | 'transform' | 'remove' | 'add';
  description: string;
  template?: string;
  rules: RefactorRule[];
}

export interface RefactorRule {
  condition: string;
  action: string;
  parameters: Record<string, any>;
}

export interface Refactoring {
  id: string;
  match: Match;
  strategy: RefactorStrategy;
  originalCode: string;
  refactoredCode: string;
  diff: string;
  validated: boolean;
}

export interface Result {
  refactoring: Refactoring;
  repository: Repository;
  branch: string;
  status: 'success' | 'failed' | 'pending';
  error?: string;
}

export interface PR {
  id: string;
  repository: Repository;
  number: number;
  url: string;
  title: string;
  description: string;
  branch: string;
  status: 'open' | 'merged' | 'closed';
  linkedPRs: string[];
}

export interface Credentials {
  platform: 'github' | 'gitlab' | 'bitbucket';
  token: string;
  url?: string;
}

export interface Config {
  platform: PlatformConfig;
  organization: string;
  repositories: RepositoryConfig;
  ai: AIConfig;
  refactoring: RefactoringConfig;
  cache: CacheConfig;
}

export interface PlatformConfig {
  type: 'github' | 'gitlab' | 'bitbucket';
  url: string;
  token: string;
}

export interface RepositoryConfig {
  include: string[];
  exclude: string[];
  filters: {
    languages: string[];
    minActivity?: string;
  };
}

export interface AIConfig {
  embeddingModel: string;
  similarityThreshold: number;
  provider: 'local' | 'openai' | 'anthropic';
  apiKey?: string;
}

export interface RefactoringConfig {
  dryRun: boolean;
  autoApply: boolean;
  branchPrefix: string;
  prTemplate: string;
}

export interface CacheConfig {
  directory: string;
  maxSize: string;
  ttl: number;
}
```

## Phase 2: Storage & Configuration (Week 3)

### 2.1 Configuration Manager
```typescript
// packages/storage/src/config/ConfigManager.ts

import { cosmiconfig } from 'cosmiconfig';
import { Config } from '@cross-repo-refactor/core';

export class ConfigManager {
  private config: Config | null = null;
  private explorer = cosmiconfig('refactor');

  async load(): Promise<Config> {
    const result = await this.explorer.search();
    if (!result) {
      throw new Error('Configuration file not found');
    }
    this.config = this.validateConfig(result.config);
    return this.config;
  }

  async save(config: Config): Promise<void> {
    // Save configuration logic
  }

  get(): Config {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return this.config;
  }

  private validateConfig(config: any): Config {
    // Validation logic using Zod or similar
    return config as Config;
  }
}
```

### 2.2 State Store
```typescript
// packages/storage/src/state/StateStore.ts

import Database from 'better-sqlite3';
import { Refactoring, Result, PR } from '@cross-repo-refactor/core';

export class StateStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS refactorings (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS results (
        id TEXT PRIMARY KEY,
        refactoring_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (refactoring_id) REFERENCES refactorings(id)
      );

      CREATE TABLE IF NOT EXISTS prs (
        id TEXT PRIMARY KEY,
        result_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (result_id) REFERENCES results(id)
      );
    `);
  }

  saveRefactoring(refactoring: Refactoring): void {
    const stmt = this.db.prepare(
      'INSERT INTO refactorings (id, data) VALUES (?, ?)'
    );
    stmt.run(refactoring.id, JSON.stringify(refactoring));
  }

  getRefactoring(id: string): Refactoring | null {
    const stmt = this.db.prepare('SELECT data FROM refactorings WHERE id = ?');
    const row = stmt.get(id) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  }

  // Additional methods for results and PRs
}
```

### 2.3 Cache Database
```typescript
// packages/storage/src/cache-db/CacheDB.ts

import Database from 'better-sqlite3';
import { Embedding } from '@cross-repo-refactor/core';

export class CacheDB {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        pattern_id TEXT NOT NULL,
        vector BLOB NOT NULL,
        model TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_pattern_id ON embeddings(pattern_id);
    `);
  }

  saveEmbedding(patternId: string, embedding: Embedding): void {
    const stmt = this.db.prepare(
      'INSERT OR REPLACE INTO embeddings (id, pattern_id, vector, model) VALUES (?, ?, ?, ?)'
    );
    const id = `${patternId}-${embedding.model}`;
    const vectorBuffer = Buffer.from(new Float32Array(embedding.vector).buffer);
    stmt.run(id, patternId, vectorBuffer, embedding.model);
  }

  getEmbedding(patternId: string, model: string): Embedding | null {
    const stmt = this.db.prepare(
      'SELECT vector, model FROM embeddings WHERE pattern_id = ? AND model = ?'
    );
    const row = stmt.get(patternId, model) as { vector: Buffer; model: string } | undefined;
    
    if (!row) return null;

    const vector = Array.from(new Float32Array(row.vector.buffer));
    return {
      vector,
      model: row.model,
      dimension: vector.length
    };
  }
}
```

## Phase 3: Platform Abstraction (Week 4)

### 3.1 Platform Adapter Interface
```typescript
// packages/platform/src/adapter/GitPlatformAdapter.ts

import { Repository, Credentials, PR } from '@cross-repo-refactor/core';

export interface PRConfig {
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  labels?: string[];
  reviewers?: string[];
}

export abstract class GitPlatformAdapter {
  protected credentials: Credentials;

  constructor(credentials: Credentials) {
    this.credentials = credentials;
  }

  abstract authenticate(): Promise<void>;
  abstract listRepositories(org: string): Promise<Repository[]>;
  abstract getRepository(fullName: string): Promise<Repository>;
  abstract createBranch(repo: string, branch: string, from: string): Promise<void>;
  abstract createPR(repo: string, config: PRConfig): Promise<PR>;
  abstract updatePR(repo: string, prNumber: number, updates: Partial<PRConfig>): Promise<void>;
  abstract linkPRs(prs: PR[]): Promise<void>;
  abstract getDefaultBranch(repo: string): Promise<string>;
}
```

### 3.2 GitHub Provider
```typescript
// packages/platform/src/providers/github.ts

import { Octokit } from '@octokit/rest';
import { GitPlatformAdapter, PRConfig } from '../adapter/GitPlatformAdapter';
import { Repository, Credentials, PR } from '@cross-repo-refactor/core';

export class GitHubProvider extends GitPlatformAdapter {
  private octokit: Octokit;

  constructor(credentials: Credentials) {
    super(credentials);
    this.octokit = new Octokit({
      auth: credentials.token,
      baseUrl: credentials.url || 'https://api.github.com'
    });
  }

  async authenticate(): Promise<void> {
    try {
      await this.octokit.users.getAuthenticated();
    } catch (error) {
      throw new Error('GitHub authentication failed');
    }
  }

  async listRepositories(org: string): Promise<Repository[]> {
    const { data } = await this.octokit.repos.listForOrg({
      org,
      per_page: 100
    });

    return data.map(repo => ({
      id: repo.id.toString(),
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
      language: repo.language || 'unknown',
      lastActivity: new Date(repo.updated_at)
    }));
  }

  async getRepository(fullName: string): Promise<Repository> {
    const [owner, repo] = fullName.split('/');
    const { data } = await this.octokit.repos.get({ owner, repo });

    return {
      id: data.id.toString(),
      name: data.name,
      fullName: data.full_name,
      url: data.html_url,
      defaultBranch: data.default_branch,
      language: data.language || 'unknown',
      lastActivity: new Date(data.updated_at)
    };
  }

  async createBranch(repo: string, branch: string, from: string): Promise<void> {
    const [owner, repoName] = repo.split('/');
    
    // Get the SHA of the source branch
    const { data: ref } = await this.octokit.git.getRef({
      owner,
      repo: repoName,
      ref: `heads/${from}`
    });

    // Create new branch
    await this.octokit.git.createRef({
      owner,
      repo: repoName,
      ref: `refs/heads/${branch}`,
      sha: ref.object.sha
    });
  }

  async createPR(repo: string, config: PRConfig): Promise<PR> {
    const [owner, repoName] = repo.split('/');

    const { data } = await this.octokit.pulls.create({
      owner,
      repo: repoName,
      title: config.title,
      body: config.description,
      head: config.sourceBranch,
      base: config.targetBranch
    });

    // Add labels if provided
    if (config.labels && config.labels.length > 0) {
      await this.octokit.issues.addLabels({
        owner,
        repo: repoName,
        issue_number: data.number,
        labels: config.labels
      });
    }

    // Request reviewers if provided
    if (config.reviewers && config.reviewers.length > 0) {
      await this.octokit.pulls.requestReviewers({
        owner,
        repo: repoName,
        pull_number: data.number,
        reviewers: config.reviewers
      });
    }

    return {
      id: data.id.toString(),
      repository: await this.getRepository(repo),
      number: data.number,
      url: data.html_url,
      title: data.title,
      description: data.body || '',
      branch: config.sourceBranch,
      status: 'open',
      linkedPRs: []
    };
  }

  async updatePR(repo: string, prNumber: number, updates: Partial<PRConfig>): Promise<void> {
    const [owner, repoName] = repo.split('/');

    await this.octokit.pulls.update({
      owner,
      repo: repoName,
      pull_number: prNumber,
      title: updates.title,
      body: updates.description
    });
  }

  async linkPRs(prs: PR[]): Promise<void> {
    // Add cross-references in PR descriptions
    for (const pr of prs) {
      const linkedPRs = prs
        .filter(p => p.id !== pr.id)
        .map(p => `- ${p.repository.fullName}#${p.number}`)
        .join('\n');

      const updatedDescription = `${pr.description}\n\n## Related PRs\n${linkedPRs}`;

      await this.updatePR(
        pr.repository.fullName,
        pr.number,
        { description: updatedDescription }
      );
    }
  }

  async getDefaultBranch(repo: string): Promise<string> {
    const repository = await this.getRepository(repo);
    return repository.defaultBranch;
  }
}
```

### 3.3 GitLab Provider
```typescript
// packages/platform/src/providers/gitlab.ts

import { Gitlab } from '@gitbeaker/node';
import { GitPlatformAdapter, PRConfig } from '../adapter/GitPlatformAdapter';
import { Repository, Credentials, PR } from '@cross-repo-refactor/core';

export class GitLabProvider extends GitPlatformAdapter {
  private gitlab: InstanceType<typeof Gitlab>;

  constructor(credentials: Credentials) {
    super(credentials);
    this.gitlab = new Gitlab({
      token: credentials.token,
      host: credentials.url || 'https://gitlab.com'
    });
  }

  async authenticate(): Promise<void> {
    try {
      await this.gitlab.Users.current();
    } catch (error) {
      throw new Error('GitLab authentication failed');
    }
  }

  async listRepositories(org: string): Promise<Repository[]> {
    const projects = await this.gitlab.Groups.projects(org, {
      perPage: 100
    });

    return projects.map(project => ({
      id: project.id.toString(),
      name: project.name,
      fullName: project.path_with_namespace,
      url: project.web_url,
      defaultBranch: project.default_branch || 'main',
      language: 'unknown', // GitLab API doesn't provide primary language easily
      lastActivity: new Date(project.last_activity_at)
    }));
  }

  async getRepository(fullName: string): Promise<Repository> {
    const project = await this.gitlab.Projects.show(fullName);

    return {
      id: project.id.toString(),
      name: project.name,
      fullName: project.path_with_namespace,
      url: project.web_url,
      defaultBranch: project.default_branch || 'main',
      language: 'unknown',
      lastActivity: new Date(project.last_activity_at)
    };
  }

  async createBranch(repo: string, branch: string, from: string): Promise<void> {
    await this.gitlab.Branches.create(repo, branch, from);
  }

  async createPR(repo: string, config: PRConfig): Promise<PR> {
    const mr = await this.gitlab.MergeRequests.create(
      repo,
      config.sourceBranch,
      config.targetBranch,
      config.title,
      {
        description: config.description,
        labels: config.labels?.join(','),
        reviewers: config.reviewers
      }
    );

    return {
      id: mr.id.toString(),
      repository: await this.getRepository(repo),
      number: mr.iid,
      url: mr.web_url,
      title: mr.title,
      description: mr.description || '',
      branch: config.sourceBranch,
      status: 'open',
      linkedPRs: []
    };
  }

  async updatePR(repo: string, prNumber: number, updates: Partial<PRConfig>): Promise<void> {
    await this.gitlab.MergeRequests.edit(repo, prNumber, {
      title: updates.title,
      description: updates.description
    });
  }

  async linkPRs(prs: PR[]): Promise<void> {
    // Similar to GitHub implementation
    for (const pr of prs) {
      const linkedPRs = prs
        .filter(p => p.id !== pr.id)
        .map(p => `- ${p.repository.fullName}!${p.number}`)
        .join('\n');

      const updatedDescription = `${pr.description}\n\n## Related MRs\n${linkedPRs}`;

      await this.updatePR(
        pr.repository.fullName,
        pr.number,
        { description: updatedDescription }
      );
    }
  }

  async getDefaultBranch(repo: string): Promise<string> {
    const repository = await this.getRepository(repo);
    return repository.defaultBranch;
  }
}
```

## Phase 4: Repository Management (Week 5)

### 4.1 Repository Discovery
```typescript
// packages/repository/src/discovery/RepositoryDiscovery.ts

import { GitPlatformAdapter } from '@cross-repo-refactor/platform';
import { Repository, RepositoryConfig } from '@cross-repo-refactor/core';

export class RepositoryDiscovery {
  constructor(private adapter: GitPlatformAdapter) {}

  async discover(org: string, config: RepositoryConfig): Promise<Repository[]> {
    const allRepos = await this.adapter.listRepositories(org);
    
    return allRepos.filter(repo => {
      // Apply include/exclude filters
      if (!this.matchesIncludePattern(repo.name, config.include)) {
        return false;
      }
      
      if (this.matchesExcludePattern(repo.name, config.exclude)) {
        return false;
      }

      // Apply language filter
      if (config.filters.languages.length > 0) {
        if (!config.filters.languages.includes(repo.language)) {
          return false;
        }
      }

      // Apply activity filter
      if (config.filters.minActivity) {
        const minDate = new Date(config.filters.minActivity);
        if (repo.lastActivity < minDate) {
          return false;
        }
      }

      return true;
    });
  }

  private matchesIncludePattern(name: string, patterns: string[]): boolean {
    if (patterns.length === 0) return true;
    return patterns.some(pattern => this.matchPattern(name, pattern));
  }

  private matchesExcludePattern(name: string, patterns: string[]): boolean {
    return patterns.some(pattern => this.matchPattern(name, pattern));
  }

  private matchPattern(name: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(name);
  }
}
```

### 4.2 Repository Cloner
```typescript
// packages/repository/src/cloner/RepositoryCloner.ts

import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Repository } from '@cross-repo-refactor/core';

export class RepositoryCloner {
  private git: SimpleGit;

  constructor(private cacheDir: string) {
    this.git = simpleGit();
    fs.ensureDirSync(cacheDir);
  }

  async clone(repo: Repository): Promise<string> {
    const repoPath = this.getRepoPath(repo);

    if (await fs.pathExists(repoPath)) {
      // Repository already exists, update it
      return await this.update(repoPath);
    }

    // Clone repository with shallow clone for efficiency
    await this.git.clone(repo.url, repoPath, ['--depth', '1']);
    return repoPath;
  }

  async update(repoPath: string): Promise<string> {
    const git = simpleGit(repoPath);
    await git.fetch(['--depth', '1']);
    await git.pull();
    return repoPath;
  }

  async cloneMultiple(repos: Repository[], concurrency: number = 5): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const chunks = this.chunkArray(repos, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(async repo => {
        try {
          const path = await this.clone(repo);
          results.set(repo.fullName, path);
        } catch (error) {
          console.error(`Failed to clone ${repo.fullName}:`, error);
        }
      });

      await Promise.all(promises);
    }

    return results;
  }

  private getRepoPath(repo: Repository): string {
    return path.join(this.cacheDir, repo.fullName.replace('/', '-'));
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
```

## Phase 5: AI/ML Services (Weeks 6-7)

### 5.1 Code Embedding Service
```typescript
// packages/ai/src/embeddings/EmbeddingService.ts

import { pipeline, Pipeline } from '@xenova/transformers';
import { Pattern, Embedding } from '@cross-repo-refactor/core';
import { CacheDB } from '@cross-repo-refactor/storage';

export class EmbeddingService {
  private model: Pipeline | null = null;
  private modelName: string;

  constructor(
    modelName: string = 'Xenova/codebert-base',
    private cache: CacheDB
  ) {
    this.modelName = modelName;
  }

  async initialize(): Promise<void> {
    this.model = await pipeline('feature-extraction', this.modelName);
  }

  async generateEmbedding(pattern: Pattern): Promise<Embedding> {
    // Check cache first
    const cached = this.cache.getEmbedding(pattern.id, this.modelName);
    if (cached) {
      return cached;
    }

    if (!this.model) {
      await this.initialize();
    }

    // Generate embedding
    const output = await this.model!(pattern.code, {
      pooling: 'mean',
      normalize: true
    });

    const vector = Array.from(output.data);
    const embedding: Embedding = {
      vector,
      model: this.modelName,
      dimension: vector.length
    };

    // Cache the embedding
    this.cache.saveEmbedding(pattern.id, embedding);

    return embedding;
  }

  async generateBatch(patterns: Pattern[]): Promise<Map<string, Embedding>> {
    const results = new Map<string, Embedding>();

    for (const pattern of patterns) {
      const embedding = await this.generateEmbedding(pattern);
      results.set(pattern.id, embedding);
    }

    return results;
  }
}
```

### 5.2 Semantic Pattern Matcher
```typescript
// packages/ai/src/matcher/SemanticMatcher.ts

import { HierarchicalNSW } from 'hnswlib-node';
import { Pattern, Embedding, Match, Repository } from '@cross-repo-refactor/core';

export class SemanticMatcher {
  private index: HierarchicalNSW;
  private patternMap: Map<number, Pattern>;

  constructor(private dimension: number, private threshold: number = 0.85) {
    this.index = new HierarchicalNSW('cosine', dimension);
    this.patternMap = new Map();
  }

  async buildIndex(patterns: Pattern[], embeddings: Map<string, Embedding>): Promise<void> {
    const numElements = patterns.length;
    this.index.initIndex(numElements);

    patterns.forEach((pattern, idx) => {
      const embedding = embeddings.get(pattern.id);
      if (embedding) {
        this.index.addPoint(embedding.vector, idx);
        this.patternMap.set(idx, pattern);
      }
    });
  }

  async findSimilar(
    queryPattern: Pattern,
    queryEmbedding: Embedding,
    k: number = 10
  ): Promise<Match[]> {
    const result = this.index.searchKnn(queryEmbedding.vector, k);
    
    const matches: Match[] = [];
    for (let i = 0; i < result.neighbors.length; i++) {
      const similarity = 1 - result.distances[i]; // Convert distance to similarity
      
      if (similarity >= this.threshold) {
        const targetPattern = this.patternMap.get(result.neighbors[i]);
        if (targetPattern) {
          matches.push({
            pattern: queryPattern,
            targetRepo: {
              id: '',
              name: '',
              fullName: '',
              url: '',
              defaultBranch: '',
              language: targetPattern.language,
              lastActivity: new Date()
            },
            targetLocation: targetPattern.context,
            similarity,
            confidence: this.calculateConfidence(similarity, queryPattern, targetPattern)
          });
        }
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateConfidence(
    similarity: number,
    source: Pattern,
    target: Pattern
  ): number {
    let confidence = similarity;

    // Boost confidence if languages match
    if (source.language === target.language) {
      confidence *= 1.1;
    }

    // Boost confidence if pattern types match
    if (source.metadata.type === target.metadata.type) {
      confidence *= 1.05;
    }

    return Math.min(confidence, 1.0);
  }
}
```

## Phase 6: Core Orchestrator (Week 8)

### 6.1 Refactor Orchestrator
```typescript
// packages/core/src/orchestrator/RefactorOrchestrator.ts

import { 
  Pattern, Match, Refactoring, Result, PR, Config 
} from '../types';
import { PatternDetector } from '../pattern-detector/PatternDetector';
import { RefactorEngine } from '../refactor-engine/RefactorEngine';
import { PRCoordinator } from '../coordinator/PRCoordinator';
import { RepositoryDiscovery, RepositoryCloner } from '@cross-repo-refactor/repository';
import { GitPlatformAdapter } from '@cross-repo-refactor/platform';
import { ConfigManager, StateStore } from '@cross-repo-refactor/storage';

export class RefactorOrchestrator {
  private patternDetector: PatternDetector;
  private refactorEngine: RefactorEngine;
  private prCoordinator: PRCoordinator;
  private repoDiscovery: RepositoryDiscovery;
  private repoCloner: RepositoryCloner;
  private stateStore: StateStore;

  constructor(
    private config: Config,
    private adapter: GitPlatformAdapter
  ) {
    this.patternDetector = new PatternDetector(config.ai);
    this.refactorEngine = new RefactorEngine();
    this.prCoordinator = new PRCoordinator(adapter);
    this.repoDiscovery = new RepositoryDiscovery(adapter);
    this.repoCloner = new RepositoryCloner(config.cache.directory);
    this.stateStore = new StateStore(`${config.cache.directory}/state.db`);
  }

  async scanRepository(repoPath: string): Promise<Pattern[]> {
    return await this.patternDetector.extractPatterns(repoPath);
  }

  async detectPatterns(pattern: Pattern): Promise<Match[]> {
    // Discover target repositories
    const repos = await this.repoDiscovery.discover(
      this.config.organization,
      this.config.repositories
    );

    // Clone repositories
    const repoPaths = await this.repoCloner.cloneMultiple(repos);

    // Extract patterns from all repositories
    const allPatterns: Pattern[] = [];
    for (const [repoName, repoPath] of repoPaths) {
      const patterns = await this.patternDetector.extractPatterns(repoPath);
      allPatterns.push(...patterns);
    }

    // Find similar patterns
    const matches = await this.patternDetector.findSimilarPatterns(
      pattern,
      allPatterns
    );

    return matches;
  }

  async applyRefactoring(matches: Match[]): Promise<Result[]> {
    const results: Result[] = [];

    for (const match of matches) {
      try {
        const refactoring = await this.refactorEngine.generateRefactoring(match);
        this.stateStore.saveRefactoring(refactoring);

        if (!this.config.refactoring.dryRun) {
          const result = await this.refactorEngine.applyRefactoring(refactoring);
          results.push(result);
        }
      } catch (error) {
        console.error(`Failed to refactor ${match.targetRepo.fullName}:`, error);
      }
    }

    return results;
  }

  async coordinatePRs(results: Result[]): Promise<PR[]> {
    if (this.config.refactoring.dryRun) {
      console.log('Dry run mode: PRs not created');
      return [];
    }

    return await this.prCoordinator.createCoordinatedPRs(results);
  }

  async executeWorkflow(sourceRepo: string, pattern: Pattern): Promise<PR[]> {
    console.log('Step 1: Detecting similar patterns...');
    const matches = await this.detectPatterns(pattern);
    console.log(`Found ${matches.length} matches`);

    console.log('Step 2: Applying refactoring...');
    const results = await this.applyRefactoring(matches);
    console.log(`Applied refactoring to ${results.length} repositories`);

    console.log('Step 3: Creating coordinated PRs...');
    const prs = await this.coordinatePRs(results);
    console.log(`Created ${prs.length} PRs`);

    return prs;
  }
}
```

## Implementation Timeline

### Week 1-2: Foundation
- Set up monorepo structure
- Create type definitions
- Configure build tools and CI/CD

### Week 3: Storage & Configuration
- Implement ConfigManager
- Implement StateStore
- Implement CacheDB

### Week 4: Platform Abstraction
- Implement GitPlatformAdapter interface
- Implement GitHub provider
- Implement GitLab provider
- Implement Bitbucket provider (optional)

### Week 5: Repository Management
- Implement RepositoryDiscovery
- Implement RepositoryCloner
- Implement cache management

### Week 6-7: AI/ML Services
- Implement EmbeddingService
- Implement SemanticMatcher
- Implement AI refactor generator
- Test with various code patterns

### Week 8: Core Orchestrator
- Implement RefactorOrchestrator
- Implement PatternDetector
- Implement RefactorEngine
- Implement PRCoordinator

### Week 9: CLI Tool
- Implement CLI commands
- Add interactive UI
- Add progress reporting

### Week 10: VS Code Extension
- Create extension scaffold
- Implement commands
- Create UI components
- Add webviews for visualization

### Week 11-12: Testing & Documentation
- Write comprehensive tests
- Create documentation
- Add examples
- Performance optimization

## Next Steps

1. Review and approve this implementation plan
2. Set up the initial project structure
3. Begin Phase 1 implementation
4. Establish coding standards and review process
5. Set up continuous integration

Would you like me to proceed with creating the actual code base, or would you like to modify any part of this plan?