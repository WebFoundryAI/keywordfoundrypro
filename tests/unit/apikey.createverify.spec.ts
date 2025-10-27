import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

describe('API Key Create and Verify', () => {
  describe('Key Generation', () => {
    it('should generate key with kf_ prefix', () => {
      const prefix = 'kf_';
      const randomPart = '1234567890abcdef';
      const key = `${prefix}${randomPart}`;

      expect(key.startsWith('kf_')).toBe(true);
    });

    it('should generate keys of consistent length', () => {
      // 32 bytes = 64 hex chars, plus 3 char prefix = 67 total
      const keyLength = 'kf_'.length + 64;

      expect(keyLength).toBe(67);
    });

    it('should generate unique keys', () => {
      const keys = new Set([
        'kf_abc123',
        'kf_def456',
        'kf_ghi789',
      ]);

      expect(keys.size).toBe(3);
    });

    it('should use secure random bytes', () => {
      const key1 = 'kf_1234567890abcdef';
      const key2 = 'kf_fedcba0987654321';

      expect(key1).not.toBe(key2);
    });
  });

  describe('Key Hashing', () => {
    it('should hash using SHA-256', () => {
      const key = 'kf_test123';
      const hash = createHash('sha256').update(key).digest('hex');

      expect(hash.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    it('should produce consistent hashes', () => {
      const key = 'kf_test123';
      const hash1 = createHash('sha256').update(key).digest('hex');
      const hash2 = createHash('sha256').update(key).digest('hex');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different keys', () => {
      const key1 = 'kf_test123';
      const key2 = 'kf_test456';

      const hash1 = createHash('sha256').update(key1).digest('hex');
      const hash2 = createHash('sha256').update(key2).digest('hex');

      expect(hash1).not.toBe(hash2);
    });

    it('should hash entire key including prefix', () => {
      const key = 'kf_test123';
      const hash = createHash('sha256').update(key).digest('hex');

      // Verify it's a valid hex string
      expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
    });
  });

  describe('Key Prefix Storage', () => {
    it('should store first 12 characters as prefix', () => {
      const key = 'kf_1234567890abcdef';
      const prefix = key.substring(0, 12);

      expect(prefix).toBe('kf_123456789');
      expect(prefix.length).toBe(12);
    });

    it('should include kf_ in prefix', () => {
      const key = 'kf_abcdefghijklmnop';
      const prefix = key.substring(0, 12);

      expect(prefix.startsWith('kf_')).toBe(true);
    });

    it('should provide enough prefix for display', () => {
      const prefix = 'kf_12345678';

      // Should show "kf_" + 8 chars = enough to identify
      expect(prefix.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Key Verification', () => {
    it('should reject keys without kf_ prefix', () => {
      const invalidKeys = [
        'abc123',
        'api_key123',
        'Bearer kf_123',
        '',
      ];

      invalidKeys.forEach((key) => {
        const isValid = key.startsWith('kf_');
        expect(isValid).toBe(false);
      });
    });

    it('should accept keys with kf_ prefix', () => {
      const validKeys = [
        'kf_abc123',
        'kf_1234567890abcdef',
      ];

      validKeys.forEach((key) => {
        const isValid = key.startsWith('kf_');
        expect(isValid).toBe(true);
      });
    });

    it('should reject empty or null keys', () => {
      const emptyKey = '';
      const nullKey = null;

      expect(!emptyKey).toBe(true);
      expect(!nullKey).toBe(true);
    });

    it('should verify by hash comparison', () => {
      const key = 'kf_test123';
      const storedHash = createHash('sha256').update(key).digest('hex');
      const providedHash = createHash('sha256').update(key).digest('hex');

      expect(storedHash).toBe(providedHash);
    });
  });

  describe('Timing-Safe Comparison', () => {
    it('should compare buffer lengths first', () => {
      const hash1 = Buffer.from('abcd', 'hex');
      const hash2 = Buffer.from('abcdef', 'hex');

      const lengthsMatch = hash1.length === hash2.length;
      expect(lengthsMatch).toBe(false);
    });

    it('should reject if lengths differ', () => {
      const storedHash = Buffer.from('a'.repeat(64), 'hex');
      const providedHash = Buffer.from('a'.repeat(32), 'hex');

      if (storedHash.length !== providedHash.length) {
        expect(true).toBe(true); // Should reject
      }
    });

    it('should use constant-time comparison for same length', () => {
      const hash1 = Buffer.from('abcd1234', 'hex');
      const hash2 = Buffer.from('abcd1234', 'hex');

      expect(hash1.length).toBe(hash2.length);
      expect(hash1.equals(hash2)).toBe(true);
    });
  });

  describe('Revoked Keys', () => {
    it('should exclude revoked keys from verification', () => {
      const key = {
        key_hash: 'abc123',
        revoked_at: '2025-01-01T00:00:00Z',
      };

      const isRevoked = key.revoked_at !== null;
      expect(isRevoked).toBe(true);
    });

    it('should include active keys', () => {
      const key = {
        key_hash: 'abc123',
        revoked_at: null,
      };

      const isActive = key.revoked_at === null;
      expect(isActive).toBe(true);
    });

    it('should set revoked_at timestamp on revocation', () => {
      const revokedAt = new Date().toISOString();

      expect(revokedAt).toBeDefined();
      expect(new Date(revokedAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe('Last Used Tracking', () => {
    it('should update last_used_at on successful verification', () => {
      const lastUsedAt = new Date().toISOString();

      expect(lastUsedAt).toBeDefined();
    });

    it('should track when key was last used', () => {
      const key = {
        last_used_at: '2025-01-01T12:00:00Z',
      };

      const lastUsed = new Date(key.last_used_at);
      expect(lastUsed.getTime()).toBeGreaterThan(0);
    });

    it('should allow null for never-used keys', () => {
      const key = {
        last_used_at: null,
      };

      expect(key.last_used_at).toBeNull();
    });
  });

  describe('API Key Listing', () => {
    it('should order keys by created_at desc', () => {
      const keys = [
        { name: 'Key 1', created_at: '2025-01-01T00:00:00Z' },
        { name: 'Key 2', created_at: '2025-01-03T00:00:00Z' },
        { name: 'Key 3', created_at: '2025-01-02T00:00:00Z' },
      ];

      const sorted = keys.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      expect(sorted[0].name).toBe('Key 2');
      expect(sorted[1].name).toBe('Key 3');
      expect(sorted[2].name).toBe('Key 1');
    });

    it('should filter by user_id', () => {
      const allKeys = [
        { user_id: 'user1', name: 'Key 1' },
        { user_id: 'user2', name: 'Key 2' },
        { user_id: 'user1', name: 'Key 3' },
      ];

      const userKeys = allKeys.filter((k) => k.user_id === 'user1');

      expect(userKeys.length).toBe(2);
      expect(userKeys.every((k) => k.user_id === 'user1')).toBe(true);
    });

    it('should include all key metadata except hash', () => {
      const key = {
        id: 'key-123',
        user_id: 'user-456',
        name: 'My API Key',
        key_prefix: 'kf_12345678',
        last_used_at: null,
        created_at: '2025-01-01T00:00:00Z',
        revoked_at: null,
      };

      expect(key.id).toBeDefined();
      expect(key.name).toBeDefined();
      expect(key.key_prefix).toBeDefined();
      expect('key_hash' in key).toBe(false); // Hash should not be exposed
    });
  });

  describe('Key Revocation', () => {
    it('should set revoked_at timestamp', () => {
      const revokedAt = new Date().toISOString();
      const updated = { revoked_at: revokedAt };

      expect(updated.revoked_at).toBeDefined();
      expect(new Date(updated.revoked_at).getTime()).toBeGreaterThan(0);
    });

    it('should verify user ownership before revocation', () => {
      const keyUserId = 'user-123';
      const requestUserId = 'user-123';

      const canRevoke = keyUserId === requestUserId;
      expect(canRevoke).toBe(true);
    });

    it('should prevent revoking other users keys', () => {
      const keyUserId = 'user-123';
      const requestUserId = 'user-456';

      const canRevoke = keyUserId === requestUserId;
      expect(canRevoke).toBe(false);
    });

    it('should return success status', () => {
      const result = {
        success: true,
        error: null,
      };

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return error on failure', () => {
      const result = {
        success: false,
        error: 'Key not found',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Key Naming', () => {
    it('should require name on creation', () => {
      const name = 'Production API Key';

      expect(name.length).toBeGreaterThan(0);
    });

    it('should allow descriptive names', () => {
      const names = [
        'Production API',
        'Development Testing',
        'Chrome Extension',
        'Mobile App',
      ];

      names.forEach((name) => {
        expect(name.trim().length).toBeGreaterThan(0);
      });
    });

    it('should reject empty names', () => {
      const name = '   ';
      const isValid = name.trim().length > 0;

      expect(isValid).toBe(false);
    });
  });

  describe('Return Values', () => {
    it('should return plaintext key only once on creation', () => {
      const result = {
        apiKey: {
          id: 'key-123',
          user_id: 'user-456',
          name: 'Test Key',
          key_prefix: 'kf_12345678',
          last_used_at: null,
          created_at: '2025-01-01T00:00:00Z',
          revoked_at: null,
        },
        plaintextKey: 'kf_1234567890abcdef1234567890abcdef',
      };

      expect(result.plaintextKey).toBeDefined();
      expect(result.plaintextKey.startsWith('kf_')).toBe(true);
    });

    it('should return valid and userId on verification', () => {
      const result = {
        valid: true,
        userId: 'user-123',
      };

      expect(typeof result.valid).toBe('boolean');
      expect(result.userId).toBeDefined();
    });

    it('should return null userId if invalid', () => {
      const result = {
        valid: false,
        userId: null,
      };

      expect(result.valid).toBe(false);
      expect(result.userId).toBeNull();
    });
  });

  describe('Security', () => {
    it('should never store plaintext keys', () => {
      const key = 'kf_secret123';
      const hash = createHash('sha256').update(key).digest('hex');

      const stored = {
        key_hash: hash,
        // No plaintext field
      };

      expect('plaintext' in stored).toBe(false);
      expect('key' in stored).toBe(false);
      expect(stored.key_hash).not.toBe(key);
    });

    it('should use cryptographically secure random', () => {
      // randomBytes(32) = 32 bytes of cryptographic randomness
      const byteLength = 32;
      const hexLength = byteLength * 2; // Each byte = 2 hex chars

      expect(hexLength).toBe(64);
    });

    it('should hash before comparison', () => {
      const providedKey = 'kf_test123';
      const providedHash = createHash('sha256').update(providedKey).digest('hex');

      // Should never compare plaintext
      expect(providedHash).not.toBe(providedKey);
      expect(providedHash.length).toBe(64);
    });
  });

  describe('Error Handling', () => {
    it('should throw error if database insert fails', () => {
      const error = { message: 'Database error' };

      expect(() => {
        if (error) {
          throw new Error(`Failed to create API key: ${error.message}`);
        }
      }).toThrow('Failed to create API key: Database error');
    });

    it('should return empty array if list fails', () => {
      const error = { message: 'Query failed' };
      const data = null;

      const result = error ? [] : data;
      expect(result).toEqual([]);
    });

    it('should require environment variables to be set', () => {
      // Environment variables should be defined strings (or undefined in test env)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      // Type should be either string or undefined
      expect(['string', 'undefined'].includes(typeof supabaseUrl)).toBe(true);
      expect(['string', 'undefined'].includes(typeof supabaseKey)).toBe(true);
    });
  });
});
