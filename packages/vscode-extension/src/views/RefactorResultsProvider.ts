import * as vscode from 'vscode';
import { Refactoring, Result, PR } from '@cross-repo-refactor/core';

export interface PRResult {
  repository: { name: string };
  success: boolean;
  pr?: PR;
  error?: { message: string };
}

export class RefactorResultsProvider implements vscode.TreeDataProvider<ResultItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ResultItem | undefined | null | void> = new vscode.EventEmitter<ResultItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ResultItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private refactorings: Refactoring[] = [];
  private prResults: PRResult[] = [];

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setRefactorings(refactorings: Refactoring[]): void {
    this.refactorings = refactorings;
    this.refresh();
  }

  setPRResults(results: PRResult[]): void {
    this.prResults = results;
    this.refresh();
  }

  getTreeItem(element: ResultItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ResultItem): Thenable<ResultItem[]> {
    if (!element) {
      // Root level
      const items: ResultItem[] = [];
      
      if (this.refactorings.length > 0) {
        items.push(new ResultItem(
          'Refactorings',
          vscode.TreeItemCollapsibleState.Expanded,
          'category'
        ));
      }
      
      if (this.prResults.length > 0) {
        items.push(new ResultItem(
          'Pull Requests',
          vscode.TreeItemCollapsibleState.Expanded,
          'category'
        ));
      }

      return Promise.resolve(items);
    }

    if (element.contextValue === 'category') {
      if (element.label === 'Refactorings') {
        return Promise.resolve(
          this.refactorings.map(refactoring => new ResultItem(
            `${refactoring.match.targetRepo.name}`,
            vscode.TreeItemCollapsibleState.Collapsed,
            'refactoring',
            refactoring
          ))
        );
      } else if (element.label === 'Pull Requests') {
        return Promise.resolve(
          this.prResults.map(pr => new ResultItem(
            `${pr.repository.name}: ${pr.success ? '✓' : '✗'}`,
            vscode.TreeItemCollapsibleState.Collapsed,
            'pr',
            pr
          ))
        );
      }
    }

    if (element.contextValue === 'refactoring' && element.data) {
      const refactoring = element.data as Refactoring;
      const items: ResultItem[] = [
        new ResultItem(
          `Pattern: ${refactoring.match.pattern.id}`,
          vscode.TreeItemCollapsibleState.None,
          'info'
        ),
        new ResultItem(
          `Strategy: ${refactoring.strategy.type}`,
          vscode.TreeItemCollapsibleState.None,
          'info'
        ),
        new ResultItem(
          `Validated: ${refactoring.validated ? 'Yes' : 'No'}`,
          vscode.TreeItemCollapsibleState.None,
          'info'
        ),
      ];

      return Promise.resolve(items);
    }

    if (element.contextValue === 'pr' && element.data) {
      const pr = element.data as PRResult;
      const items: ResultItem[] = [];

      if (pr.success && pr.pr) {
        items.push(new ResultItem(
          `PR #${pr.pr.number}`,
          vscode.TreeItemCollapsibleState.None,
          'info'
        ));
        items.push(new ResultItem(
          `URL: ${pr.pr.url}`,
          vscode.TreeItemCollapsibleState.None,
          'link',
          pr.pr.url
        ));
      } else if (pr.error) {
        items.push(new ResultItem(
          `Error: ${pr.error.message}`,
          vscode.TreeItemCollapsibleState.None,
          'error'
        ));
      }

      return Promise.resolve(items);
    }

    return Promise.resolve([]);
  }
}

class ResultItem extends vscode.TreeItem {
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
      case 'refactoring':
        this.iconPath = new vscode.ThemeIcon('git-branch');
        break;
      case 'pr':
        this.iconPath = new vscode.ThemeIcon('git-pull-request');
        break;
      case 'file':
        this.iconPath = new vscode.ThemeIcon('file');
        break;
      case 'link':
        this.iconPath = new vscode.ThemeIcon('link-external');
        this.command = {
          command: 'vscode.open',
          title: 'Open PR',
          arguments: [vscode.Uri.parse(data)]
        };
        break;
      case 'error':
        this.iconPath = new vscode.ThemeIcon('error');
        break;
      case 'info':
        this.iconPath = new vscode.ThemeIcon('info');
        break;
      case 'changes':
        this.iconPath = new vscode.ThemeIcon('diff');
        break;
    }

    // Add tooltip
    if (data) {
      if (contextValue === 'refactoring') {
        this.tooltip = `Repository: ${data.match.targetRepo.name}\nStrategy: ${data.strategy.type}`;
      } else if (contextValue === 'pr') {
        this.tooltip = data.success ? 'PR created successfully' : `Failed: ${data.error?.message}`;
      }
    }
  }
}

// Made with Bob
