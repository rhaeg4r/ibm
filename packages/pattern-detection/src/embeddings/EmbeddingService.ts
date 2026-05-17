/**
 * Embedding service for generating code embeddings
 * Supports multiple providers (OpenAI, Cohere, local models)
 */

import { Embedding, AIConfig } from '@cross-repo-refactor/core';
import { EmbeddingProvider } from '../types';
import OpenAI from 'openai';
import { CohereClient } from 'cohere-ai';

export class EmbeddingService {
  private provider: EmbeddingProvider;

  constructor(config: AIConfig) {
    this.provider = this.createProvider(config);
  }

  /**
   * Generate embedding for code snippet
   */
  async generateEmbedding(code: string, language: string): Promise<Embedding> {
    return await this.provider.generateEmbedding(code, language);
  }

  /**
   * Generate embeddings for multiple code snippets
   */
  async generateBatchEmbeddings(codes: string[], language: string): Promise<Embedding[]> {
    return await this.provider.generateBatchEmbeddings(codes, language);
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1: Embedding, embedding2: Embedding): number {
    if (embedding1.vector.length !== embedding2.vector.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.vector.length; i++) {
      dotProduct += embedding1.vector[i] * embedding2.vector[i];
      norm1 += embedding1.vector[i] * embedding1.vector[i];
      norm2 += embedding2.vector[i] * embedding2.vector[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Calculate Euclidean distance between two embeddings
   */
  euclideanDistance(embedding1: Embedding, embedding2: Embedding): number {
    if (embedding1.vector.length !== embedding2.vector.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let sum = 0;
    for (let i = 0; i < embedding1.vector.length; i++) {
      const diff = embedding1.vector[i] - embedding2.vector[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  /**
   * Normalize embedding vector
   */
  normalize(embedding: Embedding): Embedding {
    if (embedding.normalized) {
      return embedding;
    }

    let norm = 0;
    for (const value of embedding.vector) {
      norm += value * value;
    }
    norm = Math.sqrt(norm);

    const normalizedVector = embedding.vector.map(v => v / norm);

    return {
      ...embedding,
      vector: normalizedVector,
      normalized: true,
    };
  }

  private createProvider(config: AIConfig): EmbeddingProvider {
    switch (config.provider) {
      case 'openai':
        return new OpenAIEmbeddingProvider(config);
      case 'anthropic':
        return new CohereEmbeddingProvider(config);
      case 'local':
        return new LocalEmbeddingProvider(config);
      default:
        throw new Error(`Unsupported embedding provider: ${config.provider}`);
    }
  }
}

/**
 * OpenAI embedding provider
 */
class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(config: AIConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
    });

    this.model = config.embeddingModel || 'text-embedding-3-small';
  }

  async generateEmbedding(code: string, language: string): Promise<Embedding> {
    const input = this.prepareInput(code, language);

    const response = await this.client.embeddings.create({
      model: this.model,
      input,
    });

    return {
      vector: response.data[0].embedding,
      model: this.model,
      dimension: response.data[0].embedding.length,
      normalized: false,
    };
  }

  async generateBatchEmbeddings(codes: string[], language: string): Promise<Embedding[]> {
    const inputs = codes.map(code => this.prepareInput(code, language));

    const response = await this.client.embeddings.create({
      model: this.model,
      input: inputs,
    });

    return response.data.map(item => ({
      vector: item.embedding,
      model: this.model,
      dimension: item.embedding.length,
      normalized: false,
    }));
  }

  private prepareInput(code: string, language: string): string {
    return `Language: ${language}\n\nCode:\n${code}`;
  }
}

/**
 * Cohere embedding provider
 */
class CohereEmbeddingProvider implements EmbeddingProvider {
  name = 'cohere';
  private client: CohereClient;
  private model: string;

  constructor(config: AIConfig) {
    if (!config.apiKey) {
      throw new Error('Cohere API key is required');
    }

    this.client = new CohereClient({
      token: config.apiKey,
    });

    this.model = config.embeddingModel || 'embed-english-v3.0';
  }

  async generateEmbedding(code: string, language: string): Promise<Embedding> {
    const input = this.prepareInput(code, language);

    const response = await this.client.embed({
      texts: [input],
      model: this.model,
      inputType: 'search_document',
    });

    const embeddings = response.embeddings as number[][];
    return {
      vector: embeddings[0],
      model: this.model,
      dimension: embeddings[0].length,
      normalized: false,
    };
  }

  async generateBatchEmbeddings(codes: string[], language: string): Promise<Embedding[]> {
    const inputs = codes.map(code => this.prepareInput(code, language));

    const response = await this.client.embed({
      texts: inputs,
      model: this.model,
      inputType: 'search_document',
    });

    const embeddings = response.embeddings as number[][];
    return embeddings.map((embedding: number[]) => ({
      vector: embedding,
      model: this.model,
      dimension: embedding.length,
      normalized: false,
    }));
  }

  private prepareInput(code: string, language: string): string {
    return `Language: ${language}\n\nCode:\n${code}`;
  }
}

/**
 * Local embedding provider (placeholder for local models)
 */
class LocalEmbeddingProvider implements EmbeddingProvider {
  name = 'local';
  private model: string;

  constructor(config: AIConfig) {
    this.model = config.embeddingModel || 'local-model';
  }

  async generateEmbedding(code: string, _language: string): Promise<Embedding> {
    // Placeholder: In production, this would use a local model like CodeBERT
    // For now, generate a simple hash-based embedding
    const vector = this.simpleHashEmbedding(code);

    return {
      vector,
      model: this.model,
      dimension: vector.length,
      normalized: false,
    };
  }

  async generateBatchEmbeddings(codes: string[], language: string): Promise<Embedding[]> {
    return Promise.all(codes.map(code => this.generateEmbedding(code, language)));
  }

  private simpleHashEmbedding(code: string): number[] {
    // Simple hash-based embedding (for demonstration)
    // In production, use a proper model like CodeBERT
    const dimension = 384; // Common embedding dimension
    const vector = new Array(dimension).fill(0);

    for (let i = 0; i < code.length; i++) {
      const charCode = code.charCodeAt(i);
      const index = charCode % dimension;
      vector[index] += 1;
    }

    // Normalize
    const max = Math.max(...vector);
    return vector.map(v => v / max);
  }
}

// Made with Bob
