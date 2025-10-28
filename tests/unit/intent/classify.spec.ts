import { describe, it, expect } from 'vitest';
import {
  classifyIntent,
  classifyIntentBatch,
  getIntentLabel,
  getIntentColor,
} from '@/lib/intent/classify';
import { SearchIntent } from '@/lib/intent/types';

describe('Intent Classification', () => {
  describe('classifyIntent', () => {
    describe('informational intent', () => {
      it('should classify how-to queries as informational', () => {
        const result = classifyIntent('how to make coffee');
        expect(result.intent).toBe('informational');
        expect(result.confidence).toBeGreaterThan(0);
      });

      it('should classify what queries as informational', () => {
        const result = classifyIntent('what is a latte');
        expect(result.intent).toBe('informational');
      });

      it('should classify guide queries as informational', () => {
        const result = classifyIntent('guide to cold brew');
        expect(result.intent).toBe('informational');
      });

      it('should classify learn queries as informational', () => {
        const result = classifyIntent('learn coffee roasting');
        expect(result.intent).toBe('informational');
      });
    });

    describe('navigational intent', () => {
      it('should classify near me queries as navigational', () => {
        const result = classifyIntent('coffee shop near me');
        expect(result.intent).toBe('navigational');
      });

      it('should classify login queries as navigational', () => {
        const result = classifyIntent('login starbucks account');
        expect(result.intent).toBe('navigational');
      });

      it('should classify official site queries as navigational', () => {
        const result = classifyIntent('official dunkin website');
        expect(result.intent).toBe('navigational');
      });
    });

    describe('transactional intent', () => {
      it('should classify buy queries as transactional', () => {
        const result = classifyIntent('buy espresso machine');
        expect(result.intent).toBe('transactional');
      });

      it('should classify purchase queries as transactional', () => {
        const result = classifyIntent('purchase coffee beans online');
        expect(result.intent).toBe('transactional');
      });

      it('should classify price queries as transactional', () => {
        const result = classifyIntent('nespresso machine price');
        expect(result.intent).toBe('transactional');
      });

      it('should classify discount queries as transactional', () => {
        const result = classifyIntent('coffee subscription discount');
        expect(result.intent).toBe('transactional');
      });
    });

    describe('commercial intent', () => {
      it('should classify best queries as commercial', () => {
        const result = classifyIntent('best coffee maker');
        expect(result.intent).toBe('commercial');
      });

      it('should classify review queries as commercial', () => {
        const result = classifyIntent('review espresso machines');
        expect(result.intent).toBe('commercial');
      });

      it('should classify comparison queries as commercial', () => {
        const result = classifyIntent('compare french press vs aeropress');
        expect(result.intent).toBe('commercial');
      });

      it('should classify vs queries as commercial', () => {
        const result = classifyIntent('latte vs cappuccino');
        expect(result.intent).toBe('commercial');
      });
    });

    describe('SERP feature enhancement', () => {
      it('should boost confidence with matching SERP features', () => {
        const withoutFeatures = classifyIntent('how to brew coffee');
        const withFeatures = classifyIntent('how to brew coffee', [
          'featured_snippet',
          'paa',
        ]);

        expect(withFeatures.confidence).toBeGreaterThanOrEqual(
          withoutFeatures.confidence
        );
      });

      it('should add SERP feature signals', () => {
        const result = classifyIntent('best coffee maker', ['reviews', 'paa']);
        expect(result.signals.some((s) => s.includes('SERP'))).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle empty keyword', () => {
        const result = classifyIntent('');
        expect(result.intent).toBeTruthy();
        expect(result.confidence).toBeLessThanOrEqual(1);
      });

      it('should be case-insensitive', () => {
        const lower = classifyIntent('how to make coffee');
        const upper = classifyIntent('HOW TO MAKE COFFEE');
        expect(lower.intent).toBe(upper.intent);
      });

      it('should default to informational for unclear queries', () => {
        const result = classifyIntent('coffee');
        expect(result.intent).toBe('informational');
      });
    });
  });

  describe('classifyIntentBatch', () => {
    it('should classify multiple keywords', () => {
      const keywords = [
        { keyword: 'how to brew coffee' },
        { keyword: 'buy coffee beans' },
        { keyword: 'best coffee maker' },
      ];

      const results = classifyIntentBatch(keywords);

      expect(results).toHaveLength(3);
      expect(results[0].classification.intent).toBe('informational');
      expect(results[1].classification.intent).toBe('transactional');
      expect(results[2].classification.intent).toBe('commercial');
    });

    it('should handle SERP features in batch', () => {
      const keywords = [
        { keyword: 'how to brew coffee', serpFeatures: ['featured_snippet'] },
      ];

      const results = classifyIntentBatch(keywords);
      expect(results[0].classification.signals.length).toBeGreaterThan(0);
    });

    it('should handle empty array', () => {
      const results = classifyIntentBatch([]);
      expect(results).toEqual([]);
    });
  });

  describe('getIntentLabel', () => {
    it('should return proper labels for all intents', () => {
      expect(getIntentLabel('informational')).toBe('Informational');
      expect(getIntentLabel('navigational')).toBe('Navigational');
      expect(getIntentLabel('commercial')).toBe('Commercial');
      expect(getIntentLabel('transactional')).toBe('Transactional');
    });
  });

  describe('getIntentColor', () => {
    it('should return color class for all intents', () => {
      const intents: SearchIntent[] = [
        'informational',
        'navigational',
        'commercial',
        'transactional',
      ];

      intents.forEach((intent) => {
        const color = getIntentColor(intent);
        expect(color).toBeTruthy();
        expect(typeof color).toBe('string');
        expect(color.length).toBeGreaterThan(0);
      });
    });

    it('should return different colors for different intents', () => {
      const colors = [
        getIntentColor('informational'),
        getIntentColor('navigational'),
        getIntentColor('commercial'),
        getIntentColor('transactional'),
      ];

      // All colors should be unique
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(4);
    });
  });
});
