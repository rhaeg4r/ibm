import * as vscode from 'vscode';
import { RefactorResultsProvider } from '../views/RefactorResultsProvider';

export async function applyRefactoring(
  context: vscode.ExtensionContext,
  results: RefactorResultsProvider
): Promise<void> {
  // TODO: Implement refactoring application
  vscode.window.showInformationMessage('Apply Refactoring - Coming soon!');
}

// Made with Bob
