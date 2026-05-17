/**
 * Config command - Manage configuration
 */

import chalk from 'chalk';
import { loadConfig, saveConfig } from '../utils/config';

export async function configCommand(
  action?: string,
  key?: string,
  value?: string
) {
  try {
    const config = await loadConfig();

    if (!action || action === 'list') {
      // List all configuration
      console.log(chalk.blue('📋 Current Configuration:\n'));
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    if (action === 'get') {
      if (!key) {
        console.error(chalk.red('Error: Key is required for get action'));
        process.exit(1);
      }

      // Get specific value
      const keys = key.split('.');
      let val: any = config;
      for (const k of keys) {
        val = val?.[k];
      }

      if (val !== undefined) {
        console.log(chalk.green(`${key}:`), val);
      } else {
        console.log(chalk.yellow(`Key not found: ${key}`));
      }
      return;
    }

    if (action === 'set') {
      if (!key || value === undefined) {
        console.error(chalk.red('Error: Key and value are required for set action'));
        process.exit(1);
      }

      // Set value
      const keys = key.split('.');
      let obj: any = config;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) {
          obj[keys[i]] = {};
        }
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;

      await saveConfig(config);
      console.log(chalk.green(`✓ Set ${key} = ${value}`));
      return;
    }

    console.error(chalk.red(`Unknown action: ${action}`));
    console.log(chalk.yellow('\nAvailable actions: list, get, set'));
    process.exit(1);
  } catch (error) {
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}

// Made with Bob
