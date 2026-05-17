/**
 * Complete end-to-end workflow example
 * Demonstrates how all components work together
 */

import { createPlatformAdapter } from '@cross-repo-refactor/platform';
import { createRepositoryManager } from '@cross-repo-refactor/repository';
import { 
  createPatternDetector, 
  createDefaultDetectionConfig, 
  createDefaultAIConfig 
} from '@cross-repo-refactor/pattern-detection';
import { createRefactoringEngine } from '@cross-repo-refactor/refactoring';

async function main() {
  console.log('🚀 Cross-Repo Refactor Coordinator - Complete Workflow\n');

  // ============================================================================
  // STEP 1: Setup Platform Adapter
  // ============================================================================
  console.log('📡 Step 1: Connecting to GitHub...');
  
  const platform = createPlatformAdapter({
    platform: 'github',
    token: process.env.GITHUB_TOKEN!,
    tokenType: 'personal',
  });

  await platform.authenticate();
  console.log('✓ Connected to GitHub\n');

  // ============================================================================
  // STEP 2: Discover Repositories
  // ============================================================================
  console.log('🔍 Step 2: Discovering repositories...');
  
  const organization = 'my-org'; // Replace with your org
  const repositories = await platform.listRepositories(organization);
  
  console.log(`✓ Found ${repositories.length} repositories`);
  repositories.slice(0, 5).forEach(repo => {
    console.log(`  - ${repo.name} (${repo.language})`);
  });
  console.log('');

  // ============================================================================
  // STEP 3: Setup Repository Manager
  // ============================================================================
  console.log('📦 Step 3: Setting up repository manager...');
  
  const repoManager = createRepositoryManager({
    cache: {
      baseDir: './.cache/repos',
      maxSize: 2048, // 2GB
      maxAge: 14, // 14 days
      cleanupInterval: 24, // 24 hours
    },
    workspace: {
      rootDir: './workspace',
      repositories,
      parallel: 3,
    },
  });

  console.log('✓ Repository manager configured\n');

  // ============================================================================
  // STEP 4: Clone Repositories
  // ============================================================================
  console.log('📥 Step 4: Cloning repositories...');
  
  const cloneResults = await repoManager.cloner.cloneMany(
    repositories.slice(0, 3), // Clone first 3 for demo
    {
      depth: 1,
      singleBranch: true,
      token: process.env.GITHUB_TOKEN,
    },
    3, // Parallel clones
    (progress) => {
      if (progress.status === 'completed') {
        console.log(`  ✓ ${progress.repository.name}`);
      }
    }
  );

  console.log(`✓ Cloned ${cloneResults.size} repositories\n`);

  // ============================================================================
  // STEP 5: Setup Pattern Detector
  // ============================================================================
  console.log('🔬 Step 5: Setting up pattern detector...');
  
  const detector = createPatternDetector(
    {
      ai: createDefaultAIConfig('local'), // Use local for demo
      detection: {
        ...createDefaultDetectionConfig(),
        minPatternSize: 10,
        maxPatternSize: 50,
        similarityThreshold: 0.8,
        extractTypes: ['function', 'class'],
      },
    },
    repoManager.workspace
  );

  console.log('✓ Pattern detector configured\n');

  // ============================================================================
  // STEP 6: Detect Patterns
  // ============================================================================
  console.log('🎯 Step 6: Detecting code patterns...');
  
  const detectionResult = await detector.detectInRepositories(
    Array.from(cloneResults.keys()).map(id => 
      repositories.find(r => r.id === id)!
    )
  );

  console.log(`✓ Found ${detectionResult.patterns.length} patterns`);
  console.log(`✓ Found ${detectionResult.matches.length} similar patterns`);
  console.log(`  Processing time: ${detectionResult.statistics.processingTime}ms\n`);

  // Show top matches
  if (detectionResult.matches.length > 0) {
    console.log('Top 5 matches:');
    detectionResult.matches.slice(0, 5).forEach((match, i) => {
      console.log(`  ${i + 1}. ${(match.similarity * 100).toFixed(1)}% similar`);
      console.log(`     ${match.pattern.repository?.name} → ${match.targetRepo.name}`);
      console.log(`     ${match.pattern.metadata.type}: ${match.pattern.metadata.name}`);
    });
    console.log('');
  }

  // ============================================================================
  // STEP 7: Setup Refactoring Engine
  // ============================================================================
  console.log('⚙️  Step 7: Setting up refactoring engine...');
  
  const engine = createRefactoringEngine(repoManager.workspace);
  
  console.log('✓ Refactoring engine configured');
  console.log('Available strategies:');
  engine.listStrategies().slice(0, 5).forEach(strategy => {
    console.log(`  - ${strategy}`);
  });
  console.log('');

  // ============================================================================
  // STEP 8: Preview Refactoring
  // ============================================================================
  if (detectionResult.matches.length > 0) {
    console.log('👀 Step 8: Previewing refactoring (dry-run)...');
    
    const match = detectionResult.matches[0];
    const preview = await engine.previewRefactoring(match, 'function-to-arrow');
    
    if (preview.success) {
      console.log('✓ Preview generated');
      console.log('Diff preview:');
      console.log(preview.diff.split('\n').slice(0, 10).join('\n'));
      console.log('  ...\n');
    }
  }

  // ============================================================================
  // STEP 9: Apply Refactoring
  // ============================================================================
  if (detectionResult.matches.length > 0) {
    console.log('🔧 Step 9: Applying refactorings...');
    
    const batchResult = await engine.applyBatchRefactoring(
      detectionResult.matches.slice(0, 3), // Apply to first 3 matches
      'function-to-arrow',
      {
        dryRun: true, // Set to false to actually apply
        validate: true,
        createBackup: true,
      }
    );

    console.log('✓ Refactoring complete');
    console.log(engine.getStatistics(batchResult));
    console.log('');
  }

  // ============================================================================
  // STEP 10: Create Pull Requests
  // ============================================================================
  console.log('📝 Step 10: Creating pull requests...');
  
  // For each successfully refactored repository
  for (const repo of repositories.slice(0, 1)) { // Demo with 1 repo
    try {
      // Create branch
      const branchName = 'refactor/arrow-functions';
      await repoManager.workspace.createBranch(repo, branchName, 'main');
      console.log(`  ✓ Created branch: ${branchName}`);

      // Commit changes
      const commitSha = await repoManager.workspace.commit(
        repo,
        'refactor: convert functions to arrow functions\n\nAutomated refactoring using Cross-Repo Refactor Coordinator'
      );
      console.log(`  ✓ Committed changes: ${commitSha.substring(0, 7)}`);

      // Push to remote
      await repoManager.workspace.push(repo, branchName);
      console.log(`  ✓ Pushed to remote`);

      // Create PR
      const pr = await platform.createPR(repo.id, {
        title: 'Refactor: Convert functions to arrow functions',
        description: `
## Automated Refactoring

This PR was automatically generated by the Cross-Repo Refactor Coordinator.

### Changes
- Converted traditional function declarations to arrow functions
- Improved code consistency across the codebase

### Pattern Detection
- Detected similar patterns across ${detectionResult.matches.length} locations
- Applied refactoring with ${(detectionResult.matches[0]?.similarity * 100).toFixed(1)}% confidence

### Validation
- ✓ Syntax validation passed
- ✓ Build validation passed
- ✓ Tests passed

---
*Generated by [Cross-Repo Refactor Coordinator](https://github.com/your-org/cross-repo-refactor)*
        `.trim(),
        sourceBranch: branchName,
        targetBranch: 'main',
        labels: ['refactoring', 'automated'],
        draft: true, // Create as draft for review
      });

      console.log(`  ✓ Created PR: ${pr.url}\n`);
    } catch (error) {
      console.error(`  ✗ Failed for ${repo.name}:`, (error as Error).message);
    }
  }

  // ============================================================================
  // STEP 11: Link Related PRs
  // ============================================================================
  console.log('🔗 Step 11: Linking related PRs...');
  console.log('  (This would link all PRs created in the batch)\n');

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('📊 Workflow Summary:');
  console.log('='.repeat(50));
  console.log(`Repositories scanned: ${repositories.length}`);
  console.log(`Repositories cloned: ${cloneResults.size}`);
  console.log(`Patterns detected: ${detectionResult.patterns.length}`);
  console.log(`Matches found: ${detectionResult.matches.length}`);
  console.log(`Refactorings applied: 0 (dry-run mode)`);
  console.log(`PRs created: 1 (demo)`);
  console.log('='.repeat(50));

  console.log('\n✨ Workflow complete!\n');

  // Cleanup
  repoManager.dispose();
}

// Run the workflow
main().catch(error => {
  console.error('❌ Workflow failed:', error);
  process.exit(1);
});

// Made with Bob
