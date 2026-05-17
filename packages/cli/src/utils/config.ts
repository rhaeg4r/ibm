/**
 * Configuration utilities
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface CLIConfig {
  platform?: {
    type: string;
    organization: string;
    token?: string;
  };
  cache?: {
    baseDir: string;
    maxSize: number;
    maxAge: number;
  };
  detection?: {
    languages: string[];
    minPatternSize: number;
    maxPatternSize: number;
    similarityThreshold: number;
  };
  ai?: {
    provider: string;
    embeddingModel?: string;
    apiKey?: string;
  };
}

export async function loadConfig(): Promise<CLIConfig> {
  const configPath = path.join(process.cwd(), '.refactorrc.json');
  
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Return default config if file doesn't exist
    return {
      platform: {
        type: 'github',
        organization: '',
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
      },
    };
  }
}

export async function saveConfig(config: CLIConfig): Promise<void> {
  const configPath = path.join(process.cwd(), '.refactorrc.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

// Made with Bob
