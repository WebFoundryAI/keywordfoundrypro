import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getConsent,
  setConsent,
  shouldLoadAnalytics,
  hasConsent,
  clearConsent,
} from '@/lib/legal/consent';

// Mock document.cookie
const mockCookies: Record<string, string> = {};

beforeEach(() => {
  // Reset cookies before each test
  Object.keys(mockCookies).forEach((key) => delete mockCookies[key]);

  // Mock document.cookie getter/setter
  Object.defineProperty(document, 'cookie', {
    get: () => {
      return Object.entries(mockCookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    },
    set: (cookie: string) => {
      const [keyValue] = cookie.split(';');
      const [key, value] = keyValue.split('=');
      if (value) {
        mockCookies[key.trim()] = value.trim();
      } else {
        delete mockCookies[key.trim()];
      }
    },
    configurable: true,
  });
});

describe('consent.ts - cookie consent management', () => {
  describe('setConsent and getConsent', () => {
    it('should set and get consent level', () => {
      setConsent('all');
      const consent = getConsent();
      expect(consent?.level).toBe('all');
    });

    it('should store timestamp with consent', () => {
      const before = Date.now();
      setConsent('essential');
      const consent = getConsent();
      const after = Date.now();

      expect(consent?.timestamp).toBeGreaterThanOrEqual(before);
      expect(consent?.timestamp).toBeLessThanOrEqual(after);
    });

    it('should handle all consent levels', () => {
      setConsent('all');
      expect(getConsent()?.level).toBe('all');

      setConsent('essential');
      expect(getConsent()?.level).toBe('essential');

      setConsent('none');
      expect(getConsent()?.level).toBe('none');
    });
  });

  describe('hasConsent', () => {
    it('should return false when no consent is set', () => {
      expect(hasConsent()).toBe(false);
    });

    it('should return true when consent is set', () => {
      setConsent('all');
      expect(hasConsent()).toBe(true);
    });
  });

  describe('shouldLoadAnalytics', () => {
    it('should return true only when consent is "all"', () => {
      setConsent('all');
      expect(shouldLoadAnalytics()).toBe(true);

      setConsent('essential');
      expect(shouldLoadAnalytics()).toBe(false);

      setConsent('none');
      expect(shouldLoadAnalytics()).toBe(false);
    });

    it('should return false when no consent is set', () => {
      expect(shouldLoadAnalytics()).toBe(false);
    });
  });

  describe('clearConsent', () => {
    it('should remove consent cookie', () => {
      setConsent('all');
      expect(hasConsent()).toBe(true);

      clearConsent();
      expect(hasConsent()).toBe(false);
    });
  });
});
