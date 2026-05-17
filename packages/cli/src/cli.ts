#!/usr/bin/env node

/**
 * Cross-Repo Refactor Coordinator CLI
 */

import { Command } from 'commander';
import { config } from 'dotenv';
import { scanCommand } from './commands/scan';
import { detectCommand } from './commands/detect';
import { refactorCommand } from './commands/refactor';
import { prCommand } from './commands/pr';
import { configCommand } from './commands/config';
import { initCommand } from './commands/init';

// Load environment variables
config();

const program = new Command();

program
  .name('cross-repo-refactor')
  .description('AI-powered cross-repository refactoring tool')
  .version('0.1.0');

// Init command - Initialize configuration
program
  .command('init')
  .description('Initialize configuration file')
  .option('-i, --interactive', 'Interactive setup')
  .action(initCommand);

// Scan command - Discover repositories
program
  .command('scan')
  .description('Scan and discover repositories')
  .option('-p, --platform <type>', 'Platform type (github, gitlab, bitbucket)')
  .option('-o, --org <name>', 'Organization/group name')
  .option('-t, --token <token>', 'Authentication token')
  .option('--cache', 'Cache results')
  .action(scanCommand);

// Detect command - Detect patterns
program
  .command('detect')
  .description('Detect code patterns across repositories')
  .option('-s, --source <path>', 'Source pattern file or directory')
  .option('-l, --language <lang>', 'Programming language')
  .option('--threshold <number>', 'Similarity threshold (0-1)', '0.75')
  .option('--ai <provider>', 'AI provider (openai, anthropic, local)', 'local')
  .action(detectCommand);

// Refactor command - Apply refactorings
program
  .command('refactor')
  .description('Apply refactorings to matched patterns')
  .option('-s, --strategy <name>', 'Refactoring strategy')
  .option('--dry-run', 'Preview changes without applying')
  .option('--validate', 'Validate changes')
  .option('--backup', 'Create backups')
  .option('-b, --batch', 'Batch mode')
  .action(refactorCommand);

// PR command - Create pull requests
program
  .command('pr')
  .description('Create coordinated pull requests')
  .option('-t, --title <title>', 'PR title')
  .option('-d, --description <desc>', 'PR description')
  .option('-b, --branch <name>', 'Source branch name')
  .option('--draft', 'Create as draft')
  .option('--link', 'Link related PRs')
  .action(prCommand);

// Config command - Manage configuration
program
  .command('config')
  .description('Manage configuration')
  .argument('[action]', 'Action (get, set, list)')
  .argument('[key]', 'Configuration key')
  .argument('[value]', 'Configuration value')
  .action(configCommand);

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

// Made with Bob
