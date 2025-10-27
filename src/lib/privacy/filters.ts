import { DEFAULT_PRIVACY_CONFIG } from './config';

/**
 * Redact PII from a string value
 */
export function redactPii(value: string): string {
  // Redact email addresses
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  let redacted = value.replace(emailPattern, '[EMAIL_REDACTED]');

  // Redact IP addresses
  const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  redacted = redacted.replace(ipPattern, '[IP_REDACTED]');

  // Redact phone numbers (basic pattern)
  const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
  redacted = redacted.replace(phonePattern, '[PHONE_REDACTED]');

  return redacted;
}

/**
 * Strip PII fields from an object
 */
export function stripPiiFields(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if key is a PII field
    const isPii = DEFAULT_PRIVACY_CONFIG.piiFields.some((piiField) =>
      key.toLowerCase().includes(piiField.toLowerCase())
    );

    if (isPii) {
      // Replace with redacted marker
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      // Redact PII patterns in string values
      cleaned[key] = redactPii(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively clean nested objects
      cleaned[key] = stripPiiFields(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Safe logging helper that strips PII
 */
export function safeLog(message: string, data?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const cleanMessage = redactPii(message);

  if (data) {
    const cleanData = stripPiiFields(data);
    console.log(`[${timestamp}] ${cleanMessage}`, cleanData);
  } else {
    console.log(`[${timestamp}] ${cleanMessage}`);
  }
}

/**
 * Safe error logging that strips PII
 */
export function safeError(message: string, error?: unknown, data?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const cleanMessage = redactPii(message);

  if (data) {
    const cleanData = stripPiiFields(data);
    console.error(`[${timestamp}] ERROR: ${cleanMessage}`, error, cleanData);
  } else {
    console.error(`[${timestamp}] ERROR: ${cleanMessage}`, error);
  }
}

/**
 * Check if user has opted out of analytics
 */
export async function hasOptedOut(userId: string): Promise<boolean> {
  // In production, check database
  // For now, return false
  return false;
}

/**
 * Log event with privacy checks
 */
export async function logEvent(
  userId: string,
  event: string,
  data?: Record<string, unknown>
): Promise<void> {
  // Check if user has opted out
  const optedOut = await hasOptedOut(userId);

  if (optedOut) {
    // Don't log non-essential events for opted-out users
    return;
  }

  // Strip PII and log
  const cleanData = data ? stripPiiFields(data) : undefined;
  safeLog(`Event: ${event}`, cleanData);
}
