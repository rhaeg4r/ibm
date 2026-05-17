/**
 * Refactoring engine types
 */

import { Match, Refactoring, ValidationResult } from '@cross-repo-refactor/core';

export interface TransformOptions {
  dryRun?: boolean;
  validate?: boolean;
  createBackup?: boolean;
  skipTests?: boolean;
}

export interface TransformResult {
  success: boolean;
  refactoring: Refactoring;
  diff: string;
  error?: string;
  validationResults?: ValidationResult[];
}

export interface BatchTransformResult {
  successful: TransformResult[];
  failed: TransformResult[];
  statistics: {
    total: number;
    successful: number;
    failed: number;
    filesModified: number;
    linesAdded: number;
    linesRemoved: number;
  };
}

export interface StrategyTemplate {
  name: string;
  description: string;
  language: string;
  transform: (code: string, context: any) => string;
  validate?: (code: string) => boolean;
}

export interface RefactoringContext {
  match: Match;
  targetCode: string;
  sourceCode: string;
  filePath: string;
  language: string;
}

export interface ValidationConfig {
  syntax: boolean;
  build: boolean;
  tests: boolean;
  linting: boolean;
  timeout: number; // in seconds
}

export interface RollbackPoint {
  id: string;
  timestamp: Date;
  refactorings: Refactoring[];
  files: Map<string, string>; // filePath -> original content
}

// Made with Bob
