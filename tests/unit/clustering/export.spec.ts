import { describe, it, expect } from 'vitest';
import {
  exportClustersToCSV,
  exportClustersToJSON,
  generateClusterExportFilename,
} from '@/lib/clustering/export';
import type { Cluster } from '@/lib/clustering/types';

describe('export.ts - cluster export utilities', () => {
  describe('exportClustersToCSV', () => {
    it('should export empty clusters to CSV with headers', () => {
      const csv = exportClustersToCSV([]);
      expect(csv).toBe(
        'Pillar Keyword,Support Keyword,Cluster Name,Cluster ID'
      );
    });

    it('should export single cluster with pillar and supports', () => {
      const clusters: Cluster[] = [
        {
          id: 'cluster-1',
          name: 'Test Cluster',
          members: [
            { keyword_text: 'pillar keyword', is_representative: true },
            { keyword_text: 'support keyword 1', is_representative: false },
            { keyword_text: 'support keyword 2', is_representative: false },
          ],
        },
      ];

      const csv = exportClustersToCSV(clusters);
      const lines = csv.split('\n');

      expect(lines.length).toBe(3); // header + 2 support rows
      expect(lines[0]).toBe(
        'Pillar Keyword,Support Keyword,Cluster Name,Cluster ID'
      );
      expect(lines[1]).toContain('pillar keyword');
      expect(lines[1]).toContain('support keyword 1');
      expect(lines[2]).toContain('support keyword 2');
    });

    it('should handle cluster with no supports', () => {
      const clusters: Cluster[] = [
        {
          id: 'cluster-1',
          name: 'Solo Cluster',
          members: [
            { keyword_text: 'only keyword', is_representative: true },
          ],
        },
      ];

      const csv = exportClustersToCSV(clusters);
      const lines = csv.split('\n');

      expect(lines.length).toBe(2); // header + 1 row with empty support
      expect(lines[1]).toContain('only keyword');
      expect(lines[1]).toContain(',,'); // Empty support field (between two commas)
    });

    it('should escape CSV fields with commas', () => {
      const clusters: Cluster[] = [
        {
          id: 'cluster-1',
          name: 'Cluster, with comma',
          members: [
            { keyword_text: 'keyword, with, commas', is_representative: true },
          ],
        },
      ];

      const csv = exportClustersToCSV(clusters);
      expect(csv).toContain('"keyword, with, commas"');
      expect(csv).toContain('"Cluster, with comma"');
    });

    it('should escape CSV fields with quotes', () => {
      const clusters: Cluster[] = [
        {
          id: 'cluster-1',
          name: 'Test',
          members: [
            { keyword_text: 'keyword "quoted"', is_representative: true },
          ],
        },
      ];

      const csv = exportClustersToCSV(clusters);
      expect(csv).toContain('"keyword ""quoted"""'); // Doubled quotes
    });

    it('should handle newlines in keywords', () => {
      const clusters: Cluster[] = [
        {
          id: 'cluster-1',
          name: 'Test',
          members: [
            { keyword_text: 'keyword\nwith\nnewlines', is_representative: true },
          ],
        },
      ];

      const csv = exportClustersToCSV(clusters);
      expect(csv).toContain('"keyword\nwith\nnewlines"');
    });

    it('should handle multiple clusters', () => {
      const clusters: Cluster[] = [
        {
          id: 'cluster-1',
          name: 'Cluster 1',
          members: [
            { keyword_text: 'pillar 1', is_representative: true },
            { keyword_text: 'support 1', is_representative: false },
          ],
        },
        {
          id: 'cluster-2',
          name: 'Cluster 2',
          members: [
            { keyword_text: 'pillar 2', is_representative: true },
            { keyword_text: 'support 2', is_representative: false },
          ],
        },
      ];

      const csv = exportClustersToCSV(clusters);
      const lines = csv.split('\n');

      expect(lines.length).toBe(3); // header + 2 rows
      expect(lines[1]).toContain('pillar 1');
      expect(lines[2]).toContain('pillar 2');
    });
  });

  describe('exportClustersToJSON', () => {
    it('should export empty clusters to JSON array', () => {
      const json = exportClustersToJSON([]);
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(0);
    });

    it('should export cluster with pillar and supports', () => {
      const clusters: Cluster[] = [
        {
          id: 'cluster-1',
          name: 'Test Cluster',
          members: [
            { keyword_text: 'pillar keyword', is_representative: true },
            { keyword_text: 'support 1', is_representative: false },
            { keyword_text: 'support 2', is_representative: false },
          ],
        },
      ];

      const json = exportClustersToJSON(clusters);
      const parsed = JSON.parse(json);

      expect(parsed.length).toBe(1);
      expect(parsed[0].id).toBe('cluster-1');
      expect(parsed[0].name).toBe('Test Cluster');
      expect(parsed[0].pillar).toBe('pillar keyword');
      expect(parsed[0].supports).toEqual(['support 1', 'support 2']);
      expect(parsed[0].member_count).toBe(3);
    });

    it('should handle cluster with no pillar', () => {
      const clusters: Cluster[] = [
        {
          id: 'cluster-1',
          name: 'Test',
          members: [{ keyword_text: 'keyword', is_representative: false }],
        },
      ];

      const json = exportClustersToJSON(clusters);
      const parsed = JSON.parse(json);

      expect(parsed[0].pillar).toBeNull();
    });

    it('should format JSON with pretty printing', () => {
      const clusters: Cluster[] = [
        {
          id: 'cluster-1',
          name: 'Test',
          members: [{ keyword_text: 'keyword', is_representative: true }],
        },
      ];

      const json = exportClustersToJSON(clusters);
      // Pretty-printed JSON should have newlines and indentation
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });

  describe('generateClusterExportFilename', () => {
    it('should generate filename with project ID and format', () => {
      const filename = generateClusterExportFilename(
        'project-12345678-abcd',
        'csv'
      );
      expect(filename).toMatch(/^kfp_clusters_project-_\d{8}_\d{4}\.csv$/);
    });

    it('should include first 8 chars of project ID', () => {
      const filename = generateClusterExportFilename('abcdefghijklmnop', 'csv');
      expect(filename).toContain('abcdefgh');
    });

    it('should support JSON format', () => {
      const filename = generateClusterExportFilename('project-123', 'json');
      expect(filename).toMatch(/\.json$/);
    });

    it('should include timestamp in filename', () => {
      const filename1 = generateClusterExportFilename('project-123', 'csv');
      const filename2 = generateClusterExportFilename('project-123', 'csv');
      // Filenames should be similar (same format)
      expect(filename1).toMatch(/^kfp_clusters_project-_\d{8}_\d{4}\.csv$/);
      expect(filename2).toMatch(/^kfp_clusters_project-_\d{8}_\d{4}\.csv$/);
    });
  });
});
