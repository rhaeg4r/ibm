import * as vscode from 'vscode';
import { RefactorResultsProvider } from '../views/RefactorResultsProvider';

export async function createPRs(
  context: vscode.ExtensionContext,
  results: RefactorResultsProvider
): Promise<void> {
  // TODO: Implement PR creation
  vscode.window.showInformationMessage('Create PRs - Coming soon!');
}

// Made with Bob
