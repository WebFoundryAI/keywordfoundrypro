import { describe, it, expect } from 'vitest';
import { validateCsvHeader, validateJson, validateCsv } from '@/lib/batch/validator';

describe('Batch Validator', () => {
  describe('CSV Header Validation', () => {
    it('should require keyword column', () => {
      const header = ['country', 'language'];
      const result = validateCsvHeader(header);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept keyword variations', () => {
      const variations = ['keyword', 'keywords', 'query', 'term'];

      variations.forEach((variant) => {
        const header = [variant, 'country'];
        const result = validateCsvHeader(header);
        expect(result.valid).toBe(true);
      });
    });

    it('should map header columns', () => {
      const header = ['keyword', 'country', 'language', 'note'];
      const result = validateCsvHeader(header);

      expect(result.mapping.keyword).toBe(0);
      expect(result.mapping.country).toBe(1);
      expect(result.mapping.language).toBe(2);
      expect(result.mapping.note).toBe(3);
    });

    it('should be case insensitive', () => {
      const header = ['KEYWORD', 'Country', 'LANGUAGE'];
      const result = validateCsvHeader(header);

      expect(result.valid).toBe(true);
      expect(result.mapping.keyword).toBe(0);
    });
  });

  describe('CSV Row Validation', () => {
    it('should validate keyword is required', () => {
      const csvContent = 'keyword,country\n,United States';
      const result = validateCsv(csvContent);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('keyword');
    });

    it('should validate keyword length', () => {
      const longKeyword = 'a'.repeat(201);
      const csvContent = `keyword\n${longKeyword}`;
      const result = validateCsv(csvContent);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('maximum length');
    });

    it('should include line numbers in errors', () => {
      const csvContent = 'keyword\n\nvalid keyword';
      const result = validateCsv(csvContent);

      if (result.errors.length > 0) {
        expect(result.errors[0].line).toBeGreaterThan(1);
      }
    });

    it('should accept valid rows', () => {
      const csvContent = 'keyword,country\ntest keyword,United States\nother keyword,Canada';
      const result = validateCsv(csvContent);

      expect(result.valid).toBe(true);
      expect(result.rows.length).toBe(2);
      expect(result.rows[0].keyword).toBe('test keyword');
    });
  });

  describe('JSON Validation', () => {
    it('should require array input', () => {
      const invalidData = { keyword: 'test' };
      const result = validateJson(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('array');
    });

    it('should validate each object', () => {
      const data = [
        { keyword: 'test1' },
        { keyword: 'test2' },
      ];

      const result = validateJson(data);
      expect(result.valid).toBe(true);
      expect(result.rows.length).toBe(2);
    });

    it('should require keyword field', () => {
      const data = [{ country: 'US' }];
      const result = validateJson(data);

      expect(result.valid).toBe(false);
      expect(result.errors[0].field).toBe('keyword');
    });

    it('should validate keyword type', () => {
      const data = [{ keyword: 123 }];
      const result = validateJson(data);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('string');
    });

    it('should handle optional fields', () => {
      const data = [
        {
          keyword: 'test',
          country: 'United States',
          language: 'en',
          note: 'Test note',
        },
      ];

      const result = validateJson(data);
      expect(result.valid).toBe(true);
      expect(result.rows[0].country).toBe('United States');
      expect(result.rows[0].note).toBe('Test note');
    });

    it('should trim whitespace', () => {
      const data = [
        { keyword: '  test keyword  ' },
      ];

      const result = validateJson(data);
      expect(result.valid).toBe(true);
      expect(result.rows[0].keyword).toBe('test keyword');
    });
  });

  describe('Error Reporting', () => {
    it('should include field name in errors', () => {
      const data = [{ keyword: '' }];
      const result = validateJson(data);

      expect(result.errors[0].field).toBe('keyword');
    });

    it('should include helpful error messages', () => {
      const data = [{ keyword: 123 }];
      const result = validateJson(data);

      expect(result.errors[0].message).toBeTruthy();
      expect(result.errors[0].message.length).toBeGreaterThan(0);
    });
  });
});
