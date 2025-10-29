import { describe, it, expect, vi } from 'vitest';
import {
  checkQueryLimit,
  checkCreditLimit,
  checkFeatureAccess,
  incrementQueryCount,
  incrementCreditUsage,
  enforceAllLimits,
  LimitExceededError,
  FeatureDisabledError,
} from '@/lib/limits/enforceCredits';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// Mock entitlements
vi.mock('@/lib/billing/entitlements', () => ({
  getEntitlements: vi.fn((planId: string) => {
    const plans: Record<string, any> = {
      free: {
        planName: 'Free',
        queriesPerDay: 10,
        monthlyCredits: 100,
        features: {
          serpAnalysis: false,
          competitorAnalysis: false,
          aiInsights: false,
          exportData: false,
        },
      },
      pro: {
        planName: 'Pro',
        queriesPerDay: -1, // unlimited
        monthlyCredits: -1, // unlimited
        features: {
          serpAnalysis: true,
          competitorAnalysis: true,
          aiInsights: true,
          exportData: true,
        },
      },
    };
    return plans[planId] || plans.free;
  }),
}));

describe('limits/enforceCredits', () => {
  describe('LimitExceededError', () => {
    it('should create error with correct properties', () => {
      const error = new LimitExceededError('Test message', 'queries_per_day', 10, 10);
      expect(error.name).toBe('LimitExceededError');
      expect(error.message).toBe('Test message');
      expect(error.limitType).toBe('queries_per_day');
      expect(error.currentUsage).toBe(10);
      expect(error.limit).toBe(10);
    });
  });

  describe('FeatureDisabledError', () => {
    it('should create error with correct properties', () => {
      const error = new FeatureDisabledError('Feature disabled', 'serpAnalysis');
      expect(error.name).toBe('FeatureDisabledError');
      expect(error.message).toBe('Feature disabled');
      expect(error.feature).toBe('serpAnalysis');
    });
  });

  describe('checkQueryLimit', () => {
    it('should allow unlimited queries for pro plan', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            plan_id: 'pro',
            queries_today: 100,
            last_query_reset: new Date().toISOString(),
          },
          error: null,
        }),
      })) as any;

      const result = await checkQueryLimit('user-123');
      expect(result.allowed).toBe(true);
    });

    it('should enforce query limits for free plan', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            plan_id: 'free',
            queries_today: 10,
            last_query_reset: new Date().toISOString(),
          },
          error: null,
        }),
      })) as any;

      const result = await checkQueryLimit('user-123');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeInstanceOf(LimitExceededError);
    });
  });

  describe('checkCreditLimit', () => {
    it('should allow unlimited credits for pro plan', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            plan_id: 'pro',
            credits_used_this_month: 1000,
            credits_reset_at: new Date(Date.now() + 86400000).toISOString(),
          },
          error: null,
        }),
      })) as any;

      const result = await checkCreditLimit('user-123', 100);
      expect(result.allowed).toBe(true);
    });

    it('should enforce credit limits for free plan', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            plan_id: 'free',
            credits_used_this_month: 95,
            credits_reset_at: new Date(Date.now() + 86400000).toISOString(),
          },
          error: null,
        }),
      })) as any;

      const result = await checkCreditLimit('user-123', 10);
      expect(result.allowed).toBe(false);
      expect(result.error).toBeInstanceOf(LimitExceededError);
    });
  });

  describe('checkFeatureAccess', () => {
    it('should allow feature access for pro plan', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { plan_id: 'pro' },
          error: null,
        }),
      })) as any;

      const result = await checkFeatureAccess('user-123', 'serpAnalysis');
      expect(result.allowed).toBe(true);
    });

    it('should deny feature access for free plan', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { plan_id: 'free' },
          error: null,
        }),
      })) as any;

      const result = await checkFeatureAccess('user-123', 'serpAnalysis');
      expect(result.allowed).toBe(false);
      expect(result.error).toBeInstanceOf(FeatureDisabledError);
    });
  });

  describe('enforceAllLimits', () => {
    it('should pass all checks when limits not exceeded', async () => {
      const mockSupabase = vi.mocked((await import('@/integrations/supabase/client')).supabase);
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            plan_id: 'pro',
            queries_today: 0,
            credits_used_this_month: 0,
            last_query_reset: new Date().toISOString(),
            credits_reset_at: new Date(Date.now() + 86400000).toISOString(),
          },
          error: null,
        }),
      })) as any;

      const result = await enforceAllLimits('user-123', {
        checkQuery: true,
        requiredCredits: 10,
        feature: 'serpAnalysis',
      });

      expect(result.allowed).toBe(true);
    });
  });
});
