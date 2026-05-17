/**
 * Core type definitions for Cross-Repo Refactor Coordinator
 */

// ============================================================================
// Repository Types
// ============================================================================

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  language: string;
  lastActivity: Date;
  metadata?: Record<string, unknown>;
}

export interface RepositoryConfig {
  include: string[];
  exclude: string[];
  filters: {
    languages: string[];
    minActivity?: string;
    maxSize?: string;
    archived?: boolean;
  };
}

// ============================================================================
// Pattern Types
// ============================================================================

export type PatternType = 'function' | 'class' | 'import' | 'config' | 'custom';

export interface CodeContext {
  filePath: string;
  startLine: number;
  endLine: number;
  surroundingCode: string;
  fullContent?: string;
}

export interface PatternMetadata {
  type: PatternType;
  name: string;
  description?: string;
  tags: string[];
  complexity?: number;
  dependencies?: string[];
}

export interface Pattern {
  id: string;
  code: string;
  language: string;
  context: CodeContext;
  metadata: PatternMetadata;
  repository?: Repository;
  createdAt: Date;
}

// ============================================================================
// AI/ML Types
// ============================================================================

export interface Embedding {
  vector: number[];
  model: string;
  dimension: number;
  normalized?: boolean;
}

export interface Match {
  pattern: Pattern;
  targetRepo: Repository;
  targetLocation: CodeContext;
  similarity: number;
  confidence: number;
  reasoning?: string;
}

export interface AIConfig {
  embeddingModel: string;
  similarityThreshold: number;
  provider: 'local' | 'openai' | 'anthropic' | 'custom';
  apiKey?: string;
  apiUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

// ============================================================================
// Refactoring Types
// ============================================================================

export type RefactorType = 'replace' | 'transform' | 'remove' | 'add' | 'rename';

export interface RefactorRule {
  condition: string;
  action: string;
  parameters: Record<string, unknown>;
  priority?: number;
}

export interface RefactorStrategy {
  type: RefactorType;
  description: string;
  template?: string;
  rules: RefactorRule[];
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'syntax' | 'build' | 'test' | 'custom';
  command?: string;
  timeout?: number;
  required: boolean;
}

export interface Refactoring {
  id: string;
  match: Match;
  strategy: RefactorStrategy;
  originalCode: string;
  refactoredCode: string;
  diff: string;
  validated: boolean;
  validationResults?: ValidationResult[];
  createdAt: Date;
  appliedAt?: Date;
}

export interface ValidationResult {
  rule: ValidationRule;
  passed: boolean;
  message?: string;
  output?: string;
}

// ============================================================================
// Result Types
// ============================================================================

export type ResultStatus = 'success' | 'failed' | 'pending' | 'skipped';

export interface Result {
  id: string;
  refactoring: Refactoring;
  repository: Repository;
  branch: string;
  status: ResultStatus;
  error?: string;
  commitSha?: string;
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================================
// PR/MR Types
// ============================================================================

export type PRStatus = 'open' | 'merged' | 'closed' | 'draft';

export interface PR {
  id: string;
  repository: Repository;
  number: number;
  url: string;
  title: string;
  description: string;
  branch: string;
  targetBranch: string;
  status: PRStatus;
  linkedPRs: string[];
  labels?: string[];
  reviewers?: string[];
  createdAt: Date;
  updatedAt?: Date;
  mergedAt?: Date;
}

export interface PRConfig {
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  labels?: string[];
  reviewers?: string[];
  assignees?: string[];
  draft?: boolean;
  autoMerge?: boolean;
}

// ============================================================================
// Platform Types
// ============================================================================

export type PlatformType = 'github' | 'gitlab' | 'bitbucket' | 'azure-devops';

export type TokenType = 'personal' | 'oauth' | 'ci-cd' | 'app';

export interface Credentials {
  platform: PlatformType;
  token: string;
  tokenType: TokenType;
  url?: string;
  username?: string;
  expiresAt?: Date;
}

export interface PlatformConfig {
  type: PlatformType;
  url: string;
  token: string;
  tokenType: TokenType;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  timeout?: number;
  retries?: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface RefactoringConfig {
  dryRun: boolean;
  autoApply: boolean;
  branchPrefix: string;
  prTemplate: string;
  commitMessageTemplate?: string;
  maxConcurrency?: number;
  validation?: {
    enabled: boolean;
    rules: ValidationRule[];
  };
}

export interface CacheConfig {
  directory: string;
  maxSize: string;
  ttl: number;
  cleanupInterval?: number;
  compression?: boolean;
}

export interface Config {
  platform: PlatformConfig;
  organization: string;
  repositories: RepositoryConfig;
  ai: AIConfig;
  refactoring: RefactoringConfig;
  cache: CacheConfig;
  logging?: LoggingConfig;
  webhooks?: WebhookConfig[];
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  file?: string;
  console: boolean;
  format?: 'json' | 'text';
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
}

// ============================================================================
// Operation Types
// ============================================================================

export interface Operation {
  id: string;
  type: 'scan' | 'detect' | 'refactor' | 'apply' | 'propose';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface OperationProgress {
  operation: Operation;
  current: number;
  total: number;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Error Types
// ============================================================================

export class RefactorError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RefactorError';
  }
}

export class PlatformError extends RefactorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'PLATFORM_ERROR', details);
    this.name = 'PlatformError';
  }
}

export class ValidationError extends RefactorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AIError extends RefactorError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AI_ERROR', details);
    this.name = 'AIError';
  }
}

// ============================================================================
// Event Types
// ============================================================================

export type EventType =
  | 'operation:started'
  | 'operation:progress'
  | 'operation:completed'
  | 'operation:failed'
  | 'pattern:detected'
  | 'match:found'
  | 'refactoring:applied'
  | 'pr:created'
  | 'pr:merged'
  | 'error';

export interface Event {
  type: EventType;
  timestamp: Date;
  data: unknown;
  operationId?: string;
}

export type EventHandler = (event: Event) => void | Promise<void>;

// ============================================================================
// Utility Types
// ============================================================================

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface Filter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'regex';
  value: unknown;
}

export interface Sort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryOptions {
  filters?: Filter[];
  sort?: Sort[];
  page?: number;
  pageSize?: number;
}

// Made with Bob
