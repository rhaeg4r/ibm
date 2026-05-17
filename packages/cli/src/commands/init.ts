/**
 * Init command - Initialize configuration
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';

export async function initCommand(options: { interactive?: boolean }) {
  console.log(chalk.blue('🚀 Initializing Cross-Repo Refactor Coordinator\n'));

  let config: any = {
    platform: {
      type: 'github',
      organization: '',
      token: '',
    },
    cache: {
      baseDir: './.cache/repos',
      maxSize: 2048,
      maxAge: 14,
    },
    detection: {
      languages: ['typescript', 'javascript'],
      minPatternSize: 5,
      maxPatternSize: 100,
      similarityThreshold: 0.75,
    },
    ai: {
      provider: 'local',
      embeddingModel: '',
    },
  };

  if (options.interactive) {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'Select your Git platform:',
        choices: ['github', 'gitlab', 'bitbucket'],
        default: 'github',
      },
      {
        type: 'input',
        name: 'organization',
        message: 'Enter your organization/group name:',
        validate: (input: string) => input.length > 0 || 'Organization name is required',
      },
      {
        type: 'password',
        name: 'token',
        message: 'Enter your access token (optional, can use env var):',
      },
      {
        type: 'list',
        name: 'aiProvider',
        message: 'Select AI provider for pattern detection:',
        choices: ['local', 'openai', 'anthropic'],
        default: 'local',
      },
      {
        type: 'number',
        name: 'threshold',
        message: 'Similarity threshold (0-1):',
        default: 0.75,
        validate: (input: number) => (input >= 0 && input <= 1) || 'Must be between 0 and 1',
      },
    ]);

    config.platform.type = answers.platform;
    config.platform.organization = answers.organization;
    if (answers.token) {
      config.platform.token = answers.token;
    }
    config.ai.provider = answers.aiProvider;
    config.detection.similarityThreshold = answers.threshold;
  }

  // Write config file
  const configPath = path.join(process.cwd(), '.refactorrc.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));

  console.log(chalk.green('\n✓ Configuration file created: .refactorrc.json'));
  console.log(chalk.yellow('\n⚠️  Remember to:'));
  console.log('  1. Add your access token to .env file or environment variables');
  console.log('  2. Review and adjust the configuration as needed');
  console.log('  3. Add .refactorrc.json to .gitignore if it contains sensitive data\n');
}

// Made with Bob
