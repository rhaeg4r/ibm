/**
 * Code transformer - applies refactoring transformations
 */

import jscodeshift, { API, FileInfo, Options } from 'jscodeshift';
import { createPatch } from 'diff';
import { Match, Refactoring, Repository } from '@cross-repo-refactor/core';
import { WorkspaceManager } from '@cross-repo-refactor/repository';
import { TransformOptions, TransformResult, RefactoringContext, StrategyTemplate } from '../types';
import { StrategyRegistry } from '../strategies/StrategyRegistry';

export class CodeTransformer {
  private workspace: WorkspaceManager;
  private strategyRegistry: StrategyRegistry;

  constructor(workspace: WorkspaceManager, strategyRegistry: StrategyRegistry) {
    this.workspace = workspace;
    this.strategyRegistry = strategyRegistry;
  }

  /**
   * Apply transformation to a match
   */
  async transform(
    match: Match,
    strategyId: string,
    options: TransformOptions = {}
  ): Promise<TransformResult> {
    try {
      // Get strategy
      const strategy = this.strategyRegistry.get(strategyId);
      if (!strategy) {
        throw new Error(`Strategy not found: ${strategyId}`);
      }

      // Read target file
      const targetRepo = match.targetRepo;
      const filePath = match.targetLocation.filePath;
      const originalCode = await this.workspace.readFile(targetRepo, filePath);

      // Create refactoring context
      const context: RefactoringContext = {
        match,
        targetCode: originalCode,
        sourceCode: match.pattern.code,
        filePath,
        language: match.pattern.language,
      };

      // Apply transformation
      const transformedCode = await this.applyStrategy(strategy, context);

      // Generate diff
      const diff = createPatch(
        filePath,
        originalCode,
        transformedCode,
        'original',
        'refactored'
      );

      // Create refactoring object
      const refactoring: Refactoring = {
        id: `refactor-${Date.now()}`,
        match,
        strategy: {
          type: 'transform',
          description: strategy.description,
          rules: [],
        },
        originalCode,
        refactoredCode: transformedCode,
        diff,
        validated: false,
        createdAt: new Date(),
      };

      // Validate if requested
      if (options.validate) {
        const validationResults = await this.validate(refactoring);
        refactoring.validationResults = validationResults;
        refactoring.validated = validationResults.every(r => r.passed);
      }

      // Apply changes if not dry run
      if (!options.dryRun) {
        // Create backup if requested
        if (options.createBackup) {
          await this.createBackup(targetRepo, filePath, originalCode);
        }

        // Write transformed code
        await this.workspace.writeFile(targetRepo, filePath, transformedCode);
        refactoring.appliedAt = new Date();
      }

      return {
        success: true,
        refactoring,
        diff,
      };
    } catch (error) {
      return {
        success: false,
        refactoring: {} as Refactoring,
        diff: '',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Apply transformation using jscodeshift
   */
  async transformWithJSCodeshift(
    match: Match,
    transformFunction: (fileInfo: FileInfo, api: API, options: Options) => string,
    options: TransformOptions = {}
  ): Promise<TransformResult> {
    try {
      const targetRepo = match.targetRepo;
      const filePath = match.targetLocation.filePath;
      const originalCode = await this.workspace.readFile(targetRepo, filePath);

      // Create jscodeshift API
      const j = jscodeshift.withParser('tsx');
      const api: API = {
        jscodeshift: j,
        j,
        stats: () => {},
        report: () => {},
      };

      // Apply transformation
      const fileInfo: FileInfo = {
        path: filePath,
        source: originalCode,
      };

      const transformedCode = transformFunction(fileInfo, api, {});

      // Generate diff
      const diff = createPatch(
        filePath,
        originalCode,
        transformedCode || originalCode,
        'original',
        'refactored'
      );

      // Create refactoring object
      const refactoring: Refactoring = {
        id: `refactor-${Date.now()}`,
        match,
        strategy: {
          type: 'transform',
          description: 'JSCodeshift transformation',
          rules: [],
        },
        originalCode,
        refactoredCode: transformedCode || originalCode,
        diff,
        validated: false,
        createdAt: new Date(),
      };

      // Apply changes if not dry run
      if (!options.dryRun && transformedCode) {
        await this.workspace.writeFile(targetRepo, filePath, transformedCode);
        refactoring.appliedAt = new Date();
      }

      return {
        success: true,
        refactoring,
        diff,
      };
    } catch (error) {
      return {
        success: false,
        refactoring: {} as Refactoring,
        diff: '',
        error: (error as Error).message,
      };
    }
  }

  /**
   * Apply strategy transformation
   */
  private async applyStrategy(
    strategy: StrategyTemplate,
    context: RefactoringContext
  ): Promise<string> {
    // Extract the code section to transform
    const { startLine, endLine } = context.match.targetLocation;
    const lines = context.targetCode.split('\n');
    
    const beforeCode = lines.slice(0, startLine - 1).join('\n');
    const codeToTransform = lines.slice(startLine - 1, endLine).join('\n');
    const afterCode = lines.slice(endLine).join('\n');

    // Apply transformation
    const transformedSection = strategy.transform(codeToTransform, context);

    // Reconstruct the file
    const parts = [beforeCode, transformedSection, afterCode].filter(p => p.length > 0);
    return parts.join('\n');
  }

  /**
   * Validate refactoring
   */
  private async validate(refactoring: Refactoring): Promise<any[]> {
    const results: any[] = [];

    // Syntax validation
    try {
      jscodeshift(refactoring.refactoredCode);
      results.push({
        rule: { type: 'syntax', required: true },
        passed: true,
        message: 'Syntax is valid',
      });
    } catch (error) {
      results.push({
        rule: { type: 'syntax', required: true },
        passed: false,
        message: `Syntax error: ${(error as Error).message}`,
      });
    }

    return results;
  }

  /**
   * Create backup of file
   */
  private async createBackup(
    repository: Repository,
    filePath: string,
    content: string
  ): Promise<void> {
    const backupPath = `${filePath}.backup-${Date.now()}`;
    await this.workspace.writeFile(repository, backupPath, content);
  }

  /**
   * Rollback transformation
   */
  async rollback(refactoring: Refactoring): Promise<void> {
    const targetRepo = refactoring.match.targetRepo;
    const filePath = refactoring.match.targetLocation.filePath;
    
    await this.workspace.writeFile(
      targetRepo,
      filePath,
      refactoring.originalCode
    );
  }
}

// Made with Bob
