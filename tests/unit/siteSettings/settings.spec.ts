import { describe, it, expect, vi } from 'vitest';
import { getCookieBannerEnabled, setCookieBannerEnabled, getSiteSetting, setSiteSetting } from '@/lib/siteSettings';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('siteSettings', () => {
  describe('getCookieBannerEnabled', () => {
    it('should return false by default when no setting exists', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })) as any;

      const result = await getCookieBannerEnabled();
      expect(result).toBe(false);
    });

    it('should return true when setting is enabled', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { bool_value: true },
          error: null,
        }),
      })) as any;

      const result = await getCookieBannerEnabled();
      expect(result).toBe(true);
    });

    it('should return false when setting is disabled', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { bool_value: false },
          error: null,
        }),
      })) as any;

      const result = await getCookieBannerEnabled();
      expect(result).toBe(false);
    });

    it('should return false on database error', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      })) as any;

      const result = await getCookieBannerEnabled();
      expect(result).toBe(false);
    });

    it('should handle exceptions gracefully', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => {
        throw new Error('Connection error');
      }) as any;

      const result = await getCookieBannerEnabled();
      expect(result).toBe(false);
    });
  });

  describe('setCookieBannerEnabled', () => {
    it('should update cookie banner setting to true', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from = vi.fn(() => ({
        upsert: mockUpsert,
      })) as any;

      await setCookieBannerEnabled(true);

      expect(mockUpsert).toHaveBeenCalledWith(
        { key: 'cookie_banner_enabled', bool_value: true },
        { onConflict: 'key' }
      );
    });

    it('should update cookie banner setting to false', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from = vi.fn(() => ({
        upsert: mockUpsert,
      })) as any;

      await setCookieBannerEnabled(false);

      expect(mockUpsert).toHaveBeenCalledWith(
        { key: 'cookie_banner_enabled', bool_value: false },
        { onConflict: 'key' }
      );
    });

    it('should throw error on database failure', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Permission denied' },
        }),
      })) as any;

      await expect(setCookieBannerEnabled(true)).rejects.toThrow('Permission denied');
    });
  });

  describe('getSiteSetting', () => {
    it('should retrieve a site setting by key', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            key: 'test_key',
            bool_value: true,
            json_value: null,
            updated_at: '2025-10-29T00:00:00Z',
          },
          error: null,
        }),
      })) as any;

      const result = await getSiteSetting('test_key');
      expect(result).toBeTruthy();
      expect(result?.key).toBe('test_key');
      expect(result?.bool_value).toBe(true);
    });

    it('should return null when setting does not exist', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })) as any;

      const result = await getSiteSetting('nonexistent');
      expect(result).toBe(null);
    });
  });

  describe('setSiteSetting', () => {
    it('should set a boolean site setting', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from = vi.fn(() => ({
        upsert: mockUpsert,
      })) as any;

      await setSiteSetting('feature_flag', true);

      expect(mockUpsert).toHaveBeenCalledWith(
        {
          key: 'feature_flag',
          bool_value: true,
          json_value: null,
        },
        { onConflict: 'key' }
      );
    });

    it('should set a JSON site setting', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from = vi.fn(() => ({
        upsert: mockUpsert,
      })) as any;

      const jsonData = { theme: 'dark', locale: 'en-US' };
      await setSiteSetting('ui_preferences', undefined, jsonData);

      expect(mockUpsert).toHaveBeenCalledWith(
        {
          key: 'ui_preferences',
          bool_value: null,
          json_value: jsonData,
        },
        { onConflict: 'key' }
      );
    });
  });
});
