/**
 * Basic usage example for repository management
 */

import { createRepositoryManager } from '@cross-repo-refactor/repository';
import { Repository } from '@cross-repo-refactor/core';

async function main() {
  // Create repository manager with custom configuration
  const manager = createRepositoryManager({
    cache: {
      baseDir: './.cache/repos',
      maxSize: 2048, // 2GB
      maxAge: 14, // 14 days
      cleanupInterval: 12, // 12 hours
    },
    workspace: {
      rootDir: './workspace',
      repositories: [],
      parallel: 5,
    },
  });

  // Define repositories to work with
  const repositories: Repository[] = [
    {
      id: '1',
      name: 'frontend',
      fullName: 'myorg/frontend',
      url: 'https://github.com/myorg/frontend',
      cloneUrl: 'https://github.com/myorg/frontend.git',
      defaultBranch: 'main',
      language: 'TypeScript',
      lastActivity: new Date(),
    },
    {
      id: '2',
      name: 'backend',
      fullName: 'myorg/backend',
      url: 'https://github.com/myorg/backend',
      cloneUrl: 'https://github.com/myorg/backend.git',
      defaultBranch: 'main',
      language: 'Python',
      lastActivity: new Date(),
    },
    {
      id: '3',
      name: 'mobile',
      fullName: 'myorg/mobile',
      url: 'https://github.com/myorg/mobile',
      cloneUrl: 'https://github.com/myorg/mobile.git',
      defaultBranch: 'main',
      language: 'Dart',
      lastActivity: new Date(),
    },
  ];

  console.log('🚀 Starting repository operations...\n');

  // Clone repositories with progress tracking
  console.log('📦 Cloning repositories...');
  const cloneResults = await manager.cloner.cloneMany(
    repositories,
    {
      depth: 1,
      singleBranch: true,
      token: process.env.GITHUB_TOKEN,
    },
    3, // Clone 3 at a time
    (progress) => {
      const percentage = progress.progress.toFixed(0).padStart(3);
      const status = progress.status.padEnd(10);
      console.log(`  ${progress.repository.name.padEnd(15)} ${status} ${percentage}%`);
    }
  );

  console.log(`\n✅ Cloned ${cloneResults.size} repositories\n`);

  // Display cache statistics
  const stats = manager.cache.getStats();
  console.log('📊 Cache Statistics:');
  console.log(`  Total repositories: ${stats.totalRepositories}`);
  console.log(`  Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Cache hit rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
  console.log(`  Oldest entry: ${stats.oldestEntry?.toLocaleDateString()}`);
  console.log(`  Newest entry: ${stats.newestEntry?.toLocaleDateString()}\n`);

  // Create a refactoring branch in all repositories
  console.log('🌿 Creating refactoring branches...');
  const branchName = 'refactor/update-config';
  
  for (const repo of repositories) {
    try {
      await manager.workspace.createBranch(repo, branchName, 'main');
      console.log(`  ✓ ${repo.name}: Created branch ${branchName}`);
    } catch (error) {
      console.error(`  ✗ ${repo.name}: Failed to create branch`);
    }
  }

  console.log('\n📝 Making changes...');
  
  // Example: Update a configuration file in each repository
  for (const repo of repositories) {
    try {
      // Check if config file exists
      const configExists = await manager.workspace.fileExists(repo, 'config.json');
      
      if (configExists) {
        // Read existing config
        const content = await manager.workspace.readFile(repo, 'config.json');
        const config = JSON.parse(content);
        
        // Update config
        config.version = '2.0.0';
        config.updatedAt = new Date().toISOString();
        
        // Write back
        await manager.workspace.writeFile(
          repo,
          'config.json',
          JSON.stringify(config, null, 2)
        );
        
        console.log(`  ✓ ${repo.name}: Updated config.json`);
      } else {
        console.log(`  ⊘ ${repo.name}: No config.json found`);
      }
    } catch (error) {
      console.error(`  ✗ ${repo.name}: Failed to update config`);
    }
  }

  console.log('\n💾 Committing changes...');
  
  // Commit changes in each repository
  for (const repo of repositories) {
    try {
      const status = await manager.workspace.getStatus(repo);
      
      if (status.modified.length > 0 || status.added.length > 0) {
        const commitSha = await manager.workspace.commit(
          repo,
          'chore: update configuration to v2.0.0'
        );
        
        console.log(`  ✓ ${repo.name}: Committed ${commitSha.substring(0, 7)}`);
      } else {
        console.log(`  ⊘ ${repo.name}: No changes to commit`);
      }
    } catch (error) {
      console.error(`  ✗ ${repo.name}: Failed to commit`);
    }
  }

  console.log('\n🚀 Pushing changes...');
  
  // Push changes to remote
  for (const repo of repositories) {
    try {
      await manager.workspace.push(repo, branchName);
      console.log(`  ✓ ${repo.name}: Pushed to ${branchName}`);
    } catch (error) {
      console.error(`  ✗ ${repo.name}: Failed to push`);
    }
  }

  console.log('\n✨ All operations completed!\n');

  // Cleanup
  manager.dispose();
}

// Run the example
main().catch(console.error);

// Made with Bob
