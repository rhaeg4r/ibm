/**
 * Pattern detection package
 * Exports all public APIs
 */

export * from './types';
export { BaseParser } from './parsers/BaseParser';
export { TypeScriptParser } from './parsers/TypeScriptParser';
export { EmbeddingService } from './embeddings/EmbeddingService';
export { PatternDetector } from './detector/PatternDetector';

// Factory function for easy setup
import { AIConfig } from '@cross-repo-refactor/core';
import { WorkspaceManager } from '@cross-repo-refactor/repository';
import { DetectionConfig } from './types';
import { EmbeddingService } from './embeddings/EmbeddingService';
import { PatternDetector } from './detector/PatternDetector';

export interface PatternDetectionConfig {
  ai: AIConfig;
  detection: DetectionConfig;
}

/**
 * Create a pattern detector with configuration
 */
export function createPatternDetector(
  config: PatternDetectionConfig,
  workspace: WorkspaceManager
): PatternDetector {
  const embeddingService = new EmbeddingService(config.ai);
  return new PatternDetector(config.detection, workspace, embeddingService);
}

/**
 * Create default detection configuration
 */
export function createDefaultDetectionConfig(): DetectionConfig {
  return {
    languages: ['typescript', 'javascript', 'python', 'java', 'go', 'rust'],
    minPatternSize: 5,
    maxPatternSize: 100,
    similarityThreshold: 0.75,
    excludePatterns: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
      '**/*.test.*',
      '**/*.spec.*',
    ],
    includePatterns: [],
    extractTypes: ['function', 'class', 'method'],
  };
}

/**
 * Create default AI configuration
 */
export function createDefaultAIConfig(provider: 'openai' | 'anthropic' | 'local' = 'local'): AIConfig {
  return {
    embeddingModel: provider === 'openai' ? 'text-embedding-3-small' : 'embed-english-v3.0',
    similarityThreshold: 0.75,
    provider,
    apiKey: process.env.OPENAI_API_KEY || process.env.COHERE_API_KEY,
  };
}

// Made with Bob
