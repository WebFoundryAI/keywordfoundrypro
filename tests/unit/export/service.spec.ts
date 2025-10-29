import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportData, generateFilename, getExportHistory, type ExportOptions } from '@/lib/export/index';

// Mock DOM APIs for file download
beforeEach(() => {
  // Mock document.createElement, appendChild, removeChild
  global.document = {
    createElement: vi.fn(() => ({
      click: vi.fn(),
      href: '',
      download: '',
    })),
    body: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    },
  } as any;

  // Mock URL APIs
  global.URL = {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  } as any;

  // Mock Blob
  global.Blob = vi.fn() as any;
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

describe('export/service', () => {
  const sampleColumns = [
    { field: 'keyword', header: 'Keyword' },
    { field: 'volume', header: 'Volume' },
    { field: 'difficulty', header: 'Difficulty' },
  ];

  const sampleData = [
    { keyword: 'test', volume: 1000, difficulty: 50 },
    { keyword: 'example', volume: 500, difficulty: 30 },
  ];

  describe('exportData - CSV format', () => {
    it('should export data to CSV format successfully', () => {
      const options: ExportOptions = {
        type: 'csv',
        columns: sampleColumns,
        data: sampleData,
      };

      const result = exportData(options);
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(2);
      expect(result.filename).toContain('.csv');
    });

    it('should handle empty data', () => {
      const options: ExportOptions = {
        type: 'csv',
        columns: sampleColumns,
        data: [],
      };

      const result = exportData(options);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No data');
    });

    it('should handle missing columns', () => {
      const options: ExportOptions = {
        type: 'csv',
        columns: [],
        data: sampleData,
      };

      const result = exportData(options);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No columns');
    });
  });

  describe('exportData - TSV format', () => {
    it('should export data to TSV format successfully', () => {
      const options: ExportOptions = {
        type: 'tsv',
        columns: sampleColumns,
        data: sampleData,
      };

      const result = exportData(options);
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(2);
      expect(result.filename).toContain('.tsv');
    });
  });

  describe('exportData - JSON format', () => {
    it('should export data to JSON format successfully', () => {
      const options: ExportOptions = {
        type: 'json',
        columns: sampleColumns,
        data: sampleData,
      };

      const result = exportData(options);
      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(2);
      expect(result.filename).toContain('.json');
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with project ID', () => {
      const filename = generateFilename('csv', 'project-123');
      expect(filename).toContain('project-');
      expect(filename).toContain('.csv');
    });

    it('should generate filename without project ID', () => {
      const filename = generateFilename('csv');
      expect(filename).toContain('kfp_export');
      expect(filename).toContain('.csv');
    });

    it('should use custom filename when provided', () => {
      const filename = generateFilename('csv', undefined, 'custom.csv');
      expect(filename).toBe('custom.csv');
    });

    it('should handle different file types', () => {
      expect(generateFilename('csv')).toContain('.csv');
      expect(generateFilename('tsv')).toContain('.tsv');
      expect(generateFilename('json')).toContain('.json');
    });
  });

  describe('getExportHistory', () => {
    it('should fetch export history', async () => {
      const result = await getExportHistory();
      expect(result.exports).toBeInstanceOf(Array);
    });

    it('should filter by project ID', async () => {
      const result = await getExportHistory('project-123');
      expect(result.exports).toBeInstanceOf(Array);
    });

    it('should handle unauthenticated users', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await getExportHistory();
      expect(result.exports).toEqual([]);
      expect(result.error).toContain('authenticated');
    });
  });
});
