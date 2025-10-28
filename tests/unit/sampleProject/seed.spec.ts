import { describe, it, expect } from 'vitest';
import {
  isSampleProject,
  getSampleProjectMetadata,
} from '@/lib/sampleProject/seed';

describe('Sample Project Utilities', () => {

  describe('isSampleProject', () => {
    it('should return true for SAMPLE_PROJECT keyword', () => {
      expect(isSampleProject('SAMPLE_PROJECT')).toBe(true);
    });

    it('should return false for regular keywords', () => {
      expect(isSampleProject('coffee shop')).toBe(false);
      expect(isSampleProject('best coffee beans')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isSampleProject('sample_project')).toBe(false);
      expect(isSampleProject('SAMPLE_PROJECT')).toBe(true);
    });
  });

  describe('getSampleProjectMetadata', () => {
    it('should return metadata with required fields', () => {
      const metadata = getSampleProjectMetadata();

      expect(metadata).toHaveProperty('name');
      expect(metadata).toHaveProperty('description');
      expect(metadata).toHaveProperty('keywordCount');
      expect(metadata).toHaveProperty('isDemo');
    });

    it('should mark as demo project', () => {
      const metadata = getSampleProjectMetadata();
      expect(metadata.isDemo).toBe(true);
    });

    it('should have keyword count greater than 0', () => {
      const metadata = getSampleProjectMetadata();
      expect(metadata.keywordCount).toBeGreaterThan(0);
    });

    it('should have descriptive name and description', () => {
      const metadata = getSampleProjectMetadata();
      expect(metadata.name.length).toBeGreaterThan(0);
      expect(metadata.description.length).toBeGreaterThan(0);
    });
  });
});
