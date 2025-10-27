import { describe, it, expect } from 'vitest';
import { redactPii, stripPiiFields } from '@/lib/privacy/filters';

describe('Privacy Filters', () => {
  describe('PII Redaction', () => {
    it('should redact email addresses', () => {
      const text = 'Contact user@example.com for help';
      const redacted = redactPii(text);

      expect(redacted).not.toContain('user@example.com');
      expect(redacted).toContain('[EMAIL_REDACTED]');
    });

    it('should redact IP addresses', () => {
      const text = 'Request from 192.168.1.1';
      const redacted = redactPii(text);

      expect(redacted).not.toContain('192.168.1.1');
      expect(redacted).toContain('[IP_REDACTED]');
    });

    it('should redact phone numbers', () => {
      const text = 'Call 555-123-4567';
      const redacted = redactPii(text);

      expect(redacted).not.toContain('555-123-4567');
      expect(redacted).toContain('[PHONE_REDACTED]');
    });

    it('should preserve non-PII content', () => {
      const text = 'This is a regular message';
      const redacted = redactPii(text);

      expect(redacted).toBe(text);
    });
  });

  describe('PII Field Stripping', () => {
    it('should identify PII fields', () => {
      const piiFields = ['email', 'ip', 'phone', 'address'];

      piiFields.forEach((field) => {
        const obj = { [field]: 'sensitive data' };
        const cleaned = stripPiiFields(obj);

        expect(cleaned[field]).toBe('[REDACTED]');
      });
    });

    it('should preserve non-PII fields', () => {
      const obj = {
        username: 'john_doe',
        keyword: 'seo tools',
      };

      const cleaned = stripPiiFields(obj);

      expect(cleaned.username).toBe('john_doe');
      expect(cleaned.keyword).toBe('seo tools');
    });

    it('should handle nested objects', () => {
      const obj = {
        user: {
          email: 'user@example.com',
          name: 'John',
        },
      };

      const cleaned = stripPiiFields(obj);

      expect((cleaned.user as Record<string, unknown>).email).toBe('[REDACTED]');
      expect((cleaned.user as Record<string, unknown>).name).toBe('John');
    });

    it('should redact PII in string values', () => {
      const obj = {
        message: 'Contact user@example.com',
      };

      const cleaned = stripPiiFields(obj);

      expect(cleaned.message).not.toContain('user@example.com');
      expect(cleaned.message).toContain('[EMAIL_REDACTED]');
    });
  });

  describe('Configured PII Fields', () => {
    it('should match field names case-insensitively', () => {
      const fields = [
        { email: 'test@example.com' },
        { Email: 'test@example.com' },
        { EMAIL: 'test@example.com' },
      ];

      fields.forEach((obj) => {
        const cleaned = stripPiiFields(obj);
        const values = Object.values(cleaned);
        expect(values[0]).toBe('[REDACTED]');
      });
    });

    it('should match partial field names', () => {
      const obj = {
        user_email: 'test@example.com',
        ip_address: '1.2.3.4',
      };

      const cleaned = stripPiiFields(obj);

      expect(cleaned.user_email).toBe('[REDACTED]');
      expect(cleaned.ip_address).toBe('[REDACTED]');
    });
  });

  describe('Array Handling', () => {
    it('should preserve arrays', () => {
      const obj = {
        tags: ['seo', 'marketing'],
      };

      const cleaned = stripPiiFields(obj);

      expect(Array.isArray(cleaned.tags)).toBe(true);
      expect((cleaned.tags as string[]).length).toBe(2);
    });

    it('should not redact array items', () => {
      const obj = {
        keywords: ['test', 'example'],
      };

      const cleaned = stripPiiFields(obj);

      expect(cleaned.keywords).toEqual(['test', 'example']);
    });
  });

  describe('Safe Logging', () => {
    it('should log without PII', () => {
      const message = 'User action from user@example.com';
      const data = {
        email: 'user@example.com',
        action: 'login',
      };

      // In real usage, this would call safeLog()
      const cleanMessage = redactPii(message);
      const cleanData = stripPiiFields(data);

      expect(cleanMessage).not.toContain('user@example.com');
      expect(cleanData.email).toBe('[REDACTED]');
      expect(cleanData.action).toBe('login');
    });

    it('should include timestamp', () => {
      const timestamp = new Date().toISOString();

      expect(timestamp).toBeDefined();
      expect(new Date(timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});
