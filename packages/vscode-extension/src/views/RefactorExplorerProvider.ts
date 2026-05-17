import * as vscode from 'vscode';
import { Repository, Pattern } from '@cross-repo-refactor/core';

export class RefactorExplorerProvider implements vscode.TreeDataProvider<RefactorItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<RefactorItem | undefined | null | void> = new vscode.EventEmitter<RefactorItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<RefactorItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private repositories: Repository[] = [];
  private patterns: Pattern[] = [];

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setRepositories(repositories: Repository[]): void {
    this.repositories = repositories;
    this.refresh();
  }

  setPatterns(patterns: Pattern[]): void {
    this.patterns = patterns;
    this.refresh();
  }

  getTreeItem(element: RefactorItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: RefactorItem): Thenable<RefactorItem[]> {
    if (!element) {
      // Root level - show repositories and patterns
      const items: RefactorItem[] = [];
      
      if (this.repositories.length > 0) {
        items.push(new RefactorItem(
          'Repositories',
          vscode.TreeItemCollapsibleState.Expanded,
          'category'
        ));
      }
      
      if (this.patterns.length > 0) {
        items.push(new RefactorItem(
          'Detected Patterns',
          vscode.TreeItemCollapsibleState.Expanded,
          'category'
        ));
      }

      return Promise.resolve(items);
    }

    if (element.contextValue === 'category') {
      if (element.label === 'Repositories') {
        return Promise.resolve(
          this.repositories.map(repo => new RefactorItem(
            repo.name,
            vscode.TreeItemCollapsibleState.None,
            'repository',
            repo
          ))
        );
      } else if (element.label === 'Detected Patterns') {
        return Promise.resolve(
          this.patterns.map(pattern => new RefactorItem(
            pattern.metadata.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            'pattern',
            pattern
          ))
        );
      }
    }

    if (element.contextValue === 'pattern' && element.data) {
      const pattern = element.data as Pattern;
      return Promise.resolve([
        new RefactorItem(
          `Type: ${pattern.metadata.type}`,
          vscode.TreeItemCollapsibleState.None,
          'info'
        ),
        new RefactorItem(
          `Language: ${pattern.language}`,
          vscode.TreeItemCollapsibleState.None,
          'info'
        ),
        new RefactorItem(
          `File: ${pattern.context.filePath}`,
          vscode.TreeItemCollapsibleState.None,
          'info'
        ),
      ]);
    }

    return Promise.resolve([]);
  }
}

class RefactorItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string,
    public readonly data?: any
  ) {
    super(label, collapsibleState);

    // Set icons based on context
    switch (contextValue) {
      case 'category':
        this.iconPath = new vscode.ThemeIcon('folder');
        break;
      case 'repository':
        this.iconPath = new vscode.ThemeIcon('repo');
        break;
      case 'pattern':
        this.iconPath = new vscode.ThemeIcon('symbol-class');
        break;
      case 'info':
        this.iconPath = new vscode.ThemeIcon('info');
        break;
    }

    // Add tooltip
    if (data) {
      if (contextValue === 'repository') {
        this.tooltip = `${data.url}\nBranch: ${data.defaultBranch}`;
      } else if (contextValue === 'pattern') {
        this.tooltip = `${data.description || 'No description'}`;
      }
    }
  }
}

// Made with Bob
