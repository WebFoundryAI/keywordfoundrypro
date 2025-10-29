import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateCacheKey,
  getCachedResponse,
  setCachedResponse,
  invalidateCache,
  cleanupExpiredCache,
  withCache,
  shouldBypassCache,
} from '@/lib/cache/responseCache';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('cache/responseCache', () => {
  describe('generateCacheKey', () => {
    it('should generate consistent keys for same parameters', () => {
      const params = { query: 'test', location: 'US' };
      const key1 = generateCacheKey('serp', params);
      const key2 = generateCacheKey('serp', params);
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different parameters', () => {
      const params1 = { query: 'test', location: 'US' };
      const params2 = { query: 'test', location: 'UK' };
      const key1 = generateCacheKey('serp', params1);
      const key2 = generateCacheKey('serp', params2);
      expect(key1).not.toBe(key2);
    });

    it('should sort object keys for consistent hashing', () => {
      const params1 = { z: 'value', a: 'value' };
      const params2 = { a: 'value', z: 'value' };
      const key1 = generateCacheKey('test', params1);
      const key2 = generateCacheKey('test', params2);
      expect(key1).toBe(key2);
    });
  });

  describe('shouldBypassCache', () => {
    it('should bypass cache for admin with force refresh', () => {
      expect(shouldBypassCache(true, true)).toBe(true);
    });

    it('should not bypass cache for admin without force refresh', () => {
      expect(shouldBypassCache(true, false)).toBe(false);
    });

    it('should not bypass cache for non-admin', () => {
      expect(shouldBypassCache(false, true)).toBe(false);
      expect(shouldBypassCache(false, false)).toBe(false);
    });
  });

  describe('withCache', () => {
    it('should return cached data when available', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });
      const key = 'test:key';

      // Mock cache hit
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            key,
            data: { data: 'cached' },
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3600000).toISOString(),
          },
          error: null,
        }),
      })) as any;

      const result = await withCache(key, fetcher);
      expect(result).toEqual({ data: 'cached' });
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should call fetcher on cache miss', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });
      const key = 'test:key';

      // Mock cache miss
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })) as any;

      const result = await withCache(key, fetcher);
      expect(result).toEqual({ data: 'fresh' });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when requested', async () => {
      const fetcher = vi.fn().mockResolvedValue({ data: 'fresh' });
      const key = 'test:key';

      const result = await withCache(key, fetcher, { bypassCache: true });
      expect(result).toEqual({ data: 'fresh' });
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });
});
