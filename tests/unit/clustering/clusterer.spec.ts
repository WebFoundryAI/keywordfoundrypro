import { describe, it, expect } from 'vitest';
import {
  clusterKeywords,
  mergeClusters,
  splitCluster,
} from '@/lib/clustering/clusterer';
import type { Keyword, ClusteringParams } from '@/lib/clustering/types';

describe('clusterer.ts - keyword clustering', () => {
  const defaultParams: ClusteringParams = {
    overlap_threshold: 3,
    distance_threshold: 0.35,
    min_cluster_size: 2,
    semantic_provider: 'none',
  };

  describe('clusterKeywords', () => {
    it('should return empty clusters for empty input', async () => {
      const result = await clusterKeywords([], defaultParams);
      expect(result.clusters).toEqual([]);
      expect(result.unclustered).toEqual([]);
    });

    it('should respect min_cluster_size threshold', async () => {
      const keywords: Keyword[] = [
        { id: '1', text: 'keyword 1', serp_urls: ['https://a.com/1'] },
        { id: '2', text: 'keyword 2', serp_urls: ['https://b.com/1'] },
        { id: '3', text: 'keyword 3', serp_urls: ['https://c.com/1'] },
      ];

      const result = await clusterKeywords(keywords, {
        ...defaultParams,
        min_cluster_size: 2,
      });

      // No keywords share enough URLs, so all should be unclustered
      expect(result.clusters.length).toBe(0);
      expect(result.unclustered.length).toBe(3);
    });

    it('should cluster keywords with sufficient overlap', async () => {
      const sharedUrls = [
        'https://example.com/1',
        'https://example.com/2',
        'https://example.com/3',
        'https://example.com/4',
      ];

      const keywords: Keyword[] = [
        {
          id: '1',
          text: 'keyword 1',
          serp_urls: [...sharedUrls, 'https://a.com/1'],
          search_volume: 1000,
        },
        {
          id: '2',
          text: 'keyword 2',
          serp_urls: [...sharedUrls, 'https://b.com/1'],
          search_volume: 500,
        },
      ];

      const result = await clusterKeywords(keywords, {
        ...defaultParams,
        overlap_threshold: 3,
      });

      expect(result.clusters.length).toBe(1);
      expect(result.clusters[0].members.length).toBe(2);
    });

    it('should select representative with highest search volume', async () => {
      const sharedUrls = [
        'https://example.com/1',
        'https://example.com/2',
        'https://example.com/3',
        'https://example.com/4',
      ];

      const keywords: Keyword[] = [
        {
          id: '1',
          text: 'low volume',
          serp_urls: [...sharedUrls],
          search_volume: 100,
        },
        {
          id: '2',
          text: 'high volume',
          serp_urls: [...sharedUrls],
          search_volume: 1000,
        },
      ];

      const result = await clusterKeywords(keywords, {
        ...defaultParams,
        overlap_threshold: 3,
      });

      expect(result.clusters.length).toBe(1);
      expect(result.clusters[0].representative).toBe('high volume');
      const rep = result.clusters[0].members.find((m) => m.is_representative);
      expect(rep?.keyword_text).toBe('high volume');
    });

    it('should ensure exactly one representative per cluster', async () => {
      const sharedUrls = [
        'https://example.com/1',
        'https://example.com/2',
        'https://example.com/3',
        'https://example.com/4',
      ];

      const keywords: Keyword[] = [
        { id: '1', text: 'kw1', serp_urls: [...sharedUrls] },
        { id: '2', text: 'kw2', serp_urls: [...sharedUrls] },
        { id: '3', text: 'kw3', serp_urls: [...sharedUrls] },
      ];

      const result = await clusterKeywords(keywords, {
        ...defaultParams,
        overlap_threshold: 3,
      });

      expect(result.clusters.length).toBe(1);
      const representatives = result.clusters[0].members.filter(
        (m) => m.is_representative
      );
      expect(representatives.length).toBe(1);
    });
  });

  describe('mergeClusters', () => {
    it('should combine members from multiple clusters', () => {
      const cluster1 = {
        name: 'Cluster 1',
        members: [
          { keyword_text: 'kw1', is_representative: true },
          { keyword_text: 'kw2', is_representative: false },
        ],
      };

      const cluster2 = {
        name: 'Cluster 2',
        members: [
          { keyword_text: 'kw3', is_representative: true },
          { keyword_text: 'kw4', is_representative: false },
        ],
      };

      const merged = mergeClusters([cluster1, cluster2], 'Merged');

      expect(merged.name).toBe('Merged');
      expect(merged.members.length).toBe(4);
    });

    it('should select exactly one representative', () => {
      const cluster1 = {
        name: 'Cluster 1',
        members: [{ keyword_text: 'kw1', is_representative: true }],
      };

      const cluster2 = {
        name: 'Cluster 2',
        members: [{ keyword_text: 'kw2', is_representative: true }],
      };

      const merged = mergeClusters([cluster1, cluster2], 'Merged');

      const representatives = merged.members.filter((m) => m.is_representative);
      expect(representatives.length).toBe(1);
    });

    it('should handle empty clusters array', () => {
      const merged = mergeClusters([], 'Empty');
      expect(merged.members.length).toBe(0);
    });
  });

  describe('splitCluster', () => {
    it('should split cluster into two groups', () => {
      const cluster = {
        name: 'Original',
        members: [
          { keyword_text: 'kw1', is_representative: true },
          { keyword_text: 'kw2', is_representative: false },
          { keyword_text: 'kw3', is_representative: false },
        ],
      };

      const [remaining, newCluster] = splitCluster(
        cluster,
        ['kw2'],
        'New Cluster'
      );

      expect(remaining.members.length).toBe(2);
      expect(newCluster.members.length).toBe(1);
      expect(newCluster.name).toBe('New Cluster');
    });

    it('should assign new representatives to both clusters', () => {
      const cluster = {
        name: 'Original',
        members: [
          { keyword_text: 'kw1', is_representative: true },
          { keyword_text: 'kw2', is_representative: false },
          { keyword_text: 'kw3', is_representative: false },
        ],
      };

      const [remaining, newCluster] = splitCluster(
        cluster,
        ['kw2', 'kw3'],
        'New'
      );

      const remainingReps = remaining.members.filter(
        (m) => m.is_representative
      );
      const newReps = newCluster.members.filter((m) => m.is_representative);

      expect(remainingReps.length).toBe(1);
      expect(newReps.length).toBe(1);
    });

    it('should handle splitting all members', () => {
      const cluster = {
        name: 'Original',
        members: [
          { keyword_text: 'kw1', is_representative: true },
          { keyword_text: 'kw2', is_representative: false },
        ],
      };

      const [remaining, newCluster] = splitCluster(
        cluster,
        ['kw1', 'kw2'],
        'All'
      );

      expect(remaining.members.length).toBe(0);
      expect(newCluster.members.length).toBe(2);
    });
  });
});
