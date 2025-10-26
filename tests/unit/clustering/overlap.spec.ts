import { describe, it, expect } from 'vitest';
import {
  calculateOverlapScore,
  buildOverlapMatrix,
  findSimilarKeywords,
} from '@/lib/clustering/overlap';

describe('overlap.ts - SERP overlap scoring', () => {
  describe('calculateOverlapScore', () => {
    it('should return 0 for empty arrays', () => {
      expect(calculateOverlapScore([], [])).toBe(0);
      expect(calculateOverlapScore(undefined, [])).toBe(0);
      expect(calculateOverlapScore([], undefined)).toBe(0);
    });

    it('should return 0 for no overlap', () => {
      const urls1 = ['https://example.com/a', 'https://example.com/b'];
      const urls2 = ['https://different.com/c', 'https://different.com/d'];
      expect(calculateOverlapScore(urls1, urls2)).toBe(0);
    });

    it('should return correct overlap count', () => {
      const urls1 = [
        'https://example.com/a',
        'https://example.com/b',
        'https://example.com/c',
      ];
      const urls2 = [
        'https://example.com/a',
        'https://example.com/b',
        'https://different.com/d',
      ];
      expect(calculateOverlapScore(urls1, urls2)).toBe(2);
    });

    it('should normalize URLs (remove protocol, www, trailing slash)', () => {
      const urls1 = ['https://www.example.com/page/'];
      const urls2 = ['http://example.com/page'];
      expect(calculateOverlapScore(urls1, urls2)).toBe(1);
    });

    it('should handle case insensitive matching', () => {
      const urls1 = ['https://Example.COM/Page'];
      const urls2 = ['https://example.com/page'];
      expect(calculateOverlapScore(urls1, urls2)).toBe(1);
    });

    it('should only consider top 10 URLs', () => {
      const urls1 = Array(15)
        .fill(0)
        .map((_, i) => `https://example.com/${i}`);
      const urls2 = Array(15)
        .fill(0)
        .map((_, i) => `https://example.com/${i}`);
      expect(calculateOverlapScore(urls1, urls2)).toBe(10);
    });

    it('should return 10 for identical URLs', () => {
      const urls = Array(10)
        .fill(0)
        .map((_, i) => `https://example.com/${i}`);
      expect(calculateOverlapScore(urls, urls)).toBe(10);
    });
  });

  describe('buildOverlapMatrix', () => {
    it('should return empty matrix for empty input', () => {
      const matrix = buildOverlapMatrix([]);
      expect(matrix).toEqual([]);
    });

    it('should return matrix with 10 on diagonal', () => {
      const keywords = [
        { serp_urls: ['https://example.com/a'] },
        { serp_urls: ['https://example.com/b'] },
      ];
      const matrix = buildOverlapMatrix(keywords);

      expect(matrix[0][0]).toBe(10);
      expect(matrix[1][1]).toBe(10);
    });

    it('should build symmetric matrix', () => {
      const keywords = [
        { serp_urls: ['https://example.com/a', 'https://example.com/b'] },
        { serp_urls: ['https://example.com/a', 'https://example.com/c'] },
      ];
      const matrix = buildOverlapMatrix(keywords);

      expect(matrix[0][1]).toBe(matrix[1][0]);
      expect(matrix[0][1]).toBe(1); // One shared URL
    });

    it('should calculate correct scores for multiple keywords', () => {
      const keywords = [
        {
          serp_urls: ['https://a.com/1', 'https://a.com/2', 'https://a.com/3'],
        },
        {
          serp_urls: ['https://a.com/1', 'https://a.com/2', 'https://b.com/1'],
        },
        { serp_urls: ['https://c.com/1', 'https://c.com/2'] },
      ];
      const matrix = buildOverlapMatrix(keywords);

      expect(matrix[0][1]).toBe(2); // 2 shared URLs
      expect(matrix[0][2]).toBe(0); // No shared URLs
      expect(matrix[1][2]).toBe(0); // No shared URLs
    });
  });

  describe('findSimilarKeywords', () => {
    it('should return empty array when no keywords meet threshold', () => {
      const matrix = [
        [10, 1, 0],
        [1, 10, 2],
        [0, 2, 10],
      ];
      const similar = findSimilarKeywords(0, matrix, 5);
      expect(similar).toEqual([]);
    });

    it('should return indices of keywords meeting threshold', () => {
      const matrix = [
        [10, 5, 2],
        [5, 10, 3],
        [2, 3, 10],
      ];
      const similar = findSimilarKeywords(0, matrix, 3);
      expect(similar).toEqual([1]); // Only index 1 has score >= 3
    });

    it('should not include self in results', () => {
      const matrix = [
        [10, 8, 9],
        [8, 10, 7],
        [9, 7, 10],
      ];
      const similar = findSimilarKeywords(0, matrix, 5);
      expect(similar).not.toContain(0);
      expect(similar).toContain(1);
      expect(similar).toContain(2);
    });

    it('should handle threshold of 0', () => {
      const matrix = [
        [10, 0, 0],
        [0, 10, 0],
        [0, 0, 10],
      ];
      const similar = findSimilarKeywords(0, matrix, 0);
      expect(similar).toEqual([1, 2]); // All meet threshold of 0
    });
  });
});
