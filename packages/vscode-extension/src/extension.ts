/**
 * VS Code Extension Entry Point
 * Cross-Repo Refactor Coordinator
 */

import * as vscode from 'vscode';
import { RefactorExplorerProvider } from './views/RefactorExplorerProvider';
import { RefactorResultsProvider } from './views/RefactorResultsProvider';
import { scanRepository } from './commands/scanRepository';
import { detectPatterns } from './commands/detectPatterns';
import { applyRefactoring } from './commands/applyRefactoring';
import { createPRs } from './commands/createPRs';
import { configure } from './commands/configure';

export function activate(context: vscode.ExtensionContext) {
  console.log('Cross-Repo Refactor Coordinator is now active!');

  // Register tree view providers
  const refactorExplorer = new RefactorExplorerProvider(context);
  const refactorResults = new RefactorResultsProvider(context);

  vscode.window.registerTreeDataProvider('refactorExplorer', refactorExplorer);
  vscode.window.registerTreeDataProvider('refactorResults', refactorResults);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('cross-repo-refactor.scanRepository', () =>
      scanRepository(context, refactorExplorer)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cross-repo-refactor.detectPatterns', () =>
      detectPatterns(context, refactorExplorer)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cross-repo-refactor.applyRefactoring', () =>
      applyRefactoring(context, refactorResults)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cross-repo-refactor.createPRs', () =>
      createPRs(context, refactorResults)
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cross-repo-refactor.configure', () => configure(context))
  );

  // Show welcome message
  vscode.window.showInformationMessage(
    'Cross-Repo Refactor Coordinator activated! Use Command Palette to get started.'
  );
}

export function deactivate() {
  console.log('Cross-Repo Refactor Coordinator deactivated');
}

// Made with Bob
