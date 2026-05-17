/**
 * Validation service for refactored code
 */

import { Repository, ValidationResult, ValidationRule } from '@cross-repo-refactor/core';
import { WorkspaceManager } from '@cross-repo-refactor/repository';
import { ValidationConfig } from '../types';
import { execaCommand } from 'execa';

export class ValidationService {
  private workspace: WorkspaceManager;

  constructor(workspace: WorkspaceManager) {
    this.workspace = workspace;
  }

  /**
   * Validate refactored code
   */
  async validate(
    repository: Repository,
    config: ValidationConfig
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Get repository path
    const repoPath = await this.workspace.getRepositoryPath(repository);
    if (!repoPath) {
      throw new Error(`Repository not found: ${repository.fullName}`);
    }

    // Syntax validation
    if (config.syntax) {
      const syntaxResult = await this.validateSyntax(repoPath, config.timeout);
      results.push(syntaxResult);
    }

    // Build validation
    if (config.build) {
      const buildResult = await this.validateBuild(repoPath, config.timeout);
      results.push(buildResult);
    }

    // Test validation
    if (config.tests) {
      const testResult = await this.validateTests(repoPath, config.timeout);
      results.push(testResult);
    }

    // Linting validation
    if (config.linting) {
      const lintResult = await this.validateLinting(repoPath, config.timeout);
      results.push(lintResult);
    }

    return results;
  }

  /**
   * Validate syntax
   */
  private async validateSyntax(repoPath: string, timeout: number): Promise<ValidationResult> {
    const rule: ValidationRule = {
      type: 'syntax',
      required: true,
      timeout,
    };

    try {
      // Try to compile TypeScript
      await execaCommand('npx tsc --noEmit', {
        cwd: repoPath,
        timeout: timeout * 1000,
      });

      return {
        rule,
        passed: true,
        message: 'Syntax validation passed',
      };
    } catch (error: any) {
      return {
        rule,
        passed: false,
        message: 'Syntax validation failed',
        output: error.stderr || error.message,
      };
    }
  }

  /**
   * Validate build
   */
  private async validateBuild(repoPath: string, timeout: number): Promise<ValidationResult> {
    const rule: ValidationRule = {
      type: 'build',
      required: true,
      timeout,
    };

    try {
      // Try to build the project
      await execaCommand('npm run build', {
        cwd: repoPath,
        timeout: timeout * 1000,
      });

      return {
        rule,
        passed: true,
        message: 'Build validation passed',
      };
    } catch (error: any) {
      return {
        rule,
        passed: false,
        message: 'Build validation failed',
        output: error.stderr || error.message,
      };
    }
  }

  /**
   * Validate tests
   */
  private async validateTests(repoPath: string, timeout: number): Promise<ValidationResult> {
    const rule: ValidationRule = {
      type: 'test',
      required: true,
      timeout,
    };

    try {
      // Run tests
      await execaCommand('npm test', {
        cwd: repoPath,
        timeout: timeout * 1000,
      });

      return {
        rule,
        passed: true,
        message: 'Test validation passed',
      };
    } catch (error: any) {
      return {
        rule,
        passed: false,
        message: 'Test validation failed',
        output: error.stderr || error.message,
      };
    }
  }

  /**
   * Validate linting
   */
  private async validateLinting(repoPath: string, timeout: number): Promise<ValidationResult> {
    const rule: ValidationRule = {
      type: 'custom',
      command: 'npm run lint',
      required: false,
      timeout,
    };

    try {
      // Run linter
      await execaCommand('npm run lint', {
        cwd: repoPath,
        timeout: timeout * 1000,
      });

      return {
        rule,
        passed: true,
        message: 'Linting validation passed',
      };
    } catch (error: any) {
      return {
        rule,
        passed: false,
        message: 'Linting validation failed',
        output: error.stderr || error.message,
      };
    }
  }
}

// Made with Bob
