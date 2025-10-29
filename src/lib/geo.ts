/**
 * Geo detection utilities
 * Detects if user is in EEA/UK region for GDPR compliance
 */

// EEA countries + UK (ISO 3166-1 alpha-2 codes)
const EEA_COUNTRIES = new Set([
  'AT', // Austria
  'BE', // Belgium
  'BG', // Bulgaria
  'HR', // Croatia
  'CY', // Cyprus
  'CZ', // Czech Republic
  'DK', // Denmark
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GR', // Greece
  'HU', // Hungary
  'IE', // Ireland
  'IT', // Italy
  'LV', // Latvia
  'LT', // Lithuania
  'LU', // Luxembourg
  'MT', // Malta
  'NL', // Netherlands
  'PL', // Poland
  'PT', // Portugal
  'RO', // Romania
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
  'SE', // Sweden
  'IS', // Iceland
  'LI', // Liechtenstein
  'NO', // Norway
  'GB', // United Kingdom
]);

export interface GeoData {
  country: string | null;
  isEEA: boolean;
  error?: string;
}

/**
 * Detect if user is in EEA/UK using ipapi.co free tier
 * Falls back to localStorage cache to avoid rate limits
 */
export async function detectGeoLocation(): Promise<GeoData> {
  // Check localStorage cache first (valid for 24 hours)
  const cached = getCachedGeoData();
  if (cached) {
    return cached;
  }

  try {
    // Use ipapi.co free tier (no API key required, 1000 requests/day)
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const country = data.country_code || null;
    const isEEA = country ? EEA_COUNTRIES.has(country) : false;

    const geoData: GeoData = { country, isEEA };

    // Cache for 24 hours
    cacheGeoData(geoData);

    return geoData;
  } catch (error) {
    console.error('Geo detection error:', error);
    // Default to showing banner (safer for GDPR compliance)
    return { country: null, isEEA: true, error: String(error) };
  }
}

/**
 * Check if country code is in EEA/UK
 */
export function isEEACountry(countryCode: string | null): boolean {
  return countryCode ? EEA_COUNTRIES.has(countryCode.toUpperCase()) : false;
}

/**
 * Get cached geo data from localStorage
 */
function getCachedGeoData(): GeoData | null {
  try {
    const cached = localStorage.getItem('geo_cache');
    if (!cached) return null;

    const { data, expires } = JSON.parse(cached);
    if (Date.now() > expires) {
      localStorage.removeItem('geo_cache');
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Cache geo data in localStorage for 24 hours
 */
function cacheGeoData(data: GeoData): void {
  try {
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    localStorage.setItem('geo_cache', JSON.stringify({ data, expires }));
  } catch (error) {
    console.error('Failed to cache geo data:', error);
  }
}

/**
 * Clear cached geo data
 */
export function clearGeoCache(): void {
  try {
    localStorage.removeItem('geo_cache');
  } catch (error) {
    console.error('Failed to clear geo cache:', error);
  }
}
