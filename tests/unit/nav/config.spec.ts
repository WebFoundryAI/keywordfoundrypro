import { describe, it, expect } from 'vitest';
import {
  headerNav,
  accountNav,
  adminNav,
  footerNav,
  filterByAuth,
  filterByAdmin,
  getVisibleNavItems,
} from '@/lib/nav/config';

describe('nav/config', () => {
  describe('navigation arrays', () => {
    it('should have valid header navigation items', () => {
      expect(headerNav).toBeInstanceOf(Array);
      expect(headerNav.length).toBeGreaterThan(0);
      headerNav.forEach(item => {
        expect(item).toHaveProperty('path');
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('icon');
      });
    });

    it('should have valid account navigation items', () => {
      expect(accountNav).toBeInstanceOf(Array);
      expect(accountNav.length).toBeGreaterThan(0);
      accountNav.forEach(item => {
        expect(item).toHaveProperty('path');
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('icon');
        expect(item.requiresAuth).toBe(true);
      });
    });

    it('should have valid admin navigation items', () => {
      expect(adminNav).toBeInstanceOf(Array);
      expect(adminNav.length).toBeGreaterThan(0);
      adminNav.forEach(item => {
        expect(item).toHaveProperty('path');
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('icon');
        expect(item.requiresAdmin).toBe(true);
      });
    });

    it('should have valid footer navigation items', () => {
      expect(footerNav).toBeInstanceOf(Array);
      expect(footerNav.length).toBeGreaterThan(0);
      footerNav.forEach(item => {
        expect(item).toHaveProperty('path');
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('icon');
      });
    });
  });

  describe('filterByAuth', () => {
    it('should return all items for authenticated users', () => {
      const items = [
        { path: '/public', label: 'Public', icon: {} as any, requiresAuth: false },
        { path: '/protected', label: 'Protected', icon: {} as any, requiresAuth: true },
      ];
      const filtered = filterByAuth(items, true);
      expect(filtered).toHaveLength(2);
    });

    it('should filter out protected items for unauthenticated users', () => {
      const items = [
        { path: '/public', label: 'Public', icon: {} as any, requiresAuth: false },
        { path: '/protected', label: 'Protected', icon: {} as any, requiresAuth: true },
      ];
      const filtered = filterByAuth(items, false);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].path).toBe('/public');
    });
  });

  describe('filterByAdmin', () => {
    it('should return all items for admin users', () => {
      const items = [
        { path: '/public', label: 'Public', icon: {} as any, requiresAdmin: false },
        { path: '/admin', label: 'Admin', icon: {} as any, requiresAdmin: true },
      ];
      const filtered = filterByAdmin(items, true);
      expect(filtered).toHaveLength(2);
    });

    it('should filter out admin items for non-admin users', () => {
      const items = [
        { path: '/public', label: 'Public', icon: {} as any, requiresAdmin: false },
        { path: '/admin', label: 'Admin', icon: {} as any, requiresAdmin: true },
      ];
      const filtered = filterByAdmin(items, false);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].path).toBe('/public');
    });
  });

  describe('getVisibleNavItems', () => {
    it('should filter by both auth and admin status', () => {
      const items = [
        { path: '/public', label: 'Public', icon: {} as any },
        { path: '/protected', label: 'Protected', icon: {} as any, requiresAuth: true },
        { path: '/admin', label: 'Admin', icon: {} as any, requiresAuth: true, requiresAdmin: true },
      ];

      // Unauthenticated user
      const publicItems = getVisibleNavItems(items, false, false);
      expect(publicItems).toHaveLength(1);
      expect(publicItems[0].path).toBe('/public');

      // Authenticated non-admin user
      const authedItems = getVisibleNavItems(items, true, false);
      expect(authedItems).toHaveLength(2);
      expect(authedItems.find(i => i.path === '/admin')).toBeUndefined();

      // Authenticated admin user
      const adminItems = getVisibleNavItems(items, true, true);
      expect(adminItems).toHaveLength(3);
    });
  });

  describe('navigation paths', () => {
    it('should include required pages in header nav', () => {
      const paths = headerNav.map(item => item.path);
      // Marketing pages (Docs, Status, Changelog, Roadmap) removed from header
      // per admin header unification - these now only appear in footer and admin profile menu
      expect(paths).toContain('/research');
      expect(paths).toContain('/keyword-results');
    });

    it('should include required pages in account nav', () => {
      const paths = accountNav.map(item => item.path);
      expect(paths).toContain('/profile');
      expect(paths).toContain('/account');
      expect(paths).toContain('/sign-out');
    });

    it('should include required pages in footer nav', () => {
      const paths = footerNav.map(item => item.path);
      expect(paths).toContain('/terms');
      expect(paths).toContain('/privacy');
      expect(paths).toContain('/contact');
      expect(paths).toContain('/status');
      expect(paths).toContain('/changelog');
    });

    it('should include required pages in admin nav', () => {
      const paths = adminNav.map(item => item.path);
      expect(paths).toContain('/admin/status');
      expect(paths).toContain('/admin/changelog');
      expect(paths).toContain('/admin/roadmap');
      expect(paths).toContain('/admin/clustering');
      expect(paths).toContain('/admin/observability');
    });
  });
});
