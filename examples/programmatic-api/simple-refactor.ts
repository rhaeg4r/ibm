/**
 * Simple programmatic API example
 * Shows how to use the library in your own code
 */

import { createPlatformAdapter } from '@cross-repo-refactor/platform';
import { createRepositoryManager } from '@cross-repo-refactor/repository';
import {
  createPatternDetector,
  createDefaultDetectionConfig,
  createDefaultAIConfig,
} from '@cross-repo-refactor/pattern-detection';
import { createRefactoringEngine } from '@cross-repo-refactor/refactoring';

async function refactorAcrossRepos() {
  // 1. Setup
  const platform = createPlatformAdapter({
    platform: 'github',
    token: process.env.GITHUB_TOKEN!,
    tokenType: 'personal',
  });

  await platform.authenticate();

  // 2. Get repositories
  const repos = await platform.listRepositories('my-org');
  console.log(`Found ${repos.length} repositories`);

  // 3. Setup managers
  const repoManager = createRepositoryManager({
    cache: {
      baseDir: './.cache/repos',
      maxSize: 2048,
      maxAge: 14,
      cleanupInterval: 24,
    },
    workspace: {
      rootDir: './workspace',
      repositories: repos,
      parallel: 3,
    },
  });

  const detector = createPatternDetector(
    {
      ai: createDefaultAIConfig('local'),
      detection: createDefaultDetectionConfig(),
    },
    repoManager.workspace
  );

  const engine = createRefactoringEngine(repoManager.workspace);

  // 4. Clone repos
  await repoManager.cloner.cloneMany(repos.slice(0, 5), {
    depth: 1,
    token: process.env.GITHUB_TOKEN,
  });

  // 5. Detect patterns
  const result = await detector.detectInRepositories(repos.slice(0, 5));
  console.log(`Found ${result.matches.length} similar patterns`);

  // 6. Apply refactoring
  if (result.matches.length > 0) {
    const batchResult = await engine.applyBatchRefactoring(
      result.matches,
      'function-to-arrow',
      { dryRun: false, validate: true }
    );

    console.log('Refactoring complete:', engine.getStatistics(batchResult));

    // 7. Create PRs
    for (const match of result.matches) {
      const branchName = 'refactor/arrow-functions';
      
      await repoManager.workspace.createBranch(
        match.targetRepo,
        branchName,
        'main'
      );

      await repoManager.workspace.commit(
        match.targetRepo,
        'refactor: convert to arrow functions'
      );

      await repoManager.workspace.push(match.targetRepo, branchName);

      const pr = await platform.createPR(match.targetRepo.id, {
        title: 'Refactor: Convert to arrow functions',
        description: 'Automated refactoring',
        sourceBranch: branchName,
        targetBranch: 'main',
      });

      console.log(`Created PR: ${pr.url}`);
    }
  }

  // Cleanup
  repoManager.dispose();
}

refactorAcrossRepos().catch(console.error);

// Made with Bob
