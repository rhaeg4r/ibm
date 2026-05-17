/**
 * Strategy registry for refactoring strategies
 */

import { RefactorStrategy, RefactorType } from '@cross-repo-refactor/core';
import { StrategyTemplate } from '../types';

export class StrategyRegistry {
  private strategies: Map<string, StrategyTemplate> = new Map();

  constructor() {
    this.registerBuiltInStrategies();
  }

  /**
   * Register a custom strategy
   */
  register(id: string, template: StrategyTemplate): void {
    this.strategies.set(id, template);
  }

  /**
   * Get strategy by ID
   */
  get(id: string): StrategyTemplate | undefined {
    return this.strategies.get(id);
  }

  /**
   * Get all strategies for a language
   */
  getByLanguage(language: string): StrategyTemplate[] {
    return Array.from(this.strategies.values()).filter(
      s => s.language === language || s.language === 'any'
    );
  }

  /**
   * List all registered strategies
   */
  list(): StrategyTemplate[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Create a RefactorStrategy from a template
   */
  createStrategy(templateId: string, type: RefactorType): RefactorStrategy | null {
    const template = this.get(templateId);
    if (!template) {
      return null;
    }

    return {
      type,
      description: template.description,
      rules: [],
      validation: [],
    };
  }

  /**
   * Register built-in strategies
   */
  private registerBuiltInStrategies(): void {
    // Strategy: Convert function to arrow function
    this.register('function-to-arrow', {
      name: 'Function to Arrow Function',
      description: 'Convert traditional function to arrow function',
      language: 'typescript',
      transform: (code: string) => {
        // Simple regex-based transformation
        return code.replace(
          /function\s+(\w+)\s*\((.*?)\)\s*{/g,
          'const $1 = ($2) => {'
        );
      },
      validate: (code: string) => {
        return code.includes('=>');
      },
    });

    // Strategy: Add async/await
    this.register('callback-to-async', {
      name: 'Callback to Async/Await',
      description: 'Convert callback-based code to async/await',
      language: 'typescript',
      transform: (code: string) => {
        // This is a simplified example
        return code.replace(
          /\.then\((.*?)\)/g,
          'await $1'
        );
      },
    });

    // Strategy: Rename variable
    this.register('rename-variable', {
      name: 'Rename Variable',
      description: 'Rename a variable throughout the code',
      language: 'any',
      transform: (code: string, context: any) => {
        const { oldName, newName } = context;
        const regex = new RegExp(`\\b${oldName}\\b`, 'g');
        return code.replace(regex, newName);
      },
    });

    // Strategy: Extract method
    this.register('extract-method', {
      name: 'Extract Method',
      description: 'Extract code block into a separate method',
      language: 'typescript',
      transform: (code: string, context: any) => {
        const { methodName, extractedCode } = context;
        return `${code}\n\nfunction ${methodName}() {\n  ${extractedCode}\n}`;
      },
    });

    // Strategy: Add type annotations
    this.register('add-types', {
      name: 'Add Type Annotations',
      description: 'Add TypeScript type annotations',
      language: 'typescript',
      transform: (code: string) => {
        // Add basic type annotations
        return code.replace(
          /function\s+(\w+)\s*\((.*?)\)/g,
          (_match, name, params) => {
            const typedParams = params
              .split(',')
              .map((p: string) => `${p.trim()}: any`)
              .join(', ');
            return `function ${name}(${typedParams}): any`;
          }
        );
      },
    });

    // Strategy: Remove console.log
    this.register('remove-console', {
      name: 'Remove Console Statements',
      description: 'Remove console.log statements',
      language: 'typescript',
      transform: (code: string) => {
        return code.replace(/console\.(log|debug|info|warn|error)\(.*?\);?\n?/g, '');
      },
      validate: (code: string) => {
        return !code.includes('console.');
      },
    });

    // Strategy: Update import paths
    this.register('update-imports', {
      name: 'Update Import Paths',
      description: 'Update import paths to new location',
      language: 'typescript',
      transform: (code: string, context: any) => {
        const { oldPath, newPath } = context;
        return code.replace(
          new RegExp(`from ['"]${oldPath}['"]`, 'g'),
          `from '${newPath}'`
        );
      },
    });

    // Strategy: Convert var to const/let
    this.register('var-to-const-let', {
      name: 'Convert var to const/let',
      description: 'Replace var declarations with const or let',
      language: 'typescript',
      transform: (code: string) => {
        // Simple heuristic: use const if not reassigned
        return code.replace(/\bvar\b/g, 'const');
      },
    });

    // Strategy: Add error handling
    this.register('add-try-catch', {
      name: 'Add Try-Catch',
      description: 'Wrap code in try-catch block',
      language: 'typescript',
      transform: (code: string) => {
        return `try {\n  ${code}\n} catch (error) {\n  console.error('Error:', error);\n  throw error;\n}`;
      },
    });

    // Strategy: Modernize syntax
    this.register('modernize-syntax', {
      name: 'Modernize Syntax',
      description: 'Update to modern JavaScript/TypeScript syntax',
      language: 'typescript',
      transform: (code: string) => {
        let result = code;
        
        // Object shorthand
        result = result.replace(/{\s*(\w+):\s*\1\s*}/g, '{ $1 }');
        
        // Template literals
        result = result.replace(/'([^']*?)'\s*\+\s*(\w+)\s*\+\s*'([^']*?)'/g, '`$1${$2}$3`');
        
        return result;
      },
    });
  }
}

// Made with Bob
