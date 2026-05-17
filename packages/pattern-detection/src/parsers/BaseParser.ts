/**
 * Base parser interface for code analysis
 */

import { CodeNode } from '../types';

export abstract class BaseParser {
  protected language: string;
  protected extensions: string[];

  constructor(language: string, extensions: string[]) {
    this.language = language;
    this.extensions = extensions;
  }

  /**
   * Parse source code and extract code nodes
   */
  abstract parse(code: string, filePath: string): Promise<CodeNode[]>;

  /**
   * Check if file is supported by this parser
   */
  supportsFile(filePath: string): boolean {
    return this.extensions.some(ext => filePath.endsWith(ext));
  }

  /**
   * Get language name
   */
  getLanguage(): string {
    return this.language;
  }

  /**
   * Extract code snippet from source
   */
  protected extractCode(code: string, startLine: number, endLine: number): string {
    const lines = code.split('\n');
    return lines.slice(startLine - 1, endLine).join('\n');
  }

  /**
   * Calculate code complexity (simple heuristic)
   */
  protected calculateComplexity(code: string): number {
    // Simple complexity based on control flow keywords
    const keywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch'];
    let complexity = 1;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Extract dependencies from code
   */
  protected extractDependencies(code: string): string[] {
    const dependencies: string[] = [];
    
    // Match import statements (JavaScript/TypeScript)
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      dependencies.push(match[1]);
    }

    // Match require statements (JavaScript)
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requireRegex.exec(code)) !== null) {
      dependencies.push(match[1]);
    }

    return [...new Set(dependencies)];
  }

  /**
   * Normalize code (remove comments, extra whitespace)
   */
  protected normalizeCode(code: string): string {
    // Remove single-line comments
    code = code.replace(/\/\/.*$/gm, '');
    
    // Remove multi-line comments
    code = code.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove extra whitespace
    code = code.replace(/\s+/g, ' ').trim();
    
    return code;
  }
}

// Made with Bob
