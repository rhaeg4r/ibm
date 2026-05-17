/**
 * TypeScript/JavaScript parser using Babel
 */

import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { BaseParser } from './BaseParser';
import { CodeNode } from '../types';

export class TypeScriptParser extends BaseParser {
  constructor() {
    super('typescript', ['.ts', '.tsx', '.js', '.jsx']);
  }

  async parse(code: string, filePath: string): Promise<CodeNode[]> {
    const nodes: CodeNode[] = [];

    try {
      // Parse with Babel
      const ast = parse(code, {
        sourceType: 'module',
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'objectRestSpread',
          'asyncGenerators',
          'dynamicImport',
          'optionalChaining',
          'nullishCoalescingOperator',
        ],
      });

      // Traverse AST and extract patterns
      traverse(ast, {
        // Extract functions
        FunctionDeclaration: (path) => {
          const node = this.extractFunctionNode(path.node, code, filePath);
          if (node) nodes.push(node);
        },

        // Extract arrow functions assigned to variables
        VariableDeclarator: (path) => {
          if (t.isArrowFunctionExpression(path.node.init) || 
              t.isFunctionExpression(path.node.init)) {
            const node = this.extractVariableFunctionNode(path.node, code, filePath);
            if (node) nodes.push(node);
          }
        },

        // Extract classes
        ClassDeclaration: (path) => {
          const node = this.extractClassNode(path.node, code, filePath);
          if (node) nodes.push(node);
        },

        // Extract methods
        ClassMethod: (path) => {
          const node = this.extractMethodNode(path.node, code, filePath);
          if (node) nodes.push(node);
        },

        // Extract imports
        ImportDeclaration: (path) => {
          const node = this.extractImportNode(path.node, code, filePath);
          if (node) nodes.push(node);
        },
      });
    } catch (error) {
      console.error(`Failed to parse ${filePath}:`, error);
    }

    return nodes;
  }

  private extractFunctionNode(node: t.FunctionDeclaration, code: string, _filePath: string): CodeNode | null {
    if (!node.loc || !node.id) return null;

    const startLine = node.loc.start.line;
    const endLine = node.loc.end.line;
    const functionCode = this.extractCode(code, startLine, endLine);

    return {
      type: 'function',
      name: node.id.name,
      startLine,
      endLine,
      code: functionCode,
      children: [],
      metadata: {
        async: node.async,
        generator: node.generator,
        params: node.params.length,
        complexity: this.calculateComplexity(functionCode),
      },
    };
  }

  private extractVariableFunctionNode(node: t.VariableDeclarator, code: string, _filePath: string): CodeNode | null {
    if (!node.loc || !t.isIdentifier(node.id)) return null;

    const startLine = node.loc.start.line;
    const endLine = node.loc.end.line;
    const functionCode = this.extractCode(code, startLine, endLine);

    const init = node.init as t.ArrowFunctionExpression | t.FunctionExpression;

    return {
      type: 'function',
      name: node.id.name,
      startLine,
      endLine,
      code: functionCode,
      children: [],
      metadata: {
        async: init.async,
        arrow: t.isArrowFunctionExpression(init),
        params: init.params.length,
        complexity: this.calculateComplexity(functionCode),
      },
    };
  }

  private extractClassNode(node: t.ClassDeclaration, code: string, filePath: string): CodeNode | null {
    if (!node.loc || !node.id) return null;

    const startLine = node.loc.start.line;
    const endLine = node.loc.end.line;
    const classCode = this.extractCode(code, startLine, endLine);

    // Extract methods as children
    const methods: CodeNode[] = [];
    for (const member of node.body.body) {
      if (t.isClassMethod(member) && member.loc) {
        const methodNode = this.extractMethodNode(member, code, filePath);
        if (methodNode) methods.push(methodNode);
      }
    }

    return {
      type: 'class',
      name: node.id.name,
      startLine,
      endLine,
      code: classCode,
      children: methods,
      metadata: {
        superClass: node.superClass ? 'extends' : null,
        methods: methods.length,
        complexity: this.calculateComplexity(classCode),
      },
    };
  }

  private extractMethodNode(node: t.ClassMethod, code: string, _filePath: string): CodeNode | null {
    if (!node.loc || !t.isIdentifier(node.key)) return null;

    const startLine = node.loc.start.line;
    const endLine = node.loc.end.line;
    const methodCode = this.extractCode(code, startLine, endLine);

    return {
      type: 'method',
      name: node.key.name,
      startLine,
      endLine,
      code: methodCode,
      children: [],
      metadata: {
        kind: node.kind,
        static: node.static,
        async: node.async,
        params: node.params.length,
        complexity: this.calculateComplexity(methodCode),
      },
    };
  }

  private extractImportNode(node: t.ImportDeclaration, code: string, _filePath: string): CodeNode | null {
    if (!node.loc) return null;

    const startLine = node.loc.start.line;
    const endLine = node.loc.end.line;
    const importCode = this.extractCode(code, startLine, endLine);

    return {
      type: 'import',
      name: node.source.value,
      startLine,
      endLine,
      code: importCode,
      children: [],
      metadata: {
        source: node.source.value,
        specifiers: node.specifiers.length,
      },
    };
  }
}

// Made with Bob
