import { describe, it, expect } from 'vitest';
import {
  searchDocs,
  getAllDocs,
  getDocBySlug,
  getDocsByCategory,
  extractHeadings,
} from '@/lib/docs/docsContent';

describe('Documentation Search', () => {
  describe('getAllDocs', () => {
    it('should return all documentation pages', () => {
      const docs = getAllDocs();

      expect(docs.length).toBeGreaterThan(0);
      expect(docs.every((doc) => doc.slug)).toBe(true);
      expect(docs.every((doc) => doc.title)).toBe(true);
      expect(docs.every((doc) => doc.content)).toBe(true);
    });

    it('should include expected doc slugs', () => {
      const docs = getAllDocs();
      const slugs = docs.map((doc) => doc.slug);

      expect(slugs).toContain('quickstart');
      expect(slugs).toContain('filters');
      expect(slugs).toContain('exports');
      expect(slugs).toContain('limits');
    });
  });

  describe('getDocBySlug', () => {
    it('should return doc for valid slug', () => {
      const doc = getDocBySlug('quickstart');

      expect(doc).toBeDefined();
      expect(doc?.slug).toBe('quickstart');
      expect(doc?.title).toBeTruthy();
    });

    it('should return null for invalid slug', () => {
      const doc = getDocBySlug('nonexistent');

      expect(doc).toBeNull();
    });

    it('should return correct doc content', () => {
      const doc = getDocBySlug('limits');

      expect(doc).toBeDefined();
      expect(doc?.content).toContain('Plan');
    });
  });

  describe('searchDocs', () => {
    it('should return all docs for empty query', () => {
      const results = searchDocs('');

      expect(results.length).toBe(getAllDocs().length);
    });

    it('should find docs by title match', () => {
      const results = searchDocs('Getting Started');

      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((doc) => doc.title.includes('Getting Started'))
      ).toBe(true);
    });

    it('should find docs by content match', () => {
      const results = searchDocs('export');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((doc) => doc.slug === 'exports')).toBe(true);
    });

    it('should find docs by description match', () => {
      const results = searchDocs('filter');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case-insensitive', () => {
      const lower = searchDocs('export');
      const upper = searchDocs('EXPORT');
      const mixed = searchDocs('ExPoRt');

      expect(lower.length).toBe(upper.length);
      expect(lower.length).toBe(mixed.length);
    });

    it('should return no results for non-matching query', () => {
      const results = searchDocs('xyzabc123nonexistent');

      expect(results.length).toBe(0);
    });

    it('should handle special characters', () => {
      const results = searchDocs('Plans & Limits');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should find partial matches', () => {
      const results = searchDocs('fil');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((doc) => doc.slug === 'filters')).toBe(true);
    });

    it('should find docs by category', () => {
      const results = searchDocs('Features');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getDocsByCategory', () => {
    it('should group docs by category', () => {
      const grouped = getDocsByCategory();

      expect(Object.keys(grouped).length).toBeGreaterThan(0);
      expect(grouped).toHaveProperty('Getting Started');
      expect(grouped).toHaveProperty('Features');
      expect(grouped).toHaveProperty('Account');
    });

    it('should have docs in each category', () => {
      const grouped = getDocsByCategory();

      Object.values(grouped).forEach((docs) => {
        expect(docs.length).toBeGreaterThan(0);
        expect(docs.every((doc) => doc.slug)).toBe(true);
      });
    });

    it('should maintain category consistency', () => {
      const grouped = getDocsByCategory();

      Object.entries(grouped).forEach(([category, docs]) => {
        docs.forEach((doc) => {
          expect(doc.category).toBe(category);
        });
      });
    });
  });

  describe('extractHeadings', () => {
    it('should extract H1 headings', () => {
      const content = '# Main Title\n\nSome content.';
      const headings = extractHeadings(content);

      expect(headings.length).toBeGreaterThan(0);
      expect(headings[0].level).toBe(1);
      expect(headings[0].text).toBe('Main Title');
    });

    it('should extract multiple heading levels', () => {
      const content = `
# Title 1
## Title 2
### Title 3
`;
      const headings = extractHeadings(content);

      expect(headings.length).toBe(3);
      expect(headings[0].level).toBe(1);
      expect(headings[1].level).toBe(2);
      expect(headings[2].level).toBe(3);
    });

    it('should generate IDs from headings', () => {
      const content = '## Getting Started';
      const headings = extractHeadings(content);

      expect(headings[0].id).toBe('getting-started');
    });

    it('should handle special characters in headings', () => {
      const content = '## Plans & Limits';
      const headings = extractHeadings(content);

      expect(headings[0].id).toBe('plans-limits'); // & is removed, leaving one hyphen
    });

    it('should handle empty content', () => {
      const headings = extractHeadings('');

      expect(headings.length).toBe(0);
    });

    it('should extract headings from actual doc content', () => {
      const doc = getDocBySlug('quickstart');

      if (doc) {
        const headings = extractHeadings(doc.content);

        expect(headings.length).toBeGreaterThan(0);
        expect(headings.some((h) => h.text.toLowerCase().includes('start'))).toBe(true);
      }
    });
  });

  describe('Search Quality', () => {
    it('should rank exact title matches highly', () => {
      const results = searchDocs('Getting Started');

      if (results.length > 0) {
        expect(results[0].title).toContain('Getting Started');
      }
    });

    it('should find relevant docs for common terms', () => {
      const exportResults = searchDocs('export');
      const filterResults = searchDocs('filter');
      const limitResults = searchDocs('limit');

      expect(exportResults.length).toBeGreaterThan(0);
      expect(filterResults.length).toBeGreaterThan(0);
      expect(limitResults.length).toBeGreaterThan(0);
    });

    it('should handle multi-word queries', () => {
      const results = searchDocs('search volume');

      expect(results.length).toBeGreaterThan(0);
    });
  });
});
