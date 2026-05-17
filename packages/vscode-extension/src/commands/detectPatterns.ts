import * as vscode from 'vscode';
import { RefactorExplorerProvider } from '../views/RefactorExplorerProvider';

export async function detectPatterns(
  context: vscode.ExtensionContext,
  explorer: RefactorExplorerProvider
): Promise<void> {
  // TODO: Implement pattern detection across repositories
  vscode.window.showInformationMessage('Detect Patterns - Coming soon!');
}

// Made with Bob
