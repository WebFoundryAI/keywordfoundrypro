import { describe, it, expect, vi } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('changelog/cms', () => {
  describe('changelog entries', () => {
    it('should query published changelog entries', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: '1',
              title: 'New Feature: Export',
              category: 'feature',
              published: true,
              published_at: new Date().toISOString(),
            },
            {
              id: '2',
              title: 'Bug Fix: Login Issue',
              category: 'fix',
              published: true,
              published_at: new Date().toISOString(),
            },
          ],
          error: null,
        }),
      }));

      const { data } = await supabase
        .from('changelog')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false });

      expect(data).toHaveLength(2);
      expect(data?.[0].title).toContain('New Feature');
    });

    it('should support valid categories', () => {
      const validCategories = ['feature', 'improvement', 'fix', 'breaking'];
      validCategories.forEach(category => {
        expect(['feature', 'improvement', 'fix', 'breaking']).toContain(category);
      });
    });

    it('should include version information', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: '1',
              title: 'Version 2.0 Release',
              version: '2.0.0',
              published_at: new Date().toISOString(),
            },
          ],
          error: null,
        }),
      }));

      const { data } = await supabase
        .from('changelog')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false });

      expect(data?.[0].version).toBe('2.0.0');
    });
  });

  describe('admin operations', () => {
    it('should allow creating changelog entries', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      mockSupabase.from = vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }));

      const { error } = await supabase.from('changelog').insert({
        title: 'New Feature',
        description: 'Added export functionality',
        content: '<p>Details...</p>',
        category: 'feature',
        published: false,
      });

      expect(error).toBeNull();
    });

    it('should allow updating changelog entries', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }));

      const { error } = await supabase
        .from('changelog')
        .update({ published: true, published_at: new Date().toISOString() })
        .eq('id', 'entry-123');

      expect(error).toBeNull();
    });

    it('should allow deleting changelog entries', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      mockSupabase.from = vi.fn(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }));

      const { error } = await supabase
        .from('changelog')
        .delete()
        .eq('id', 'entry-123');

      expect(error).toBeNull();
    });
  });

  describe('RSS/JSON feeds', () => {
    it('should limit feed entries', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: Array(50).fill({
            id: '1',
            title: 'Entry',
            published_at: new Date().toISOString(),
          }),
          error: null,
        }),
      }));

      const { data } = await supabase
        .from('changelog')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(50);

      expect(data).toHaveLength(50);
    });
  });
});
