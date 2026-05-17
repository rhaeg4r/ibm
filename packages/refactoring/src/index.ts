/**
 * Refactoring engine package
 * Exports all public APIs
 */

export * from './types';
export { StrategyRegistry } from './strategies/StrategyRegistry';
export { CodeTransformer } from './transformer/CodeTransformer';
export { ValidationService } from './validation/ValidationService';
export { RefactoringEngine } from './engine/RefactoringEngine';

// Factory function for easy setup
import { WorkspaceManager } from '@cross-repo-refactor/repository';
import { RefactoringEngine } from './engine/RefactoringEngine';

/**
 * Create a refactoring engine
 */
export function createRefactoringEngine(workspace: WorkspaceManager): RefactoringEngine {
  return new RefactoringEngine(workspace);
}

// Made with Bob
