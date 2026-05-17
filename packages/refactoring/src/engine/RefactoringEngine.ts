/**
 * Refactoring engine - orchestrates the refactoring process
 */

import { Match, Repository } from '@cross-repo-refactor/core';
import { WorkspaceManager } from '@cross-repo-refactor/repository';
import { TransformOptions, TransformResult, BatchTransformResult } from '../types';
import { CodeTransformer } from '../transformer/CodeTransformer';
import { StrategyRegistry } from '../strategies/StrategyRegistry';
import { ValidationService } from '../validation/ValidationService';

export class RefactoringEngine {
  private transformer: CodeTransformer;
  private validator: ValidationService;
  private strategyRegistry: StrategyRegistry;

  constructor(workspace: WorkspaceManager) {
    this.strategyRegistry = new StrategyRegistry();
    this.transformer = new CodeTransformer(workspace, this.strategyRegistry);
    this.validator = new ValidationService(workspace);
  }

  /**
   * Apply refactoring to a single match
   */
  async applyRefactoring(
    match: Match,
    strategyId: string,
    options: TransformOptions = {}
  ): Promise<TransformResult> {
    console.log(`Applying refactoring: ${strategyId} to ${match.targetRepo.name}`);
    
    const result = await this.transformer.transform(match, strategyId, options);
    
    if (result.success) {
      console.log(`✓ Successfully applied refactoring to ${match.targetLocation.filePath}`);
    } else {
      console.error(`✗ Failed to apply refactoring: ${result.error}`);
    }
    
    return result;
  }

  /**
   * Apply refactoring to multiple matches
   */
  async applyBatchRefactoring(
    matches: Match[],
    strategyId: string,
    options: TransformOptions = {}
  ): Promise<BatchTransformResult> {
    const successful: TransformResult[] = [];
    const failed: TransformResult[] = [];
    let filesModified = 0;
    let linesAdded = 0;
    let linesRemoved = 0;

    console.log(`Starting batch refactoring: ${matches.length} matches`);

    for (const match of matches) {
      const result = await this.applyRefactoring(match, strategyId, options);
      
      if (result.success) {
        successful.push(result);
        filesModified++;
        
        // Count lines changed
        const diffLines = result.diff.split('\n');
        linesAdded += diffLines.filter(l => l.startsWith('+')).length;
        linesRemoved += diffLines.filter(l => l.startsWith('-')).length;
      } else {
        failed.push(result);
      }
    }

    console.log(`\nBatch refactoring complete:`);
    console.log(`  Successful: ${successful.length}`);
    console.log(`  Failed: ${failed.length}`);
    console.log(`  Files modified: ${filesModified}`);
    console.log(`  Lines added: ${linesAdded}`);
    console.log(`  Lines removed: ${linesRemoved}`);

    return {
      successful,
      failed,
      statistics: {
        total: matches.length,
        successful: successful.length,
        failed: failed.length,
        filesModified,
        linesAdded,
        linesRemoved,
      },
    };
  }

  /**
   * Preview refactoring without applying
   */
  async previewRefactoring(
    match: Match,
    strategyId: string
  ): Promise<TransformResult> {
    return await this.applyRefactoring(match, strategyId, { dryRun: true });
  }

  /**
   * Validate refactoring
   */
  async validateRefactoring(
    repository: Repository,
    options: { syntax?: boolean; build?: boolean; tests?: boolean } = {}
  ): Promise<boolean> {
    console.log(`Validating refactoring in ${repository.name}...`);
    
    const results = await this.validator.validate(repository, {
      syntax: options.syntax ?? true,
      build: options.build ?? false,
      tests: options.tests ?? false,
      linting: false,
      timeout: 300,
    });

    const allPassed = results.every(r => r.passed);
    
    if (allPassed) {
      console.log(`✓ All validations passed`);
    } else {
      console.error(`✗ Some validations failed:`);
      results.filter(r => !r.passed).forEach(r => {
        console.error(`  - ${r.rule.type}: ${r.message}`);
      });
    }

    return allPassed;
  }

  /**
   * Rollback refactoring
   */
  async rollback(result: TransformResult): Promise<void> {
    console.log(`Rolling back refactoring...`);
    await this.transformer.rollback(result.refactoring);
    console.log(`✓ Rollback complete`);
  }

  /**
   * Get strategy registry
   */
  getStrategyRegistry(): StrategyRegistry {
    return this.strategyRegistry;
  }

  /**
   * List available strategies
   */
  listStrategies(): string[] {
    return this.strategyRegistry.list().map(s => `${s.name} (${s.language})`);
  }

  /**
   * Get refactoring statistics
   */
  getStatistics(result: BatchTransformResult): string {
    const { statistics } = result;
    const successRate = ((statistics.successful / statistics.total) * 100).toFixed(1);
    
    return `
Refactoring Statistics:
  Total matches: ${statistics.total}
  Successful: ${statistics.successful} (${successRate}%)
  Failed: ${statistics.failed}
  Files modified: ${statistics.filesModified}
  Lines added: ${statistics.linesAdded}
  Lines removed: ${statistics.linesRemoved}
  Net change: ${statistics.linesAdded - statistics.linesRemoved} lines
    `.trim();
  }
}

// Made with Bob
