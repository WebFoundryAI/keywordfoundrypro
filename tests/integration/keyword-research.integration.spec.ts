/**
 * ISSUE FIX #8: Integration tests for Keyword Research API
 *
 * These tests verify the complete keyword research flow from API call
 * to database persistence, including DataForSEO integration.
 *
 * Test coverage:
 * - Keyword research endpoint
 * - Deduplication logic
 * - Locale handling
 * - Database persistence
 * - Error handling
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds for integration tests
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';

describe('Keyword Research Integration Tests', () => {
  let supabase: SupabaseClient;
  let testUserId: string;
  let testToken: string;

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Create test user
    const { data, error } = await supabase.auth.signUp({
      email: `test-${Date.now()}@example.com`,
      password: 'test-password-123',
    });

    if (error || !data.user) {
      throw new Error('Failed to create test user');
    }

    testUserId = data.user.id;
    testToken = data.session?.access_token || '';
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (testUserId) {
      await supabase.from('keyword_research').delete().eq('user_id', testUserId);
      await supabase.from('keyword_results').delete().eq('user_id', testUserId);
    }
  });

  describe('Keyword Research Endpoint', () => {
    it('should successfully research a keyword and return results', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/keyword-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          keyword: 'seo tools',
          languageCode: 'en',
          locationCode: 2840,
          limit: 50,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.research_id).toBeDefined();
      expect(data.results).toBeInstanceOf(Array);
      expect(data.results.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    it('should deduplicate keywords in results', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/keyword-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          keyword: 'best seo tools',
          languageCode: 'en',
          locationCode: 2840,
          limit: 100,
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);

      // Check for duplicates (case-insensitive)
      const keywords = data.results.map((r: any) => r.keyword.toLowerCase());
      const uniqueKeywords = new Set(keywords);
      expect(keywords.length).toBe(uniqueKeywords.size);
    }, TEST_TIMEOUT);

    it('should correctly handle different locales', async () => {
      const testCases = [
        { languageCode: 'es', locationCode: 2724 }, // Spanish, Spain
        { languageCode: 'fr', locationCode: 2250 }, // French, France
        { languageCode: 'de', locationCode: 2276 }, // German, Germany
      ];

      for (const testCase of testCases) {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/keyword-research`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testToken}`,
          },
          body: JSON.stringify({
            keyword: 'marketing tools',
            languageCode: testCase.languageCode,
            locationCode: testCase.locationCode,
            limit: 20,
          }),
        });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      }
    }, TEST_TIMEOUT * 3);

    it('should persist results to database', async () => {
      const keyword = `test-keyword-${Date.now()}`;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/keyword-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          keyword,
          languageCode: 'en',
          locationCode: 2840,
          limit: 10,
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify data is in database
      const { data: researchData } = await supabase
        .from('keyword_research')
        .select('*')
        .eq('id', data.research_id)
        .single();

      expect(researchData).toBeDefined();
      expect(researchData.seed_keyword).toBe(keyword);

      const { data: resultsData } = await supabase
        .from('keyword_results')
        .select('*')
        .eq('research_id', data.research_id);

      expect(resultsData).toBeInstanceOf(Array);
      expect(resultsData.length).toBeGreaterThan(0);
    }, TEST_TIMEOUT);

    it('should handle validation errors correctly', async () => {
      const testCases = [
        { keyword: '', expected: 400 }, // Empty keyword
        { keyword: 'a', expected: 400 }, // Too short
        { keyword: 'a'.repeat(201), expected: 400 }, // Too long
      ];

      for (const testCase of testCases) {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/keyword-research`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testToken}`,
          },
          body: JSON.stringify({
            keyword: testCase.keyword,
            languageCode: 'en',
            locationCode: 2840,
          }),
        });

        expect(response.status).toBe(testCase.expected);
      }
    });

    it('should enforce rate limits', async () => {
      // Make multiple rapid requests
      const requests = Array.from({ length: 5 }, () =>
        fetch(`${SUPABASE_URL}/functions/v1/keyword-research`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testToken}`,
          },
          body: JSON.stringify({
            keyword: 'test keyword',
            languageCode: 'en',
            locationCode: 2840,
            limit: 10,
          }),
        })
      );

      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status);

      // At least one should be rate limited
      expect(statuses.some(s => s === 429 || s === 402)).toBe(true);
    }, TEST_TIMEOUT);
  });

  describe('Clustering and Scoring', () => {
    it('should assign cluster IDs to results', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/keyword-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          keyword: 'seo tools',
          languageCode: 'en',
          locationCode: 2840,
          limit: 50,
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);

      // All results should have cluster IDs
      data.results.forEach((result: any) => {
        expect(result.cluster_id).toBeDefined();
        expect(typeof result.cluster_id).toBe('string');
      });
    }, TEST_TIMEOUT);

    it('should calculate keyword difficulty scores', async () => {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/keyword-research`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`,
        },
        body: JSON.stringify({
          keyword: 'seo tools',
          languageCode: 'en',
          locationCode: 2840,
          limit: 50,
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);

      // Check difficulty scores
      const resultsWithDifficulty = data.results.filter((r: any) => r.difficulty !== null);
      expect(resultsWithDifficulty.length).toBeGreaterThan(0);

      resultsWithDifficulty.forEach((result: any) => {
        expect(result.difficulty).toBeGreaterThanOrEqual(0);
        expect(result.difficulty).toBeLessThanOrEqual(100);
      });
    }, TEST_TIMEOUT);
  });
});
