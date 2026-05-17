/**
 * GitLab Platform Provider
 * Supports Personal Access Tokens, OAuth tokens, and CI/CD tokens for automated workflows
 */

import { Gitlab } from '@gitbeaker/rest';
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

export class GitLabProvider extends GitPlatformAdapter {
  private gitlab: InstanceType<typeof Gitlab>;
  private currentUser: { id: number; username: string } | null = null;
  private logger = createLogger('GitLabProvider');

  constructor(credentials: Credentials) {
    super(credentials);
    
    // Initialize GitLab client with appropriate configuration
    this.gitlab = new Gitlab({
      token: credentials.token,
      host: credentials.url || 'https://gitlab.com',
      // CI/CD tokens may have different permissions, handle accordingly
      camelize: true,
    });
  }

  /**
   * Authenticate with GitLab
   * Supports:
   * - Personal Access Tokens (PAT)
   * - OAuth tokens
   * - CI/CD tokens (Job tokens, Pipeline tokens)
   * - Deploy tokens
   */
  async authenticate(): Promise<void> {
    try {
      // For CI/CD tokens, we may not be able to get user info
      // Try to get current user, but don't fail if it's a CI/CD token
      if (this.credentials.tokenType === 'ci-cd') {
        // CI/CD tokens have limited scope, verify by attempting a simple API call
        try {
          const projects = await this.gitlab.Projects.all({ perPage: 1 });
          this.authenticated = true;
          this.logger.info('Authenticated with GitLab using CI/CD token');
        } catch (error) {
          this.handleError(error, 'CI/CD token authentication failed');
        }
      } else {
        // For PAT and OAuth tokens, get user information
        const user = await (this.gitlab.Users as any).current();
        this.currentUser = {
          id: user.id,
          username: user.username,
        };
        this.authenticated = true;
        this.logger.info(`Authenticated with GitLab as ${user.username}`);
      }
    } catch (error) {
      this.handleError(error, 'GitLab authentication failed');
    }
  }

  async verifyAuthentication(): Promise<boolean> {
    try {
      if (this.credentials.tokenType === 'ci-cd') {
        // For CI/CD tokens, verify with a simple API call
        await this.gitlab.Projects.all({ perPage: 1 });
      } else {
        await (this.gitlab.Users as any).current();
      }
      return true;
    } catch {
      return false;
    }
  }

  async listRepositories(org: string, page: number = 1): Promise<Repository[]> {
    try {
      // In GitLab, 'org' can be a group or namespace
      const projects = await (this.gitlab.Groups as any).projects(org, {
        perPage: 100,
        page,
        includeSubgroups: true,
        archived: false,
      });

      return projects.map((project: any) => this.mapProjectToRepository(project));
    } catch (error) {
      this.handleError(error, `Failed to list repositories for group ${org}`);
    }
  }

  async getRepository(fullName: string): Promise<Repository> {
    try {
      // GitLab uses project ID or path with namespace
      const project = await this.gitlab.Projects.show(fullName);
      return this.mapProjectToRepository(project);
    } catch (error) {
      this.handleError(error, `Failed to get repository ${fullName}`);
    }
  }

  async createBranch(repo: string, branch: string, from: string): Promise<void> {
    try {
      await this.gitlab.Branches.create(repo, branch, from);
    } catch (error) {
      this.handleError(error, `Failed to create branch ${branch} in ${repo}`);
    }
  }

  async branchExists(repo: string, branch: string): Promise<boolean> {
    try {
      await this.gitlab.Branches.show(repo, branch);
      return true;
    } catch {
      return false;
    }
  }

  async deleteBranch(repo: string, branch: string): Promise<void> {
    try {
      await this.gitlab.Branches.remove(repo, branch);
    } catch (error) {
      this.handleError(error, `Failed to delete branch ${branch} in ${repo}`);
    }
  }

  async createPR(repo: string, config: PRConfig): Promise<PR> {
    try {
      const mr = await this.gitlab.MergeRequests.create(
        repo,
        config.sourceBranch,
        config.targetBranch,
        config.title,
        {
          description: config.description,
          labels: config.labels?.join(','),
          assigneeIds: config.assignees?.map((a: string) => parseInt(a, 10)),
          reviewerIds: config.reviewers?.map((r: string) => parseInt(r, 10)),
          removeSourceBranch: true,
          squash: false,
        }
      );

      const repository = await this.getRepository(repo);

      return {
        id: String((mr as any).id),
        repository,
        number: (mr as any).iid,
        url: (mr as any).webUrl,
        title: (mr as any).title,
        description: (mr as any).description || '',
        branch: config.sourceBranch,
        targetBranch: config.targetBranch,
        status: this.mapMRState((mr as any).state),
        linkedPRs: [],
        labels: config.labels,
        reviewers: config.reviewers,
        createdAt: new Date((mr as any).createdAt),
        updatedAt: new Date((mr as any).updatedAt),
      };
    } catch (error) {
      this.handleError(error, `Failed to create merge request in ${repo}`);
    }
  }

  async updatePR(repo: string, prNumber: number, updates: Partial<PRConfig>): Promise<void> {
    try {
      await this.gitlab.MergeRequests.edit(repo, prNumber, {
        title: updates.title,
        description: updates.description,
        labels: updates.labels?.join(','),
        assigneeIds: updates.assignees?.map((a: string) => parseInt(a, 10)),
        reviewerIds: updates.reviewers?.map((r: string) => parseInt(r, 10)),
      });
    } catch (error) {
      this.handleError(error, `Failed to update merge request !${prNumber} in ${repo}`);
    }
  }

  async getPR(repo: string, prNumber: number): Promise<PR> {
    try {
      const mr = await this.gitlab.MergeRequests.show(repo, prNumber);
      const repository = await this.getRepository(repo);

      return {
        id: String((mr as any).id),
        repository,
        number: (mr as any).iid,
        url: (mr as any).webUrl,
        title: (mr as any).title,
        description: (mr as any).description || '',
        branch: (mr as any).sourceBranch,
        targetBranch: (mr as any).targetBranch,
        status: this.mapMRState((mr as any).state),
        linkedPRs: [],
        createdAt: new Date((mr as any).createdAt),
        updatedAt: new Date((mr as any).updatedAt),
        mergedAt: (mr as any).mergedAt ? new Date((mr as any).mergedAt) : undefined,
      };
    } catch (error) {
      this.handleError(error, `Failed to get merge request !${prNumber} in ${repo}`);
    }
  }

  async linkPRs(prs: PR[]): Promise<void> {
    try {
      // Update each MR description to include links to related MRs
      for (const pr of prs) {
        const linkedMRs = prs
          .filter((p) => p.id !== pr.id)
          .map((p) => `- ${p.repository.fullName}!${p.number} - ${p.url}`)
          .join('\n');

        const updatedDescription = `${pr.description}\n\n## Related Merge Requests\n\nThis refactoring is part of a coordinated change across multiple repositories:\n\n${linkedMRs}`;

        await this.updatePR(pr.repository.fullName, pr.number, {
          description: updatedDescription,
        });
      }
    } catch (error) {
      this.handleError(error, 'Failed to link merge requests');
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
      const branchInfo = await this.gitlab.Branches.show(repo, branch);
      return branchInfo.commit.id;
    } catch (error) {
      this.handleError(error, `Failed to get latest commit for ${repo}:${branch}`);
    }
  }

  async getRateLimit(): Promise<{ limit: number; remaining: number; reset: Date }> {
    // GitLab doesn't have a direct rate limit API like GitHub
    // Return a default value or implement custom tracking
    return {
      limit: 600, // GitLab default: 600 requests per minute
      remaining: 600,
      reset: new Date(Date.now() + 60000),
    };
  }

  /**
   * Map GitLab project to Repository type
   */
  private mapProjectToRepository(project: any): Repository {
    return {
      id: project.id.toString(),
      name: project.name,
      fullName: project.pathWithNamespace,
      url: project.webUrl,
      cloneUrl: project.httpUrlToRepo,
      defaultBranch: project.defaultBranch || 'main',
      language: this.detectLanguage(project),
      lastActivity: new Date(project.lastActivityAt),
      metadata: {
        visibility: project.visibility,
        archived: project.archived,
        forksCount: project.forksCount,
        starsCount: project.starCount,
      },
    };
  }

  /**
   * Detect primary language from project
   */
  private detectLanguage(project: any): string {
    // GitLab doesn't provide primary language directly
    // Use tags or default to 'unknown'
    if (project.topics && project.topics.length > 0) {
      const languageTags = ['javascript', 'typescript', 'python', 'go', 'java', 'ruby'];
      const found = project.topics.find((tag: string) =>
        languageTags.includes(tag.toLowerCase())
      );
      if (found) return found.toLowerCase();
    }
    return 'unknown';
  }

  /**
   * Map GitLab MR state to PR status
   */
  private mapMRState(state: string): PRStatus {
    switch (state) {
      case 'opened':
        return 'open';
      case 'merged':
        return 'merged';
      case 'closed':
        return 'closed';
      default:
        return 'open';
    }
  }

  /**
   * Get CI/CD pipeline status for a merge request
   * Useful when using CI/CD tokens to verify pipeline execution
   */
  async getPipelineStatus(repo: string, mrNumber: number): Promise<string> {
    try {
      const mr = await this.gitlab.MergeRequests.show(repo, mrNumber);
      return (mr as any).headPipeline?.status || 'unknown';
    } catch (error) {
      this.handleError(error, `Failed to get pipeline status for !${mrNumber} in ${repo}`);
    }
  }

  /**
   * Trigger a pipeline for a merge request
   * Useful in CI/CD workflows
   */
  async triggerPipeline(repo: string, branch: string): Promise<void> {
    try {
      await this.gitlab.Pipelines.create(repo, branch);
    } catch (error) {
      this.handleError(error, `Failed to trigger pipeline for ${repo}:${branch}`);
    }
  }
}

// Made with Bob
