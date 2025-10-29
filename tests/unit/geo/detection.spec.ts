import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectGeoLocation, isEEACountry, clearGeoCache } from '@/lib/geo';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('geo detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('isEEACountry', () => {
    it('should return true for EEA countries', () => {
      expect(isEEACountry('DE')).toBe(true); // Germany
      expect(isEEACountry('FR')).toBe(true); // France
      expect(isEEACountry('GB')).toBe(true); // UK
      expect(isEEACountry('NO')).toBe(true); // Norway
      expect(isEEACountry('IS')).toBe(true); // Iceland
    });

    it('should return false for non-EEA countries', () => {
      expect(isEEACountry('US')).toBe(false);
      expect(isEEACountry('CA')).toBe(false);
      expect(isEEACountry('AU')).toBe(false);
      expect(isEEACountry('JP')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isEEACountry('de')).toBe(true);
      expect(isEEACountry('De')).toBe(true);
      expect(isEEACountry('us')).toBe(false);
    });

    it('should return false for null or empty', () => {
      expect(isEEACountry(null)).toBe(false);
      expect(isEEACountry('')).toBe(false);
    });
  });

  describe('detectGeoLocation', () => {
    it('should detect EEA location from API', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ country_code: 'DE' }),
      } as Response);

      const result = await detectGeoLocation();
      expect(result.country).toBe('DE');
      expect(result.isEEA).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should detect non-EEA location from API', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ country_code: 'US' }),
      } as Response);

      const result = await detectGeoLocation();
      expect(result.country).toBe('US');
      expect(result.isEEA).toBe(false);
    });

    it('should cache results in localStorage', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ country_code: 'FR' }),
      } as Response);

      await detectGeoLocation();

      const cached = localStorageMock.getItem('geo_cache');
      expect(cached).toBeTruthy();
      const parsed = JSON.parse(cached!);
      expect(parsed.data.country).toBe('FR');
      expect(parsed.data.isEEA).toBe(true);
    });

    it('should use cached data if available and valid', async () => {
      // Set cache with data expiring in future
      const cacheData = {
        data: { country: 'IT', isEEA: true },
        expires: Date.now() + 10000,
      };
      localStorageMock.setItem('geo_cache', JSON.stringify(cacheData));

      const result = await detectGeoLocation();
      expect(result.country).toBe('IT');
      expect(result.isEEA).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should not use expired cache', async () => {
      // Set cache with expired data
      const cacheData = {
        data: { country: 'IT', isEEA: true },
        expires: Date.now() - 1000,
      };
      localStorageMock.setItem('geo_cache', JSON.stringify(cacheData));

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ country_code: 'ES' }),
      } as Response);

      const result = await detectGeoLocation();
      expect(result.country).toBe('ES');
      expect(fetch).toHaveBeenCalled();
    });

    it('should default to showing banner on API error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await detectGeoLocation();
      expect(result.country).toBe(null);
      expect(result.isEEA).toBe(true); // Default to showing for safety
      expect(result.error).toBeTruthy();
    });

    it('should handle API timeout', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Timeout'));

      const result = await detectGeoLocation();
      expect(result.isEEA).toBe(true); // Default to showing
      expect(result.error).toBeTruthy();
    });
  });

  describe('clearGeoCache', () => {
    it('should clear cached geo data', () => {
      localStorageMock.setItem('geo_cache', JSON.stringify({ test: 'data' }));
      expect(localStorageMock.getItem('geo_cache')).toBeTruthy();

      clearGeoCache();
      expect(localStorageMock.getItem('geo_cache')).toBe(null);
    });
  });

  describe('all EEA countries', () => {
    it('should include all 27 EU members plus EEA countries', () => {
      const eeaCountries = [
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
        'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
        'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', // 27 EU members
        'IS', 'LI', 'NO', // EEA non-EU
        'GB', // UK
      ];

      eeaCountries.forEach((country) => {
        expect(isEEACountry(country)).toBe(true);
      });
    });
  });
});
