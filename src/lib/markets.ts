/**
 * Market to DataForSEO location and language code mapping
 */

export interface MarketConfig {
  location_code: number;
  language_code: string;
  name: string;
}

export const MARKETS: Record<string, MarketConfig> = {
  us: {
    location_code: 2840,
    language_code: 'en',
    name: 'United States',
  },
  uk: {
    location_code: 2826,
    language_code: 'en',
    name: 'United Kingdom',
  },
  au: {
    location_code: 2036,
    language_code: 'en',
    name: 'Australia',
  },
};

/**
 * Get market configuration by key
 */
export function getMarketConfig(marketKey: string): MarketConfig {
  const config = MARKETS[marketKey.toLowerCase()];
  if (!config) {
    throw new Error(`Unknown market: ${marketKey}. Available markets: ${Object.keys(MARKETS).join(', ')}`);
  }
  return config;
}

/**
 * Get all available market keys
 */
export function getAvailableMarkets(): string[] {
  return Object.keys(MARKETS);
}

/**
 * Check if a market key is valid
 */
export function isValidMarket(marketKey: string): boolean {
  return marketKey.toLowerCase() in MARKETS;
}
