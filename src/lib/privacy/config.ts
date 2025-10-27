/**
 * Privacy configuration for data retention and PII handling
 */

export interface PrivacyConfig {
  retentionDays: 30 | 90 | 365;
  piiFields: string[];
  analyticsEnabled: boolean;
}

/**
 * Default privacy configuration
 */
export const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  retentionDays: 90,
  piiFields: [
    'email',
    'ip',
    'ipAddress',
    'ip_address',
    'userAgent',
    'user_agent',
    'phone',
    'phoneNumber',
    'phone_number',
    'address',
    'ssn',
    'creditCard',
    'credit_card',
  ],
  analyticsEnabled: true,
};

/**
 * Get retention days from user preference or default
 */
export function getRetentionDays(userPreference?: number): 30 | 90 | 365 {
  if (userPreference === 30 || userPreference === 90 || userPreference === 365) {
    return userPreference;
  }
  return DEFAULT_PRIVACY_CONFIG.retentionDays;
}

/**
 * Check if field is considered PII
 */
export function isPiiField(fieldName: string): boolean {
  const normalizedField = fieldName.toLowerCase();
  return DEFAULT_PRIVACY_CONFIG.piiFields.some((pii) =>
    normalizedField.includes(pii.toLowerCase())
  );
}

/**
 * Get privacy config for user
 */
export async function getUserPrivacyConfig(userId: string): Promise<PrivacyConfig> {
  // In production, fetch from database
  // For now, return defaults
  return DEFAULT_PRIVACY_CONFIG;
}
