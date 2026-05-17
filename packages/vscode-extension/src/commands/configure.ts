import * as vscode from 'vscode';

export async function configure(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration('crossRepoRefactor');
  
  const platform = await vscode.window.showQuickPick(['github', 'gitlab', 'bitbucket'], {
    placeHolder: 'Select your Git platform',
  });

  if (platform) {
    await config.update('platform.type', platform, vscode.ConfigurationTarget.Global);
  }

  const org = await vscode.window.showInputBox({
    prompt: 'Enter your organization/group name',
    placeHolder: 'my-organization',
  });

  if (org) {
    await config.update('organization', org, vscode.ConfigurationTarget.Global);
  }

  vscode.window.showInformationMessage('Configuration updated!');
}

// Made with Bob
