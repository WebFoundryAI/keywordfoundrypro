import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * METRIC FORMATTING UTILITIES
 * ============================
 * These utilities standardize how we display metrics across the app.
 * 
 * KEY PRINCIPLES:
 * 1. Zero (0) is a valid metric value and should display as "0"
 * 2. Only null/undefined/NaN should display as "—" (dash)
 * 3. Never use truthy/falsy checks (|| operator) for metric values
 * 4. Always use explicit null checks (?? operator or === null)
 * 
 * EXAMPLES:
 * ✅ CORRECT:   value ?? null  (preserves 0, defaults null/undefined to null)
 * ✅ CORRECT:   value === null (explicit null check)
 * ❌ INCORRECT: value || 0      (coerces both null AND 0 to 0)
 * ❌ INCORRECT: value || '—'    (coerces 0 to '—')
 * ❌ INCORRECT: !value          (treats 0 as falsy)
 */

/**
 * Format a metric value, distinguishing between 0 and truly missing data
 * @param value - The metric value to format
 * @returns "0" for zero, "—" for null/undefined, or the value as string
 */
export function formatMetric(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  if (value === 0) {
    return "0";
  }
  return value.toString();
}

/**
 * Format a number with K/M suffixes for large values
 * @param value - The number to format
 * @returns Formatted string with K/M suffix or "—" for missing data
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  if (value === 0) {
    return "0";
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format difficulty score (0-100) or show dash for missing data
 * @param difficulty - The difficulty score
 * @returns Formatted string or "—" for missing data
 */
export function formatDifficulty(difficulty: number | null | undefined): string {
  if (difficulty === null || difficulty === undefined || isNaN(difficulty)) {
    return "—";
  }
  return difficulty.toString();
}

/**
 * Get currency symbol and format based on location code
 * @param locationCode - DataForSEO location code
 * @returns Currency configuration { symbol, code }
 */
export function getCurrencyByLocation(locationCode: number): { symbol: string; code: string } {
  // DataForSEO location codes mapped to currencies
  const currencyMap: Record<number, { symbol: string; code: string }> = {
    2826: { symbol: '£', code: 'GBP' }, // United Kingdom
    2840: { symbol: '$', code: 'USD' }, // United States
    2036: { symbol: 'A$', code: 'AUD' }, // Australia
    2124: { symbol: 'C$', code: 'CAD' }, // Canada
    2276: { symbol: '€', code: 'EUR' }, // Germany
    2250: { symbol: '€', code: 'EUR' }, // France
    2380: { symbol: '€', code: 'EUR' }, // Italy
    2724: { symbol: '€', code: 'EUR' }, // Spain
    2528: { symbol: '€', code: 'EUR' }, // Netherlands
    2056: { symbol: '€', code: 'EUR' }, // Belgium
    2040: { symbol: '€', code: 'EUR' }, // Austria
    2372: { symbol: '€', code: 'EUR' }, // Ireland
    2620: { symbol: '€', code: 'EUR' }, // Portugal
    2246: { symbol: '€', code: 'EUR' }, // Finland
    2356: { symbol: '₹', code: 'INR' }, // India
    2392: { symbol: '¥', code: 'JPY' }, // Japan
    2410: { symbol: '₩', code: 'KRW' }, // South Korea
    2156: { symbol: '¥', code: 'CNY' }, // China
    2076: { symbol: 'R$', code: 'BRL' }, // Brazil
    2484: { symbol: 'MX$', code: 'MXN' }, // Mexico
    2710: { symbol: 'R', code: 'ZAR' }, // South Africa
    2554: { symbol: 'NZ$', code: 'NZD' }, // New Zealand
    2702: { symbol: 'S$', code: 'SGD' }, // Singapore
    2764: { symbol: '฿', code: 'THB' }, // Thailand
    2752: { symbol: 'kr', code: 'SEK' }, // Sweden
    2578: { symbol: 'kr', code: 'NOK' }, // Norway
    2208: { symbol: 'kr', code: 'DKK' }, // Denmark
    2616: { symbol: 'zł', code: 'PLN' }, // Poland
    2203: { symbol: 'Kč', code: 'CZK' }, // Czech Republic
    2348: { symbol: 'Ft', code: 'HUF' }, // Hungary
    2642: { symbol: 'lei', code: 'RON' }, // Romania
  };

  return currencyMap[locationCode] || { symbol: '$', code: 'USD' }; // Default to USD
}

/**
 * Format currency value (CPC) with location-based currency
 * @param value - The currency value
 * @param locationCode - DataForSEO location code (optional, defaults to USD)
 * @returns Formatted string with appropriate currency symbol or "—" for missing data
 */
export function formatCurrency(value: number | null | undefined, locationCode: number = 2840): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "—";
  }
  const { symbol } = getCurrencyByLocation(locationCode);
  return `${symbol}${value.toFixed(2)}`;
}

/**
 * Get color class for difficulty score
 * @param difficulty - The difficulty score
 * @returns Tailwind color class
 */
export function getDifficultyColor(difficulty: number | null | undefined): string {
  if (difficulty === null || difficulty === undefined || isNaN(difficulty)) {
    return "text-muted-foreground";
  }
  if (difficulty < 30) {
    return "text-success";
  }
  if (difficulty < 40) {
    return "text-warning";
  }
  return "text-destructive";
}
