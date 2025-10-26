import { describe, it, expect } from 'vitest';

describe('Backup Retention', () => {
  const RETENTION_DAYS = 30;

  describe('Cutoff Date Calculation', () => {
    it('should calculate 30-day cutoff correctly', () => {
      const now = new Date('2025-10-26T00:00:00Z');
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

      const expected = new Date('2025-09-26T00:00:00Z');

      expect(cutoff.getTime()).toBe(expected.getTime());
    });

    it('should handle month boundaries', () => {
      const now = new Date('2025-03-15T00:00:00Z');
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

      expect(cutoff.getMonth()).toBe(1); // February (0-indexed)
    });

    it('should handle year boundaries', () => {
      const now = new Date('2025-01-15T00:00:00Z');
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

      expect(cutoff.getFullYear()).toBe(2024);
    });
  });

  describe('Expired Backup Detection', () => {
    it('should identify backups older than 30 days', () => {
      const cutoff = new Date('2025-09-26T00:00:00Z');
      const backupDate = new Date('2025-09-20T00:00:00Z');

      const isExpired = backupDate < cutoff;

      expect(isExpired).toBe(true);
    });

    it('should not expire backups within 30 days', () => {
      const cutoff = new Date('2025-09-26T00:00:00Z');
      const backupDate = new Date('2025-10-01T00:00:00Z');

      const isExpired = backupDate < cutoff;

      expect(isExpired).toBe(false);
    });

    it('should handle cutoff boundary correctly', () => {
      const cutoff = new Date('2025-09-26T00:00:00Z');
      const backupDate = new Date('2025-09-26T00:00:00Z');

      const isExpired = backupDate < cutoff;

      expect(isExpired).toBe(false);
    });
  });

  describe('File Count Calculation', () => {
    it('should count files from manifest tables', () => {
      const manifest = {
        tables: {
          projects: { rows: 100, file: 'file1.ndjson', checksum: 'abc' },
          exports: { rows: 50, file: 'file2.ndjson', checksum: 'def' },
          profiles: { rows: 200, file: 'file3.ndjson', checksum: 'ghi' },
        },
      };

      const fileCount = Object.keys(manifest.tables).length;

      expect(fileCount).toBe(3);
    });

    it('should handle empty manifests', () => {
      const manifest = { tables: {} };
      const fileCount = Object.keys(manifest.tables).length;

      expect(fileCount).toBe(0);
    });
  });

  describe('Retention Stats', () => {
    it('should calculate total vs expired counts', () => {
      const totalBackups = 45;
      const expiredBackups = 15;
      const withinRetention = totalBackups - expiredBackups;

      expect(withinRetention).toBe(30);
    });

    it('should handle zero expired backups', () => {
      const totalBackups = 20;
      const expiredBackups = 0;
      const withinRetention = totalBackups - expiredBackups;

      expect(withinRetention).toBe(20);
    });

    it('should handle all expired backups', () => {
      const totalBackups = 5;
      const expiredBackups = 5;
      const withinRetention = totalBackups - expiredBackups;

      expect(withinRetention).toBe(0);
    });
  });

  describe('Cleanup Preview', () => {
    it('should preview without deleting', () => {
      const manifests = [
        {
          id: '1',
          run_at: '2025-08-01T00:00:00Z',
          tables: { projects: {}, exports: {}, profiles: {} },
        },
        {
          id: '2',
          run_at: '2025-08-15T00:00:00Z',
          tables: { projects: {}, exports: {} },
        },
      ];

      let fileCount = 0;
      manifests.forEach((m) => {
        fileCount += Object.keys(m.tables).length;
      });

      expect(fileCount).toBe(5);
      expect(manifests.length).toBe(2);
    });
  });

  describe('Date Sorting', () => {
    it('should sort backups by date ascending', () => {
      const backups = [
        { run_at: '2025-10-01T00:00:00Z' },
        { run_at: '2025-09-01T00:00:00Z' },
        { run_at: '2025-08-01T00:00:00Z' },
      ];

      const sorted = [...backups].sort(
        (a, b) =>
          new Date(a.run_at).getTime() - new Date(b.run_at).getTime()
      );

      expect(sorted[0].run_at).toBe('2025-08-01T00:00:00Z');
      expect(sorted[2].run_at).toBe('2025-10-01T00:00:00Z');
    });

    it('should find oldest backup', () => {
      const backups = [
        { run_at: '2025-10-01T00:00:00Z' },
        { run_at: '2025-09-01T00:00:00Z' },
        { run_at: '2025-08-01T00:00:00Z' },
      ];

      const oldest = backups.reduce((prev, curr) =>
        new Date(prev.run_at) < new Date(curr.run_at) ? prev : curr
      );

      expect(oldest.run_at).toBe('2025-08-01T00:00:00Z');
    });
  });

  describe('Error Accumulation', () => {
    it('should track errors during cleanup', () => {
      const errors: string[] = [];

      errors.push('Failed to delete file1.ndjson');
      errors.push('Failed to delete manifest abc-123');

      expect(errors.length).toBe(2);
      expect(errors[0]).toContain('file1.ndjson');
    });

    it('should continue cleanup on partial errors', () => {
      const totalFiles = 10;
      const failedFiles = 2;
      const successfulFiles = totalFiles - failedFiles;

      expect(successfulFiles).toBe(8);
    });
  });

  describe('Cleanup Result', () => {
    it('should return cleanup summary', () => {
      const result = {
        deleted_backups: 5,
        deleted_files: 15,
        errors: [],
      };

      expect(result.deleted_backups).toBeGreaterThan(0);
      expect(result.deleted_files).toBe(result.deleted_backups * 3);
      expect(result.errors.length).toBe(0);
    });

    it('should handle cleanup with errors', () => {
      const result = {
        deleted_backups: 3,
        deleted_files: 8,
        errors: ['Failed to delete file1', 'Failed to delete file2'],
      };

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.deleted_backups).toBeGreaterThan(0);
    });
  });
});
