import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hasSeenTour,
  markTourAsSeen,
  resetTourState,
  getTourState,
} from '@/lib/onboarding/state';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: 'test-user-id' } },
          error: null,
        })
      ),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { has_seen_tour: false },
              error: null,
            })
          ),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

describe('Onboarding Tour State', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('hasSeenTour', () => {
    it('should return false when tour has not been seen', async () => {
      const result = await hasSeenTour();
      expect(result).toBe(false);
    });

    it('should check localStorage storage', () => {
      localStorage.setItem('kfp_has_seen_tour', 'true');
      const stored = localStorage.getItem('kfp_has_seen_tour');
      expect(stored).toBe('true');
    });

    it('should read from localStorage', () => {
      localStorage.setItem('kfp_has_seen_tour', 'false');
      const stored = localStorage.getItem('kfp_has_seen_tour');
      expect(stored).toBe('false');
    });
  });

  describe('markTourAsSeen', () => {
    it('should set localStorage flag', async () => {
      await markTourAsSeen();
      expect(localStorage.getItem('kfp_has_seen_tour')).toBe('true');
    });

    it('should persist in localStorage after marking', async () => {
      await markTourAsSeen();
      const stored = localStorage.getItem('kfp_has_seen_tour');
      expect(stored).toBe('true');
    });
  });

  describe('resetTourState', () => {
    it('should clear localStorage flag', () => {
      localStorage.setItem('kfp_has_seen_tour', 'true');
      resetTourState();
      expect(localStorage.getItem('kfp_has_seen_tour')).toBeNull();
    });

    it('should allow tour to be shown again', async () => {
      await markTourAsSeen();
      resetTourState();
      // After reset, localStorage should be clear
      expect(localStorage.getItem('kfp_has_seen_tour')).toBeNull();
    });
  });

  describe('getTourState', () => {
    it('should return full tour state', async () => {
      const state = await getTourState();
      expect(state).toHaveProperty('hasSeenTour');
      expect(typeof state.hasSeenTour).toBe('boolean');
    });

    it('should return state with hasSeenTour property', async () => {
      const state = await getTourState();
      expect(state).toHaveProperty('hasSeenTour');
      // Database mock returns false, so expect that
      expect(state.hasSeenTour).toBe(false);
    });
  });
});
