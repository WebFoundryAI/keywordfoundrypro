import { describe, it, expect } from 'vitest';
import {
  getEntitlements,
  isUnlimited,
  isOverLimit,
  getUsagePercentage,
  getUsageLevel,
  getPlanFromStripePrice,
  PLANS,
} from '@/lib/billing/entitlements';

describe('entitlements.ts - plan limits and features', () => {
  describe('getEntitlements', () => {
    it('should return free plan for invalid plan ID', () => {
      const entitlements = getEntitlements('invalid');
      expect(entitlements.planId).toBe('free');
    });

    it('should return correct entitlements for each plan', () => {
      expect(getEntitlements('free').planName).toBe('Free');
      expect(getEntitlements('trial').planName).toBe('Trial');
      expect(getEntitlements('pro').planName).toBe('Pro');
      expect(getEntitlements('enterprise').planName).toBe('Enterprise');
    });

    it('should handle case-insensitive plan IDs', () => {
      expect(getEntitlements('FREE').planId).toBe('free');
      expect(getEntitlements('Pro').planId).toBe('pro');
    });

    it('should return correct features for each plan', () => {
      expect(PLANS.free.features.serpAnalysis).toBe(false);
      expect(PLANS.pro.features.serpAnalysis).toBe(true);
      expect(PLANS.enterprise.features.customIntegrations).toBe(true);
    });
  });

  describe('isUnlimited', () => {
    it('should return true for -1', () => {
      expect(isUnlimited(-1)).toBe(true);
    });

    it('should return false for positive numbers', () => {
      expect(isUnlimited(0)).toBe(false);
      expect(isUnlimited(100)).toBe(false);
    });
  });

  describe('isOverLimit', () => {
    it('should return false for unlimited limits', () => {
      expect(isOverLimit(1000, -1)).toBe(false);
    });

    it('should return true when usage meets or exceeds limit', () => {
      expect(isOverLimit(100, 100)).toBe(true);
      expect(isOverLimit(101, 100)).toBe(true);
    });

    it('should return false when usage is below limit', () => {
      expect(isOverLimit(50, 100)).toBe(false);
    });
  });

  describe('getUsagePercentage', () => {
    it('should return 0 for unlimited limits', () => {
      expect(getUsagePercentage(1000, -1)).toBe(0);
    });

    it('should return 100 for zero limit', () => {
      expect(getUsagePercentage(10, 0)).toBe(100);
    });

    it('should calculate correct percentage', () => {
      expect(getUsagePercentage(50, 100)).toBe(50);
      expect(getUsagePercentage(75, 100)).toBe(75);
    });

    it('should cap at 100%', () => {
      expect(getUsagePercentage(150, 100)).toBe(100);
    });
  });

  describe('getUsageLevel', () => {
    it('should return "none" for low usage', () => {
      expect(getUsageLevel(50, 100)).toBe('none');
    });

    it('should return "warning" for >=80% usage', () => {
      expect(getUsageLevel(80, 100)).toBe('warning');
      expect(getUsageLevel(90, 100)).toBe('warning');
    });

    it('should return "critical" for >=100% usage', () => {
      expect(getUsageLevel(100, 100)).toBe('critical');
      expect(getUsageLevel(150, 100)).toBe('critical');
    });
  });

  describe('getPlanFromStripePrice', () => {
    it('should return free for unknown price ID', () => {
      expect(getPlanFromStripePrice('unknown')).toBe('free');
    });

    it('should map price IDs to plan IDs', () => {
      expect(getPlanFromStripePrice('price_free')).toBe('free');
      expect(getPlanFromStripePrice('price_pro_monthly')).toBe('pro');
    });
  });

  describe('PLANS constants', () => {
    it('should have correct limits for free plan', () => {
      expect(PLANS.free.queriesPerDay).toBe(5);
      expect(PLANS.free.monthlyCredits).toBe(100);
      expect(PLANS.free.maxRowsPerExport).toBe(100);
    });

    it('should have unlimited limits for enterprise', () => {
      expect(PLANS.enterprise.queriesPerDay).toBe(-1);
      expect(PLANS.enterprise.monthlyCredits).toBe(-1);
      expect(PLANS.enterprise.maxRowsPerExport).toBe(-1);
    });
  });
});
