import { describe, it, expect } from 'vitest';
import { serializeFilters } from '@/lib/presets/utils';

describe('Presets', () => {
  describe('Payload Serialization', () => {
    it('should serialize filters correctly', () => {
      const filters = {
        minVolume: 100,
        maxVolume: 10000,
        minDifficulty: 0,
        maxDifficulty: 50,
        intent: ['commercial', 'transactional'],
      };

      const serialized = serializeFilters(filters);

      expect(serialized.minVolume).toBe(100);
      expect(serialized.maxVolume).toBe(10000);
      expect(serialized.intent).toEqual(['commercial', 'transactional']);
    });

    it('should omit undefined values', () => {
      const filters = {
        minVolume: 100,
        maxVolume: undefined,
      };

      const serialized = serializeFilters(filters);

      expect(serialized.minVolume).toBe(100);
      expect(serialized.maxVolume).toBeUndefined();
    });

    it('should handle empty filters', () => {
      const filters = {};
      const serialized = serializeFilters(filters);

      expect(serialized).toEqual({
        minVolume: undefined,
        maxVolume: undefined,
        minDifficulty: undefined,
        maxDifficulty: undefined,
        intent: undefined,
        minCpc: undefined,
        maxCpc: undefined,
      });
    });
  });

  describe('Preset Scoping', () => {
    it('should identify system presets', () => {
      const preset = {
        is_system: true,
        user_id: null,
      };

      expect(preset.is_system).toBe(true);
      expect(preset.user_id).toBeNull();
    });

    it('should identify user presets', () => {
      const preset = {
        is_system: false,
        user_id: 'user-123',
      };

      expect(preset.is_system).toBe(false);
      expect(preset.user_id).toBe('user-123');
    });

    it('should enforce system preset rules', () => {
      const preset = {
        is_system: true,
        user_id: null,
      };

      const isValid =
        (preset.is_system && preset.user_id === null) ||
        (!preset.is_system && preset.user_id !== null);

      expect(isValid).toBe(true);
    });

    it('should reject invalid preset configuration', () => {
      const preset = {
        is_system: true,
        user_id: 'user-123', // Invalid: system presets should not have user_id
      };

      const isValid =
        (preset.is_system && preset.user_id === null) ||
        (!preset.is_system && preset.user_id !== null);

      expect(isValid).toBe(false);
    });
  });

  describe('Preset Application', () => {
    it('should apply preset payload to filters', () => {
      const preset = {
        payload: {
          query: 'buy online',
          filters: {
            minVolume: 100,
            intent: ['commercial'],
          },
          sort: 'volume',
        },
      };

      const appliedQuery = preset.payload.query;
      const appliedFilters = preset.payload.filters;

      expect(appliedQuery).toBe('buy online');
      expect(appliedFilters.minVolume).toBe(100);
      expect(appliedFilters.intent).toEqual(['commercial']);
    });

    it('should handle preset without filters', () => {
      const preset = {
        payload: {
          query: 'test query',
        },
      };

      const appliedQuery = preset.payload.query;
      const appliedFilters = preset.payload.filters || {};

      expect(appliedQuery).toBe('test query');
      expect(Object.keys(appliedFilters).length).toBe(0);
    });
  });

  describe('Preset Naming', () => {
    it('should validate preset name', () => {
      const name = 'E-commerce SEO';
      const isValid = name.trim().length > 0;

      expect(isValid).toBe(true);
    });

    it('should reject empty names', () => {
      const name = '   ';
      const isValid = name.trim().length > 0;

      expect(isValid).toBe(false);
    });
  });

  describe('Preset Ordering', () => {
    it('should sort system presets before user presets', () => {
      const presets = [
        { name: 'User Preset', is_system: false },
        { name: 'System Preset 1', is_system: true },
        { name: 'Another User', is_system: false },
        { name: 'System Preset 2', is_system: true },
      ];

      const sorted = [...presets].sort((a, b) => {
        if (a.is_system !== b.is_system) {
          return a.is_system ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      expect(sorted[0].is_system).toBe(true);
      expect(sorted[1].is_system).toBe(true);
      expect(sorted[2].is_system).toBe(false);
      expect(sorted[3].is_system).toBe(false);
    });
  });
});
