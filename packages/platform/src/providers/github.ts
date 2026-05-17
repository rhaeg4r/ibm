/**
 * GitHub Platform Provider
 * Supports Personal Access Tokens, OAuth tokens, and GitHub App tokens
 */

import { Octokit } from '@octokit/rest';
import { GitPlatformAdapter } from '../adapter/GitPlatformAdapter';
import { createLogger } from '../utils/logger';
import {
  Repository,
  Credentials,
  PR,
  PRConfig,
  PRStatus,
  PlatformError,
} from '@cross-repo-refactor/core';

export class GitHubProvider extends GitPlatformAdapter {
  private octokit: Octokit;
  private currentUser: { login: string; id: number } | null = null;
  private logger = createLogger('GitHubProvider');

  constructor(credentials: Credentials) {
    super(credentials);

    this.octokit = new Octokit({
      auth: credentials.token,
      baseUrl: credentials.url || 'https://api.github.com',
      userAgent: 'cross-repo-refactor/0.1.0',
    });
  }

  async authenticate(): Promise<void> {
    try {
      const { data: user } = await this.octokit.users.getAuthenticated();
      this.currentUser = {
        login: user.login,
        id: user.id,
      };
      this.authenticated = true;
      this.logger.info(`Authenticated with GitHub as ${user.login}`);
    } catch (error) {
      this.handleError(error, 'GitHub authentication failed');
    }
  }

  async verifyAuthentication(): Promise<boolean> {
    try {
      await this.octokit.users.getAuthenticated();
      return true;
    } catch {
      return false;
    }
  }

  async listRepositories(org: string, page: number = 1): Promise<Repository[]> {
    try {
      const { data: repos } = await this.octokit.repos.listForOrg({
        org,
        per_page: 100,
        page,
        type: 'all',
      });

      return repos.map((repo: any) => this.mapRepoToRepository(repo));
    } catch (error) {
      this.handleError(error, `Failed to list repositories for organization ${org}`);
    }
  }

  async getRepository(fullName: string): Promise<Repository> {
    try {
      const { owner, repo } = this.validateRepoName(fullName);
      const { data } = await this.octokit.repos.get({ owner, repo });
      return this.mapRepoToRepository(data);
    } catch (error) {
      this.handleError(error, `Failed to get repository ${fullName}`);
    }
  }

  async createBranch(repo: string, branch: string, from: string): Promise<void> {
    try {
      const { owner, repo: repoName } = this.validateRepoName(repo);

      // Get the SHA of the source branch
      const { data: ref } = await this.octokit.git.getRef({
        owner,
        repo: repoName,
        ref: `heads/${from}`,
      });

      // Create new branch
      await this.octokit.git.createRef({
        owner,
        repo: repoName,
        ref: `refs/heads/${branch}`,
        sha: ref.object.sha,
      });
    } catch (error) {
      this.handleError(error, `Failed to create branch ${branch} in ${repo}`);
    }
  }

  async branchExists(repo: string, branch: string): Promise<boolean> {
    try {
      const { owner, repo: repoName } = this.validateRepoName(repo);
      await this.octokit.git.getRef({
        owner,
        repo: repoName,
        ref: `heads/${branch}`,
      });
      return true;
    } catch {
      return false;
    }
  }

  async deleteBranch(repo: string, branch: string): Promise<void> {
    try {
      const { owner, repo: repoName } = this.validateRepoName(repo);
      await this.octokit.git.deleteRef({
        owner,
        repo: repoName,
        ref: `heads/${branch}`,
      });
    } catch (error) {
      this.handleError(error, `Failed to delete branch ${branch} in ${repo}`);
    }
  }

  async createPR(repo: string, config: PRConfig): Promise<PR> {
    try {
      const { owner, repo: repoName } = this.validateRepoName(repo);

      const { data: pr } = await this.octokit.pulls.create({
        owner,
        repo: repoName,
        title: config.title,
        body: config.description,
        head: config.sourceBranch,
        base: config.targetBranch,
        draft: config.draft,
      });

      // Add labels if provided
      if (config.labels && config.labels.length > 0) {
        await this.octokit.issues.addLabels({
          owner,
          repo: repoName,
          issue_number: pr.number,
          labels: config.labels,
        });
      }

      // Request reviewers if provided
      if (config.reviewers && config.reviewers.length > 0) {
        await this.octokit.pulls.requestReviewers({
          owner,
          repo: repoName,
          pull_number: pr.number,
          reviewers: config.reviewers,
        });
      }

      // Add assignees if provided
      if (config.assignees && config.assignees.length > 0) {
        await this.octokit.issues.addAssignees({
          owner,
          repo: repoName,
          issue_number: pr.number,
          assignees: config.assignees,
        });
      }

      const repository = await this.getRepository(repo);

      return {
        id: pr.id.toString(),
        repository,
        number: pr.number,
        url: pr.html_url,
        title: pr.title,
        description: pr.body || '',
        branch: config.sourceBranch,
        targetBranch: config.targetBranch,
        status: this.mapPRState(pr.state, pr.merged_at),
        linkedPRs: [],
        labels: config.labels,
        reviewers: config.reviewers,
        createdAt: new Date(pr.created_at),
        updatedAt: new Date(pr.updated_at),
      };
    } catch (error) {
      this.handleError(error, `Failed to create pull request in ${repo}`);
    }
  }

  async updatePR(repo: string, prNumber: number, updates: Partial<PRConfig>): Promise<void> {
    try {
      const { owner, repo: repoName } = this.validateRepoName(repo);

      await this.octokit.pulls.update({
        owner,
        repo: repoName,
        pull_number: prNumber,
        title: updates.title,
        body: updates.description,
      });

      // Update labels if provided
      if (updates.labels) {
        await this.octokit.issues.setLabels({
          owner,
          repo: repoName,
          issue_number: prNumber,
          labels: updates.labels,
        });
      }
    } catch (error) {
      this.handleError(error, `Failed to update pull request #${prNumber} in ${repo}`);
    }
  }

  async getPR(repo: string, prNumber: number): Promise<PR> {
    try {
      const { owner, repo: repoName } = this.validateRepoName(repo);
      const { data: pr } = await this.octokit.pulls.get({
        owner,
        repo: repoName,
        pull_number: prNumber,
      });

      const repository = await this.getRepository(repo);

      return {
        id: pr.id.toString(),
        repository,
        number: pr.number,
        url: pr.html_url,
        title: pr.title,
        description: pr.body || '',
        branch: pr.head.ref,
        targetBranch: pr.base.ref,
        status: this.mapPRState(pr.state, pr.merged_at),
        linkedPRs: [],
        createdAt: new Date(pr.created_at),
        updatedAt: new Date(pr.updated_at),
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : undefined,
      };
    } catch (error) {
      this.handleError(error, `Failed to get pull request #${prNumber} in ${repo}`);
    }
  }

  async linkPRs(prs: PR[]): Promise<void> {
    try {
      // Update each PR description to include links to related PRs
      for (const pr of prs) {
        const linkedPRs = prs
          .filter((p) => p.id !== pr.id)
          .map((p) => `- ${p.repository.fullName}#${p.number} - ${p.url}`)
          .join('\n');

        const updatedDescription = `${pr.description}\n\n## Related Pull Requests\n\nThis refactoring is part of a coordinated change across multiple repositories:\n\n${linkedPRs}`;

        await this.updatePR(pr.repository.fullName, pr.number, {
          description: updatedDescription,
        });
      }
    } catch (error) {
      this.handleError(error, 'Failed to link pull requests');
    }
  }

  async getDefaultBranch(repo: string): Promise<string> {
    try {
      const repository = await this.getRepository(repo);
      return repository.defaultBranch;
    } catch (error) {
      this.handleError(error, `Failed to get default branch for ${repo}`);
    }
  }

  async getLatestCommit(repo: string, branch: string): Promise<string> {
    try {
      const { owner, repo: repoName } = this.validateRepoName(repo);
      const { data: ref } = await this.octokit.git.getRef({
        owner,
        repo: repoName,
        ref: `heads/${branch}`,
      });
      return ref.object.sha;
    } catch (error) {
      this.handleError(error, `Failed to get latest commit for ${repo}:${branch}`);
    }
  }

  async getRateLimit(): Promise<{ limit: number; remaining: number; reset: Date }> {
    try {
      const { data } = await this.octokit.rateLimit.get();
      return {
        limit: data.rate.limit,
        remaining: data.rate.remaining,
        reset: new Date(data.rate.reset * 1000),
      };
    } catch (error) {
      this.handleError(error, 'Failed to get rate limit information');
    }
  }

  /**
   * Map GitHub repository to Repository type
   */
  private mapRepoToRepository(repo: any): Repository {
    return {
      id: repo.id.toString(),
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      defaultBranch: repo.default_branch,
      language: repo.language || 'unknown',
      lastActivity: new Date(repo.updated_at),
      metadata: {
        private: repo.private,
        archived: repo.archived,
        forksCount: repo.forks_count,
        starsCount: repo.stargazers_count,
        openIssuesCount: repo.open_issues_count,
      },
    };
  }

  /**
   * Map GitHub PR state to PR status
   */
  private mapPRState(state: string, mergedAt: string | null): PRStatus {
    if (mergedAt) return 'merged';
    if (state === 'open') return 'open';
    if (state === 'closed') return 'closed';
    return 'open';
  }
}

// Made with Bob
