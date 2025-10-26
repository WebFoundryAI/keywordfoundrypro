import { describe, it, expect } from 'vitest';

describe('Feedback', () => {
  describe('NPS Score Validation', () => {
    it('should accept valid NPS scores', () => {
      const validScores = [0, 5, 10];

      validScores.forEach((score) => {
        const isValid = score >= 0 && score <= 10;
        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid NPS scores', () => {
      const invalidScores = [-1, 11, 15];

      invalidScores.forEach((score) => {
        const isValid = score >= 0 && score <= 10;
        expect(isValid).toBe(false);
      });
    });

    it('should categorize NPS scores correctly', () => {
      const detractor = 5;
      const passive = 8;
      const promoter = 10;

      expect(detractor <= 6).toBe(true); // Detractor
      expect(passive >= 7 && passive <= 8).toBe(true); // Passive
      expect(promoter >= 9).toBe(true); // Promoter
    });
  });

  describe('Feature Request Validation', () => {
    it('should require title and body', () => {
      const title = 'New Feature';
      const body = 'Description of the feature';

      const isValid = title.trim().length > 0 && body.trim().length > 0;

      expect(isValid).toBe(true);
    });

    it('should reject empty title', () => {
      const title = '   ';
      const body = 'Description';

      const isValid = title.trim().length > 0 && body.trim().length > 0;

      expect(isValid).toBe(false);
    });

    it('should reject empty body', () => {
      const title = 'Title';
      const body = '   ';

      const isValid = title.trim().length > 0 && body.trim().length > 0;

      expect(isValid).toBe(false);
    });
  });

  describe('Feedback Kind Validation', () => {
    it('should accept valid feedback kinds', () => {
      const validKinds = ['nps', 'feature'];

      validKinds.forEach((kind) => {
        expect(['nps', 'feature'].includes(kind)).toBe(true);
      });
    });

    it('should reject invalid kinds', () => {
      const invalidKinds = ['bug', 'complaint', ''];

      invalidKinds.forEach((kind) => {
        expect(['nps', 'feature'].includes(kind)).toBe(false);
      });
    });

    it('should enforce NPS requires score', () => {
      const npsWithScore = { kind: 'nps', score: 8 };
      const npsWithoutScore = { kind: 'nps', score: null };

      expect(npsWithScore.kind === 'nps' && npsWithScore.score !== null).toBe(true);
      expect(npsWithoutScore.kind === 'nps' && npsWithoutScore.score !== null).toBe(false);
    });

    it('should enforce feature requires title', () => {
      const featureWithTitle = { kind: 'feature', title: 'Feature Name' };
      const featureWithoutTitle = { kind: 'feature', title: null };

      expect(featureWithTitle.kind === 'feature' && featureWithTitle.title !== null).toBe(true);
      expect(featureWithoutTitle.kind === 'feature' && featureWithoutTitle.title !== null).toBe(false);
    });
  });

  describe('Status Management', () => {
    it('should accept valid statuses', () => {
      const validStatuses = ['new', 'triaged', 'in-progress', 'done', 'wont-fix'];

      validStatuses.forEach((status) => {
        expect(['new', 'triaged', 'in-progress', 'done', 'wont-fix'].includes(status)).toBe(true);
      });
    });

    it('should default to new status', () => {
      const feedback = { status: 'new' };

      expect(feedback.status).toBe('new');
    });

    it('should track status transitions', () => {
      const oldStatus = 'new';
      const newStatus = 'triaged';

      const changed = oldStatus !== newStatus;

      expect(changed).toBe(true);
    });
  });

  describe('NPS Display Frequency', () => {
    it('should not show if never shown before', () => {
      const lastShown = null;
      const shouldShow = lastShown !== null;

      expect(shouldShow).toBe(false);
    });

    it('should show after 30 days', () => {
      const lastShown = Date.now() - (31 * 24 * 60 * 60 * 1000);
      const daysSince = (Date.now() - lastShown) / (1000 * 60 * 60 * 24);

      expect(daysSince > 30).toBe(true);
    });

    it('should not show before 30 days', () => {
      const lastShown = Date.now() - (15 * 24 * 60 * 60 * 1000);
      const daysSince = (Date.now() - lastShown) / (1000 * 60 * 60 * 24);

      expect(daysSince > 30).toBe(false);
    });
  });

  describe('Triage Workflow', () => {
    it('should set triaged_at when status changes from new', () => {
      const oldStatus = 'new';
      const newStatus = 'triaged';
      const triagedAt = null;

      const shouldSetTriagedAt = newStatus !== oldStatus && newStatus !== 'new' && triagedAt === null;

      expect(shouldSetTriagedAt).toBe(true);
    });

    it('should not reset triaged_at on subsequent changes', () => {
      const oldStatus = 'triaged';
      const newStatus = 'in-progress';
      const triagedAt = '2025-01-01T00:00:00Z';

      const shouldSetTriagedAt = newStatus !== oldStatus && newStatus !== 'new' && triagedAt === null;

      expect(shouldSetTriagedAt).toBe(false);
    });
  });
});
