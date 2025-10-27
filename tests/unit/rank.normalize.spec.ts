import { describe, it, expect } from 'vitest';
import { findDomainPosition, mapSerpToRanks, type SerpItem } from '@/lib/rank/normalize';

describe('Rank Normalize', () => {
  describe('Domain Normalization', () => {
    it('should normalize domains to lowercase', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 1,
          url: 'https://EXAMPLE.COM/page',
          domain: 'EXAMPLE.COM',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.found).toBe(true);
      expect(result.position).toBe(1);
    });

    it('should remove www prefix from target domain', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 1,
          url: 'https://example.com/page',
          domain: 'example.com',
        },
      ];

      const result = findDomainPosition(results, 'www.example.com');
      expect(result.found).toBe(true);
    });

    it('should remove www prefix from result domain', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 1,
          url: 'https://www.example.com/page',
          domain: 'www.example.com',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.found).toBe(true);
    });

    it('should match domains with and without www', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 1,
          url: 'https://www.example.com/page',
          domain: 'www.example.com',
        },
      ];

      const result = findDomainPosition(results, 'www.example.com');
      expect(result.found).toBe(true);
    });

    it('should remove trailing slash from domain', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 1,
          domain: 'example.com/',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.found).toBe(true);
    });
  });

  describe('Position Extraction', () => {
    it('should extract rank_absolute as position', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 5,
          domain: 'example.com',
          url: 'https://example.com/page',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.position).toBe(5);
      expect(result.found).toBe(true);
    });

    it('should fallback to rank_group if rank_absolute missing', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_group: 3,
          domain: 'example.com',
          url: 'https://example.com/page',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.position).toBe(3);
      expect(result.found).toBe(true);
    });

    it('should prefer rank_absolute over rank_group', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 5,
          rank_group: 3,
          domain: 'example.com',
          url: 'https://example.com/page',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.position).toBe(5);
    });

    it('should return null position if both rank fields missing', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          domain: 'example.com',
          url: 'https://example.com/page',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.position).toBeNull();
      expect(result.found).toBe(true); // Found the domain but no position
    });
  });

  describe('Organic Results Only', () => {
    it('should skip non-organic results', () => {
      const results: SerpItem[] = [
        {
          type: 'paid',
          rank_absolute: 1,
          domain: 'example.com',
        },
        {
          type: 'organic',
          rank_absolute: 5,
          domain: 'example.com',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.position).toBe(5); // Should find organic, not paid
    });

    it('should skip featured snippets', () => {
      const results: SerpItem[] = [
        {
          type: 'featured_snippet',
          rank_absolute: 0,
          domain: 'example.com',
        },
        {
          type: 'organic',
          rank_absolute: 1,
          domain: 'example.com',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.position).toBe(1);
    });

    it('should skip shopping results', () => {
      const results: SerpItem[] = [
        {
          type: 'shopping',
          rank_absolute: 1,
          domain: 'example.com',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.found).toBe(false);
    });

    it('should only match organic type', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 3,
          domain: 'target.com',
        },
      ];

      const result = findDomainPosition(results, 'target.com');
      expect(result.found).toBe(true);
    });
  });

  describe('Domain Not Found', () => {
    it('should return not found for non-matching domain', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 1,
          domain: 'other.com',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.found).toBe(false);
      expect(result.position).toBeNull();
      expect(result.url).toBeNull();
    });

    it('should return not found for empty results', () => {
      const results: SerpItem[] = [];

      const result = findDomainPosition(results, 'example.com');
      expect(result.found).toBe(false);
    });

    it('should handle domain not in top positions', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 1,
          domain: 'first.com',
        },
        {
          type: 'organic',
          rank_absolute: 2,
          domain: 'second.com',
        },
      ];

      const result = findDomainPosition(results, 'notfound.com');
      expect(result.found).toBe(false);
    });
  });

  describe('URL Extraction', () => {
    it('should return URL when domain found', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 1,
          domain: 'example.com',
          url: 'https://example.com/specific-page',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.url).toBe('https://example.com/specific-page');
    });

    it('should handle missing URL gracefully', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 1,
          domain: 'example.com',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.url).toBeNull();
    });

    it('should extract domain from URL if domain field missing', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 1,
          url: 'https://example.com/page',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.found).toBe(true);
      expect(result.url).toBe('https://example.com/page');
    });

    it('should handle URL with subdomain', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 1,
          url: 'https://blog.example.com/page',
        },
      ];

      const result = findDomainPosition(results, 'blog.example.com');
      expect(result.found).toBe(true);
    });
  });

  describe('DataForSEO Response Mapping', () => {
    it('should map valid SERP response', () => {
      const serpResponse = {
        items: [
          {
            type: 'organic',
            rank_absolute: 3,
            domain: 'example.com',
            url: 'https://example.com/page',
          },
        ],
      };

      const result = mapSerpToRanks(serpResponse, 'example.com');
      expect(result.found).toBe(true);
      expect(result.position).toBe(3);
    });

    it('should handle null response', () => {
      const result = mapSerpToRanks(null, 'example.com');
      expect(result.found).toBe(false);
      expect(result.position).toBeNull();
    });

    it('should handle missing items array', () => {
      const serpResponse = {
        status: 'ok',
      };

      const result = mapSerpToRanks(serpResponse, 'example.com');
      expect(result.found).toBe(false);
    });

    it('should handle non-array items', () => {
      const serpResponse = {
        items: 'not-an-array',
      };

      const result = mapSerpToRanks(serpResponse, 'example.com');
      expect(result.found).toBe(false);
    });

    it('should handle empty items array', () => {
      const serpResponse = {
        items: [],
      };

      const result = mapSerpToRanks(serpResponse, 'example.com');
      expect(result.found).toBe(false);
    });
  });

  describe('First Match Wins', () => {
    it('should return first organic match', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 1,
          domain: 'example.com',
          url: 'https://example.com/first',
        },
        {
          type: 'organic',
          rank_absolute: 5,
          domain: 'example.com',
          url: 'https://example.com/second',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.position).toBe(1);
      expect(result.url).toBe('https://example.com/first');
    });

    it('should stop searching after first match', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 2,
          domain: 'target.com',
        },
        {
          type: 'organic',
          rank_absolute: 8,
          domain: 'target.com',
        },
      ];

      const result = findDomainPosition(results, 'target.com');
      expect(result.position).toBe(2); // First occurrence
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty domain string', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 1,
          domain: '',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.found).toBe(false);
    });

    it('should handle malformed URL', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 1,
          url: 'not-a-valid-url',
        },
      ];

      const result = findDomainPosition(results, 'example.com');
      expect(result.found).toBe(false);
    });

    it('should handle special characters in domain', () => {
      const results: SerpItem[] = [
        {
          type: 'organic',
          rank_absolute: 1,
          domain: 'example-site.com',
        },
      ];

      const result = findDomainPosition(results, 'example-site.com');
      expect(result.found).toBe(true);
    });
  });
});
