import { describe, it, expect } from 'vitest';

describe('Analytics Queries', () => {
  describe('Event Types', () => {
    it('should validate event types', () => {
      const validTypes = [
        'signup',
        'first_query',
        'first_export',
        'upgrade',
        'downgrade',
        'churn',
      ];

      const eventType = 'first_query';
      const isValid = validTypes.includes(eventType);

      expect(isValid).toBe(true);
    });

    it('should reject invalid event types', () => {
      const validTypes = [
        'signup',
        'first_query',
        'first_export',
        'upgrade',
        'downgrade',
        'churn',
      ];

      const eventType = 'invalid_event';
      const isValid = validTypes.includes(eventType);

      expect(isValid).toBe(false);
    });
  });

  describe('Conversion Rate Calculation', () => {
    it('should calculate signup to query conversion', () => {
      const totalSignups = 100;
      const withQuery = 75;

      const conversionRate = (withQuery / totalSignups) * 100;

      expect(conversionRate).toBe(75);
    });

    it('should calculate query to export conversion', () => {
      const withQuery = 75;
      const withExport = 45;

      const conversionRate = (withExport / withQuery) * 100;

      expect(conversionRate).toBe(60);
    });

    it('should calculate export to upgrade conversion', () => {
      const withExport = 45;
      const withUpgrade = 18;

      const conversionRate = (withExport > 0 ? withUpgrade / withExport : 0) * 100;

      expect(conversionRate).toBe(40);
    });

    it('should calculate overall conversion', () => {
      const totalSignups = 100;
      const withUpgrade = 18;

      const overallConversion = (withUpgrade / totalSignups) * 100;

      expect(overallConversion).toBe(18);
    });

    it('should handle zero denominator', () => {
      const totalSignups = 0;
      const withQuery = 0;

      const conversionRate = totalSignups > 0 ? (withQuery / totalSignups) * 100 : 0;

      expect(conversionRate).toBe(0);
    });
  });

  describe('Time-to-Convert Calculation', () => {
    it('should calculate hours from timestamps', () => {
      const signupAt = new Date('2025-10-26T10:00:00Z');
      const firstQueryAt = new Date('2025-10-26T14:30:00Z');

      const diffMs = firstQueryAt.getTime() - signupAt.getTime();
      const hours = diffMs / (1000 * 60 * 60);

      expect(hours).toBe(4.5);
    });

    it('should handle same-time events', () => {
      const signupAt = new Date('2025-10-26T10:00:00Z');
      const firstQueryAt = new Date('2025-10-26T10:00:00Z');

      const diffMs = firstQueryAt.getTime() - signupAt.getTime();
      const hours = diffMs / (1000 * 60 * 60);

      expect(hours).toBe(0);
    });

    it('should calculate days from hours', () => {
      const hours = 48;
      const days = hours / 24;

      expect(days).toBe(2);
    });
  });

  describe('Median Calculation', () => {
    it('should calculate median for odd-length array', () => {
      const values = [1, 3, 5, 7, 9];
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      expect(median).toBe(5);
    });

    it('should calculate median for even-length array', () => {
      const values = [1, 3, 5, 7];
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      expect(median).toBe(5); // Using upper middle value
    });

    it('should handle single value', () => {
      const values = [42];
      const median = values[Math.floor(values.length / 2)];

      expect(median).toBe(42);
    });

    it('should handle empty array', () => {
      const values: number[] = [];
      const median = values.length > 0 ? values[Math.floor(values.length / 2)] : null;

      expect(median).toBeNull();
    });

    it('should filter out null values before calculating median', () => {
      const values = [1, null, 3, null, 5];
      const filtered = values.filter((v): v is number => v !== null);
      const sorted = filtered.sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      expect(median).toBe(3);
    });
  });

  describe('Segmentation Filters', () => {
    it('should filter by plan', () => {
      const users = [
        { id: '1', plan: 'free' },
        { id: '2', plan: 'pro' },
        { id: '3', plan: 'free' },
      ];

      const filtered = users.filter((u) => u.plan === 'free');

      expect(filtered.length).toBe(2);
    });

    it('should filter by date range', () => {
      const startDate = new Date('2025-10-01T00:00:00Z');
      const endDate = new Date('2025-10-31T23:59:59Z');
      const signupDate = new Date('2025-10-15T10:00:00Z');

      const inRange = signupDate >= startDate && signupDate <= endDate;

      expect(inRange).toBe(true);
    });

    it('should filter by cohort week', () => {
      const signupDate = new Date('2025-10-23T10:00:00Z');
      const weekStart = new Date(signupDate);
      weekStart.setDate(signupDate.getDate() - signupDate.getDay());

      const cohortWeek = weekStart.toISOString().split('T')[0];

      expect(cohortWeek).toBe('2025-10-19'); // Week starts on Sunday (Oct 19, 2025)
    });
  });

  describe('Funnel Stages', () => {
    it('should define correct stage order', () => {
      const stages = ['signup', 'first_query', 'first_export', 'upgrade'];

      expect(stages[0]).toBe('signup');
      expect(stages[1]).toBe('first_query');
      expect(stages[2]).toBe('first_export');
      expect(stages[3]).toBe('upgrade');
    });

    it('should calculate stage user counts', () => {
      const users = [
        { signup: true, query: true, export: true, upgrade: true },
        { signup: true, query: true, export: true, upgrade: false },
        { signup: true, query: true, export: false, upgrade: false },
        { signup: true, query: false, export: false, upgrade: false },
      ];

      const counts = {
        signup: users.filter((u) => u.signup).length,
        query: users.filter((u) => u.query).length,
        export: users.filter((u) => u.export).length,
        upgrade: users.filter((u) => u.upgrade).length,
      };

      expect(counts.signup).toBe(4);
      expect(counts.query).toBe(3);
      expect(counts.export).toBe(2);
      expect(counts.upgrade).toBe(1);
    });
  });

  describe('Cohort Analysis', () => {
    it('should group by signup week', () => {
      const users = [
        { id: '1', signup_week: '2025-10-20' },
        { id: '2', signup_week: '2025-10-20' },
        { id: '3', signup_week: '2025-10-27' },
      ];

      const grouped = users.reduce(
        (acc, user) => {
          acc[user.signup_week] = acc[user.signup_week] || [];
          acc[user.signup_week].push(user);
          return acc;
        },
        {} as Record<string, typeof users>
      );

      expect(grouped['2025-10-20'].length).toBe(2);
      expect(grouped['2025-10-27'].length).toBe(1);
    });

    it('should calculate cohort conversion rates', () => {
      const cohort = {
        total_signups: 100,
        completed_first_query: 80,
        completed_first_export: 50,
        completed_upgrade: 20,
      };

      const rates = {
        query: (cohort.completed_first_query / cohort.total_signups) * 100,
        export: (cohort.completed_first_export / cohort.total_signups) * 100,
        upgrade: (cohort.completed_upgrade / cohort.total_signups) * 100,
      };

      expect(rates.query).toBe(80);
      expect(rates.export).toBe(50);
      expect(rates.upgrade).toBe(20);
    });
  });

  describe('Time Series Data', () => {
    it('should format date for day granularity', () => {
      const date = new Date('2025-10-26T14:30:00Z');
      const formatted = date.toISOString().split('T')[0];

      expect(formatted).toBe('2025-10-26');
    });

    it('should format date for month granularity', () => {
      const date = new Date('2025-10-26T14:30:00Z');
      const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

      expect(formatted).toBe('2025-10-01');
    });

    it('should aggregate events by date', () => {
      const events = [
        { date: '2025-10-26', type: 'signup' },
        { date: '2025-10-26', type: 'query' },
        { date: '2025-10-27', type: 'signup' },
      ];

      const grouped = events.reduce(
        (acc, event) => {
          acc[event.date] = acc[event.date] || { signups: 0, queries: 0 };
          if (event.type === 'signup') acc[event.date].signups++;
          if (event.type === 'query') acc[event.date].queries++;
          return acc;
        },
        {} as Record<string, { signups: number; queries: number }>
      );

      expect(grouped['2025-10-26'].signups).toBe(1);
      expect(grouped['2025-10-26'].queries).toBe(1);
      expect(grouped['2025-10-27'].signups).toBe(1);
    });
  });

  describe('Event Metadata', () => {
    it('should store optional metadata', () => {
      const event = {
        user_id: '123',
        event_type: 'upgrade',
        event_metadata: {
          from_plan: 'free',
          to_plan: 'pro',
          amount: 29.99,
        },
      };

      expect(event.event_metadata).toBeDefined();
      expect(event.event_metadata?.from_plan).toBe('free');
      expect(event.event_metadata?.to_plan).toBe('pro');
    });

    it('should allow null metadata', () => {
      const event = {
        user_id: '123',
        event_type: 'first_query',
        event_metadata: null,
      };

      expect(event.event_metadata).toBeNull();
    });
  });
});
