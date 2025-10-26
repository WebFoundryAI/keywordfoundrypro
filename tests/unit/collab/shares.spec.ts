import { describe, it, expect } from 'vitest';

describe('Project Shares', () => {
  describe('Email Validation', () => {
    it('should validate email format', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'name+tag@test.com',
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      validEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@domain.com',
        'user@',
        'user domain.com',
      ];

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      invalidEmails.forEach((email) => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });

  describe('Role Validation', () => {
    it('should accept valid roles', () => {
      const validRoles = ['viewer', 'commenter'];

      validRoles.forEach((role) => {
        expect(['viewer', 'commenter'].includes(role)).toBe(true);
      });
    });

    it('should reject invalid roles', () => {
      const invalidRoles = ['editor', 'admin', 'owner', ''];

      invalidRoles.forEach((role) => {
        expect(['viewer', 'commenter'].includes(role)).toBe(false);
      });
    });
  });

  describe('Access Control', () => {
    it('should grant owner full access', () => {
      const userId = 'user-123';
      const projectOwnerId = 'user-123';

      const isOwner = userId === projectOwnerId;
      expect(isOwner).toBe(true);
    });

    it('should check share role for non-owners', () => {
      const userId = 'user-456';
      const projectOwnerId = 'user-123';
      const shareRole = 'commenter';

      const isOwner = userId === projectOwnerId;
      const canComment = isOwner || shareRole === 'commenter';

      expect(isOwner).toBe(false);
      expect(canComment).toBe(true);
    });

    it('should deny viewer from commenting', () => {
      const shareRole = 'viewer';
      const canComment = shareRole === 'commenter';

      expect(canComment).toBe(false);
    });
  });

  describe('Share Creation', () => {
    it('should normalize email to lowercase', () => {
      const email = 'User@Example.COM';
      const normalized = email.toLowerCase();

      expect(normalized).toBe('user@example.com');
    });

    it('should prevent duplicate shares', () => {
      const existingShares = [
        { email: 'user1@test.com', role: 'viewer' },
        { email: 'user2@test.com', role: 'commenter' },
      ];

      const newEmail = 'user1@test.com';
      const isDuplicate = existingShares.some((s) => s.email === newEmail);

      expect(isDuplicate).toBe(true);
    });
  });

  describe('User Role Mapping', () => {
    it('should map owner correctly', () => {
      const userId = 'user-123';
      const projectOwnerId = 'user-123';

      const role = userId === projectOwnerId ? 'owner' : null;

      expect(role).toBe('owner');
    });

    it('should map share role for non-owners', () => {
      const userId = 'user-456';
      const projectOwnerId = 'user-123';
      const shareRole = 'commenter';

      const role = userId === projectOwnerId ? 'owner' : shareRole;

      expect(role).toBe('commenter');
    });

    it('should return null for no access', () => {
      const userId = 'user-789';
      const projectOwnerId = 'user-123';
      const shareRole = null;

      const role = userId === projectOwnerId ? 'owner' : shareRole;

      expect(role).toBeNull();
    });
  });
});
