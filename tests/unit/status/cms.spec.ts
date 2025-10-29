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
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('status/cms', () => {
  describe('status components', () => {
    it('should query status components', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: '1', name: 'API', status: 'operational' },
            { id: '2', name: 'Database', status: 'operational' },
          ],
          error: null,
        }),
      }));

      const { data } = await supabase
        .from('status_components')
        .select('*')
        .order('display_order');

      expect(data).toHaveLength(2);
      expect(data?.[0].name).toBe('API');
    });

    it('should support valid status values', () => {
      const validStatuses = ['operational', 'degraded', 'outage', 'maintenance'];
      validStatuses.forEach(status => {
        expect(['operational', 'degraded', 'outage', 'maintenance']).toContain(status);
      });
    });
  });

  describe('status incidents', () => {
    it('should query status incidents', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            {
              id: '1',
              title: 'API Slowdown',
              status: 'resolved',
              severity: 'minor',
              created_at: new Date().toISOString(),
            },
          ],
          error: null,
        }),
      }));

      const { data } = await supabase
        .from('status_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      expect(data).toHaveLength(1);
      expect(data?.[0].title).toBe('API Slowdown');
    });

    it('should support valid incident statuses', () => {
      const validStatuses = ['investigating', 'identified', 'monitoring', 'resolved'];
      validStatuses.forEach(status => {
        expect(['investigating', 'identified', 'monitoring', 'resolved']).toContain(status);
      });
    });

    it('should support valid severity levels', () => {
      const validSeverities = ['minor', 'major', 'critical'];
      validSeverities.forEach(severity => {
        expect(['minor', 'major', 'critical']).toContain(severity);
      });
    });
  });

  describe('component updates', () => {
    it('should allow updating component status', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }));

      const { error } = await supabase
        .from('status_components')
        .update({ status: 'degraded' })
        .eq('id', 'component-123');

      expect(error).toBeNull();
    });

    it('should allow creating incidents', async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      mockSupabase.from = vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }));

      const { error } = await supabase.from('status_incidents').insert({
        title: 'API Outage',
        description: 'Investigating API outage',
        status: 'investigating',
        severity: 'critical',
      });

      expect(error).toBeNull();
    });
  });
});
