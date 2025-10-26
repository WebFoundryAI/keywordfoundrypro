import enTranslations from './locales/en.json';

type TranslationKey = keyof typeof enTranslations;

const translations: Record<string, typeof enTranslations> = {
  en: enTranslations,
};

let currentLocale = 'en';

export function setLocale(locale: string): void {
  if (translations[locale]) {
    currentLocale = locale;
  }
}

export function t(key: TranslationKey, params?: Record<string, string>): string {
  let translation = translations[currentLocale][key] || key;

  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      translation = translation.replace(`{{${param}}}`, value);
    });
  }

  return translation;
}

export function getLocale(): string {
  return currentLocale;
}
