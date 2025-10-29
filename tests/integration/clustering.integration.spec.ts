/**
 * ISSUE FIX #8: Integration tests for Keyword Clustering
 *
 * These tests verify the clustering algorithms:
 * - Semantic clustering with embeddings
 * - Overlap-based clustering
 * - Cluster export functionality
 * - Performance with large datasets
 */

import { describe, it, expect } from 'vitest';
import { clusterKeywordsBySemantic } from '@/lib/clustering/semantic';
import { calculateKeywordOverlap } from '@/lib/clustering/overlap';
import { exportClusters } from '@/lib/clustering/export';

describe('Clustering Integration Tests', () => {
  const sampleKeywords = [
    { keyword: 'best seo tools', searchVolume: 5000, cpc: 12.5, intent: 'commercial' as const },
    { keyword: 'seo tools free', searchVolume: 3000, cpc: 8.0, intent: 'informational' as const },
    { keyword: 'seo software', searchVolume: 4500, cpc: 15.0, intent: 'commercial' as const },
    { keyword: 'keyword research tools', searchVolume: 2500, cpc: 10.0, intent: 'informational' as const },
    { keyword: 'backlink checker', searchVolume: 2000, cpc: 9.5, intent: 'informational' as const },
    { keyword: 'backlink analysis tool', searchVolume: 1500, cpc: 11.0, intent: 'commercial' as const },
    { keyword: 'rank tracker', searchVolume: 1800, cpc: 8.5, intent: 'informational' as const },
    { keyword: 'serp analysis', searchVolume: 1200, cpc: 7.0, intent: 'informational' as const },
  ];

  describe('Semantic Clustering', () => {
    it('should cluster keywords by semantic similarity', async () => {
      const clusters = await clusterKeywordsBySemantic(sampleKeywords, {
        minClusterSize: 2,
        similarityThreshold: 0.7,
      });

      expect(clusters).toBeInstanceOf(Array);
      expect(clusters.length).toBeGreaterThan(0);

      // Each cluster should have at least minClusterSize keywords
      clusters.forEach(cluster => {
        expect(cluster.keywords.length).toBeGreaterThanOrEqual(2);
        expect(cluster.id).toBeDefined();
        expect(cluster.centroid).toBeDefined();
      });
    }, 30000);

    it('should handle large keyword lists efficiently', async () => {
      // Generate 500 test keywords
      const largeKeywordList = Array.from({ length: 500 }, (_, i) => ({
        keyword: `test keyword ${i} seo tools`,
        searchVolume: Math.floor(Math.random() * 10000),
        cpc: Math.random() * 20,
        intent: ['informational', 'commercial', 'transactional'][i % 3] as any,
      }));

      const startTime = Date.now();
      const clusters = await clusterKeywordsBySemantic(largeKeywordList, {
        minClusterSize: 5,
        similarityThreshold: 0.6,
      });
      const executionTime = Date.now() - startTime;

      expect(clusters).toBeInstanceOf(Array);
      expect(executionTime).toBeLessThan(10000); // Should complete in <10 seconds
    }, 15000);

    it('should assign cluster IDs consistently', async () => {
      const clusters1 = await clusterKeywordsBySemantic(sampleKeywords, {
        similarityThreshold: 0.7,
      });
      const clusters2 = await clusterKeywordsBySemantic(sampleKeywords, {
        similarityThreshold: 0.7,
      });

      // Same input should produce same number of clusters
      expect(clusters1.length).toBe(clusters2.length);
    }, 30000);
  });

  describe('Overlap-Based Clustering', () => {
    it('should calculate keyword overlap correctly', () => {
      const overlap1 = calculateKeywordOverlap('best seo tools', 'seo tools free');
      const overlap2 = calculateKeywordOverlap('keyword research', 'backlink checker');

      // Related keywords should have high overlap
      expect(overlap1).toBeGreaterThan(0.5);
      // Unrelated keywords should have low overlap
      expect(overlap2).toBeLessThan(0.3);
    });

    it('should handle exact matches', () => {
      const overlap = calculateKeywordOverlap('seo tools', 'seo tools');
      expect(overlap).toBe(1.0);
    });

    it('should handle case insensitivity', () => {
      const overlap = calculateKeywordOverlap('SEO Tools', 'seo tools');
      expect(overlap).toBe(1.0);
    });

    it('should calculate partial overlaps', () => {
      const testCases = [
        { kw1: 'best seo tools for beginners', kw2: 'seo tools', expected: 0.4 },
        { kw1: 'keyword research', kw2: 'keyword research tools', expected: 0.66 },
      ];

      testCases.forEach(({ kw1, kw2, expected }) => {
        const overlap = calculateKeywordOverlap(kw1, kw2);
        expect(overlap).toBeCloseTo(expected, 1);
      });
    });
  });

  describe('Cluster Export', () => {
    it('should export clusters to CSV format', async () => {
      const clusters = await clusterKeywordsBySemantic(sampleKeywords, {
        minClusterSize: 2,
      });

      const csv = exportClusters(clusters, 'csv');

      expect(csv).toContain('cluster_id');
      expect(csv).toContain('keyword');
      expect(csv).toContain('search_volume');
      expect(csv).toContain('cpc');

      // Verify CSV structure
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThan(1); // Header + data rows
    }, 30000);

    it('should export clusters to JSON format', async () => {
      const clusters = await clusterKeywordsBySemantic(sampleKeywords, {
        minClusterSize: 2,
      });

      const json = exportClusters(clusters, 'json');
      const parsed = JSON.parse(json);

      expect(parsed).toBeInstanceOf(Array);
      expect(parsed.length).toBeGreaterThan(0);

      parsed.forEach((cluster: any) => {
        expect(cluster.id).toBeDefined();
        expect(cluster.keywords).toBeInstanceOf(Array);
      });
    }, 30000);

    it('should handle empty clusters', () => {
      const csv = exportClusters([], 'csv');
      expect(csv).toContain('cluster_id'); // Should still have header

      const json = exportClusters([], 'json');
      expect(JSON.parse(json)).toEqual([]);
    });
  });

  describe('Performance Tests', () => {
    it('should handle 1000+ keywords without timeout', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        keyword: `keyword ${i} ${i % 10 === 0 ? 'seo tools' : 'marketing'}`,
        searchVolume: Math.floor(Math.random() * 10000),
        cpc: Math.random() * 20,
        intent: 'informational' as const,
      }));

      const startTime = Date.now();
      const clusters = await clusterKeywordsBySemantic(largeDataset, {
        minClusterSize: 10,
        similarityThreshold: 0.65,
      });
      const executionTime = Date.now() - startTime;

      expect(clusters).toBeInstanceOf(Array);
      expect(executionTime).toBeLessThan(30000); // Should complete in <30 seconds
    }, 35000);

    it('should not consume excessive memory', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      const largeDataset = Array.from({ length: 500 }, (_, i) => ({
        keyword: `test keyword ${i}`,
        searchVolume: 1000,
        cpc: 10,
        intent: 'informational' as const,
      }));

      await clusterKeywordsBySemantic(largeDataset);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    }, 30000);
  });

  describe('Edge Cases', () => {
    it('should handle empty keyword list', async () => {
      const clusters = await clusterKeywordsBySemantic([]);
      expect(clusters).toEqual([]);
    });

    it('should handle single keyword', async () => {
      const clusters = await clusterKeywordsBySemantic([sampleKeywords[0]]);
      expect(clusters.length).toBe(1);
      expect(clusters[0].keywords.length).toBe(1);
    });

    it('should handle keywords with missing data', async () => {
      const keywordsWithMissing = [
        { keyword: 'test 1', searchVolume: null, cpc: null, intent: 'informational' as const },
        { keyword: 'test 2', searchVolume: 1000, cpc: null, intent: 'informational' as const },
        { keyword: 'test 3', searchVolume: null, cpc: 5.0, intent: 'informational' as const },
      ];

      const clusters = await clusterKeywordsBySemantic(keywordsWithMissing);
      expect(clusters).toBeInstanceOf(Array);
    });

    it('should handle special characters in keywords', async () => {
      const specialKeywords = [
        { keyword: 'seo & marketing', searchVolume: 1000, cpc: 10, intent: 'informational' as const },
        { keyword: 'keyword (research)', searchVolume: 1000, cpc: 10, intent: 'informational' as const },
        { keyword: 'tools - free', searchVolume: 1000, cpc: 10, intent: 'informational' as const },
      ];

      const clusters = await clusterKeywordsBySemantic(specialKeywords);
      expect(clusters).toBeInstanceOf(Array);
    });
  });
});
