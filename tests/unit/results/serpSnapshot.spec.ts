import { describe, it, expect } from 'vitest';
import {
  classifyResultType,
  getFaviconUrl,
  enhanceSerpResults,
} from '@/lib/results/serpSnapshots';

describe('SERP Snapshot Utilities', () => {
  describe('classifyResultType', () => {
    it('should classify product URLs correctly', () => {
      expect(
        classifyResultType('https://amazon.com/product/123', 'amazon.com')
      ).toBe('product');
      expect(
        classifyResultType('https://example.com/shop/item', 'example.com')
      ).toBe('product');
      expect(
        classifyResultType('https://store.com/buy-now', 'store.com')
      ).toBe('product');
    });

    it('should classify forum URLs correctly', () => {
      expect(
        classifyResultType('https://reddit.com/r/coffee', 'reddit.com')
      ).toBe('forum');
      expect(
        classifyResultType('https://quora.com/question', 'quora.com')
      ).toBe('forum');
      expect(
        classifyResultType('https://example.com/forum/topic', 'example.com')
      ).toBe('forum');
    });

    it('should classify video URLs correctly', () => {
      expect(
        classifyResultType('https://youtube.com/watch?v=123', 'youtube.com')
      ).toBe('video');
      expect(
        classifyResultType('https://vimeo.com/12345', 'vimeo.com')
      ).toBe('video');
      expect(
        classifyResultType('https://example.com/video/tutorial', 'example.com')
      ).toBe('video');
    });

    it('should classify news URLs correctly', () => {
      expect(classifyResultType('https://cnn.com/article', 'cnn.com')).toBe(
        'news'
      );
      expect(classifyResultType('https://bbc.com/news/story', 'bbc.com')).toBe(
        'news'
      );
      expect(
        classifyResultType('https://example.com/news/latest', 'example.com')
      ).toBe('news');
    });

    it('should classify blog URLs correctly', () => {
      expect(
        classifyResultType('https://example.com/blog/post', 'example.com')
      ).toBe('blog');
      expect(
        classifyResultType('https://medium.com/@user/article', 'medium.com')
      ).toBe('blog');
    });

    it('should classify directory URLs correctly', () => {
      expect(
        classifyResultType('https://yelp.com/biz/business', 'yelp.com')
      ).toBe('directory');
      expect(
        classifyResultType(
          'https://yellowpages.com/listing',
          'yellowpages.com'
        )
      ).toBe('directory');
    });

    it('should return unknown for unclassifiable URLs', () => {
      expect(
        classifyResultType('https://example.com/about', 'example.com')
      ).toBe('unknown');
      expect(
        classifyResultType('https://company.com/contact', 'company.com')
      ).toBe('unknown');
    });

    it('should be case-insensitive', () => {
      expect(
        classifyResultType('https://REDDIT.COM/r/test', 'REDDIT.COM')
      ).toBe('forum');
      expect(
        classifyResultType('https://Example.com/BLOG/post', 'Example.com')
      ).toBe('blog');
    });
  });

  describe('getFaviconUrl', () => {
    it('should generate correct favicon URL', () => {
      const url = getFaviconUrl('example.com');
      expect(url).toBe(
        'https://www.google.com/s2/favicons?domain=example.com&sz=32'
      );
    });

    it('should handle different domains', () => {
      const url = getFaviconUrl('reddit.com');
      expect(url).toContain('domain=reddit.com');
      expect(url).toContain('sz=32');
    });
  });

  describe('enhanceSerpResults', () => {
    it('should enhance results with type and favicon', () => {
      const input = [
        {
          title: 'Test Blog Post',
          url: 'https://example.com/blog/post',
          domain: 'example.com',
        },
      ];

      const enhanced = enhanceSerpResults(input);

      expect(enhanced).toHaveLength(1);
      expect(enhanced[0]).toHaveProperty('type', 'blog');
      expect(enhanced[0]).toHaveProperty('favicon');
      expect(enhanced[0].favicon).toContain('example.com');
    });

    it('should add position numbers if missing', () => {
      const input = [
        { title: 'First', url: 'https://a.com', domain: 'a.com' },
        { title: 'Second', url: 'https://b.com', domain: 'b.com' },
      ];

      const enhanced = enhanceSerpResults(input);

      expect(enhanced[0].position).toBe(1);
      expect(enhanced[1].position).toBe(2);
    });

    it('should preserve existing position numbers', () => {
      const input = [
        {
          position: 5,
          title: 'Test',
          url: 'https://example.com',
          domain: 'example.com',
        },
      ];

      const enhanced = enhanceSerpResults(input);
      expect(enhanced[0].position).toBe(5);
    });

    it('should handle empty arrays', () => {
      const enhanced = enhanceSerpResults([]);
      expect(enhanced).toEqual([]);
    });

    it('should classify multiple result types correctly', () => {
      const input = [
        {
          title: 'Product',
          url: 'https://amazon.com/product/1',
          domain: 'amazon.com',
        },
        {
          title: 'Forum',
          url: 'https://reddit.com/r/test',
          domain: 'reddit.com',
        },
        {
          title: 'Blog',
          url: 'https://medium.com/article',
          domain: 'medium.com',
        },
      ];

      const enhanced = enhanceSerpResults(input);

      expect(enhanced[0].type).toBe('product');
      expect(enhanced[1].type).toBe('forum');
      expect(enhanced[2].type).toBe('blog');
    });
  });
});
