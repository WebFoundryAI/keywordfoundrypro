import { describe, it, expect } from 'vitest';
import { getSemanticProvider, buildSemanticMatrix } from '@/lib/clustering/semantic';

describe('semantic.ts - semantic similarity provider', () => {
  describe('getSemanticProvider', () => {
    it('should return NoneProvider for "none"', () => {
      const provider = getSemanticProvider('none');
      expect(provider).toBeDefined();
    });

    it('should throw error for openai without API key', () => {
      expect(() => getSemanticProvider('openai')).toThrow(
        'OpenAI API key is required'
      );
    });

    it('should return OpenAIProvider with API key', () => {
      const provider = getSemanticProvider('openai', 'sk-test-key');
      expect(provider).toBeDefined();
    });
  });

  describe('NoneProvider', () => {
    it('should return empty embeddings', async () => {
      const provider = getSemanticProvider('none');
      const embeddings = await provider.embed(['test1', 'test2']);
      expect(embeddings.length).toBe(2);
      expect(embeddings[0]).toEqual([]);
      expect(embeddings[1]).toEqual([]);
    });

    it('should return max distance (1.0) for all comparisons', () => {
      const provider = getSemanticProvider('none');
      const distance = provider.distance([1, 2, 3], [4, 5, 6]);
      expect(distance).toBe(1.0);
    });
  });

  describe('OpenAIProvider (with mock)', () => {
    it('should calculate cosine distance correctly', () => {
      const provider = getSemanticProvider('openai', 'sk-test-key');

      // Identical vectors should have distance 0
      const distance1 = provider.distance([1, 0, 0], [1, 0, 0]);
      expect(distance1).toBeCloseTo(0, 5);

      // Orthogonal vectors should have distance ~1
      const distance2 = provider.distance([1, 0, 0], [0, 1, 0]);
      expect(distance2).toBeCloseTo(1, 5);

      // Opposite vectors should have distance 2
      const distance3 = provider.distance([1, 0, 0], [-1, 0, 0]);
      expect(distance3).toBeCloseTo(2, 5);
    });

    it('should handle zero-length vectors', () => {
      const provider = getSemanticProvider('openai', 'sk-test-key');
      const distance = provider.distance([], []);
      expect(distance).toBe(1.0);
    });

    it('should handle zero magnitude vectors', () => {
      const provider = getSemanticProvider('openai', 'sk-test-key');
      const distance = provider.distance([0, 0, 0], [1, 2, 3]);
      expect(distance).toBe(1.0);
    });
  });

  describe('buildSemanticMatrix', () => {
    it('should build matrix with zeros on diagonal', () => {
      const provider = getSemanticProvider('openai', 'sk-test-key');
      const embeddings = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];

      const matrix = buildSemanticMatrix(embeddings, provider);

      expect(matrix[0][0]).toBe(0);
      expect(matrix[1][1]).toBe(0);
      expect(matrix[2][2]).toBe(0);
    });

    it('should build symmetric matrix', () => {
      const provider = getSemanticProvider('openai', 'sk-test-key');
      const embeddings = [
        [1, 0, 0],
        [0, 1, 0],
      ];

      const matrix = buildSemanticMatrix(embeddings, provider);

      expect(matrix[0][1]).toBe(matrix[1][0]);
    });

    it('should calculate correct distances for all pairs', () => {
      const provider = getSemanticProvider('openai', 'sk-test-key');
      const embeddings = [
        [1, 0, 0],
        [1, 0, 0], // Identical to first
        [0, 1, 0], // Orthogonal to first
      ];

      const matrix = buildSemanticMatrix(embeddings, provider);

      expect(matrix[0][1]).toBeCloseTo(0, 5); // Identical
      expect(matrix[0][2]).toBeCloseTo(1, 5); // Orthogonal
    });

    it('should handle empty embeddings array', () => {
      const provider = getSemanticProvider('openai', 'sk-test-key');
      const matrix = buildSemanticMatrix([], provider);
      expect(matrix).toEqual([]);
    });
  });
});
