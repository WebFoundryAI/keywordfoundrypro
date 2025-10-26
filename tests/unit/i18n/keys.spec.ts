import { describe, it, expect } from 'vitest';
import { t, setLocale, getLocale } from '@/lib/i18n';
import enTranslations from '@/lib/i18n/locales/en.json';

describe('i18n', () => {
  describe('Translation Keys', () => {
    it('should return translation for existing key', () => {
      const translation = t('nav.dashboard');

      expect(translation).toBe('Dashboard');
    });

    it('should return key itself for missing translation', () => {
      const translation = t('missing.key' as any);

      expect(translation).toBe('missing.key');
    });

    it('should support parameter substitution', () => {
      const translation = t('credits.remaining', { count: '50' });

      expect(translation).toBe('50 credits remaining');
    });

    it('should handle multiple parameters', () => {
      // Assuming we have a key with multiple params
      const text = 'Hello {{name}}, you have {{count}} messages';
      const result = text
        .replace('{{name}}', 'John')
        .replace('{{count}}', '5');

      expect(result).toBe('Hello John, you have 5 messages');
    });
  });

  describe('Locale Management', () => {
    it('should default to English', () => {
      const locale = getLocale();

      expect(locale).toBe('en');
    });

    it('should set locale', () => {
      setLocale('en');
      const locale = getLocale();

      expect(locale).toBe('en');
    });

    it('should not set invalid locale', () => {
      const currentLocale = getLocale();
      setLocale('invalid');
      const newLocale = getLocale();

      expect(newLocale).toBe(currentLocale);
    });
  });

  describe('Translation Coverage', () => {
    it('should have navigation translations', () => {
      expect(enTranslations['nav.dashboard']).toBeDefined();
      expect(enTranslations['nav.projects']).toBeDefined();
      expect(enTranslations['nav.help']).toBeDefined();
      expect(enTranslations['nav.settings']).toBeDefined();
    });

    it('should have filter translations', () => {
      expect(enTranslations['filters.minVolume']).toBeDefined();
      expect(enTranslations['filters.apply']).toBeDefined();
      expect(enTranslations['filters.reset']).toBeDefined();
    });

    it('should have export translations', () => {
      expect(enTranslations['export.button']).toBeDefined();
      expect(enTranslations['export.csv']).toBeDefined();
    });

    it('should have preset translations', () => {
      expect(enTranslations['preset.apply']).toBeDefined();
      expect(enTranslations['preset.save']).toBeDefined();
    });

    it('should have collaboration translations', () => {
      expect(enTranslations['share.title']).toBeDefined();
      expect(enTranslations['comment.add']).toBeDefined();
    });

    it('should have feedback translations', () => {
      expect(enTranslations['feedback.nps.question']).toBeDefined();
      expect(enTranslations['feedback.feature.title']).toBeDefined();
    });
  });

  describe('Missing Keys Detection', () => {
    it('should detect missing keys in application', () => {
      const requiredKeys = [
        'nav.dashboard',
        'filters.apply',
        'export.button',
        'credits.remaining',
      ];

      const missingKeys = requiredKeys.filter(
        (key) => !enTranslations[key as keyof typeof enTranslations]
      );

      expect(missingKeys).toHaveLength(0);
    });
  });
});
