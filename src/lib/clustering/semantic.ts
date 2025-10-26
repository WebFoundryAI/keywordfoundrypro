/**
 * Pluggable semantic similarity provider for keyword clustering
 * Supports "none" (default, no semantic analysis) and "openai" (embeddings-based)
 */

export interface SemanticProvider {
  /**
   * Generate embeddings for an array of text strings
   * @param texts - Array of keyword texts
   * @returns 2D array of embeddings (one per text)
   */
  embed(texts: string[]): Promise<number[][]>;

  /**
   * Calculate distance between two embedding vectors (0-1, lower = more similar)
   * @param embedding1 - First embedding vector
   * @param embedding2 - Second embedding vector
   * @returns Distance score (0 = identical, 1 = completely different)
   */
  distance(embedding1: number[], embedding2: number[]): number;
}

/**
 * No-op provider that returns zero embeddings (semantic analysis disabled)
 */
class NoneProvider implements SemanticProvider {
  async embed(texts: string[]): Promise<number[][]> {
    // Return zero vectors (semantic analysis will be skipped)
    return texts.map(() => []);
  }

  distance(_embedding1: number[], _embedding2: number[]): number {
    // Always return max distance (no similarity)
    return 1.0;
  }
}

/**
 * OpenAI embeddings provider using text-embedding-3-small
 */
class OpenAIProvider implements SemanticProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required for semantic clustering');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.data.map((item: { embedding: number[] }) => item.embedding);
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw error;
    }
  }

  distance(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length === 0 || embedding2.length === 0) {
      return 1.0;
    }

    // Cosine distance: 1 - cosine_similarity
    // cosine_similarity = dot_product / (magnitude1 * magnitude2)
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 1.0;
    }

    const cosineSimilarity = dotProduct / (magnitude1 * magnitude2);
    return 1 - cosineSimilarity; // Convert similarity to distance
  }
}

/**
 * Get semantic provider based on configuration
 * @param kind - Provider type ('none' or 'openai')
 * @param apiKey - API key (required for 'openai')
 * @returns Configured semantic provider
 */
export function getSemanticProvider(
  kind: 'none' | 'openai',
  apiKey?: string
): SemanticProvider {
  if (kind === 'none') {
    return new NoneProvider();
  }

  if (kind === 'openai') {
    if (!apiKey) {
      throw new Error('OpenAI API key is required for openai provider');
    }
    return new OpenAIProvider(apiKey);
  }

  throw new Error(`Unknown semantic provider: ${kind}`);
}

/**
 * Build semantic distance matrix for all keywords
 * @param embeddings - Array of embedding vectors
 * @param provider - Semantic provider to use for distance calculation
 * @returns 2D array where matrix[i][j] is semantic distance between keyword i and j
 */
export function buildSemanticMatrix(
  embeddings: number[][],
  provider: SemanticProvider
): number[][] {
  const n = embeddings.length;
  const matrix: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 0; // zero distance with self
    for (let j = i + 1; j < n; j++) {
      const distance = provider.distance(embeddings[i], embeddings[j]);
      matrix[i][j] = distance;
      matrix[j][i] = distance; // symmetric
    }
  }

  return matrix;
}
