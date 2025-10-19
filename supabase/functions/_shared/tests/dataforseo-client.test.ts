import { assertEquals, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { callDataForSEO, DataForSEOError } from "../dataforseo/client.ts";

// Mock environment variables
Deno.env.set('DATAFORSEO_LOGIN', 'test_login');
Deno.env.set('DATAFORSEO_PASSWORD', 'test_password');

// Load fixtures
const keywordIdeasFixture = JSON.parse(
  await Deno.readTextFile(new URL('../fixtures/keyword-ideas.json', import.meta.url))
);
const serpOrganicFixture = JSON.parse(
  await Deno.readTextFile(new URL('../fixtures/serp-organic.json', import.meta.url))
);
const rankedKeywordsFixture = JSON.parse(
  await Deno.readTextFile(new URL('../fixtures/ranked-keywords.json', import.meta.url))
);
const backlinkSummaryFixture = JSON.parse(
  await Deno.readTextFile(new URL('../fixtures/backlink-summary.json', import.meta.url))
);
const rateLimitErrorFixture = JSON.parse(
  await Deno.readTextFile(new URL('../fixtures/rate-limit-error.json', import.meta.url))
);
const creditsExhaustedErrorFixture = JSON.parse(
  await Deno.readTextFile(new URL('../fixtures/credits-exhausted-error.json', import.meta.url))
);

// Mock fetch globally
const originalFetch = globalThis.fetch;

function mockFetch(fixture: any, status: number = 200) {
  globalThis.fetch = async () => {
    return new Response(JSON.stringify(fixture), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

Deno.test("callDataForSEO - keyword ideas endpoint", async () => {
  mockFetch(keywordIdeasFixture);
  
  try {
    const response = await callDataForSEO({
      endpoint: '/dataforseo_labs/google/keyword_ideas/live',
      payload: [{
        keywords: ['seo tools'],
        location_code: 2840,
        language_code: 'en'
      }],
      module: 'test-keyword-research',
      userId: 'test-user-123'
    });
    
    assertEquals(response.status_code, 200);
    assertEquals(response.tasks.length, 1);
    assertEquals(response.tasks[0].status_code, 20000);
    assertEquals(response.tasks[0].result[0].items.length, 5);
    assertEquals(response.tasks[0].result[0].items[0].keyword, 'seo tools');
  } finally {
    restoreFetch();
  }
});

Deno.test("callDataForSEO - SERP organic endpoint", async () => {
  mockFetch(serpOrganicFixture);
  
  try {
    const response = await callDataForSEO({
      endpoint: '/serp/google/organic/live/advanced',
      payload: [{
        keyword: 'seo tools',
        location_code: 2840,
        language_code: 'en'
      }],
      module: 'test-serp-analysis',
      userId: 'test-user-123'
    });
    
    assertEquals(response.status_code, 200);
    assertEquals(response.tasks[0].result[0].items.length, 3);
    assertEquals(response.tasks[0].result[0].items[0].type, 'organic');
    assertEquals(response.tasks[0].result[0].items[0].domain, 'ahrefs.com');
  } finally {
    restoreFetch();
  }
});

Deno.test("callDataForSEO - ranked keywords endpoint", async () => {
  mockFetch(rankedKeywordsFixture);
  
  try {
    const response = await callDataForSEO({
      endpoint: '/dataforseo_labs/google/ranked_keywords/live',
      payload: [{
        target: 'example.com',
        location_code: 2840,
        language_code: 'en'
      }],
      module: 'test-competitor-analyze',
      userId: 'test-user-123'
    });
    
    assertEquals(response.tasks[0].result[0].items.length, 3);
    assertEquals(response.tasks[0].result[0].target, 'example.com');
    assertEquals(response.tasks[0].result[0].items[0].keyword, 'example keyword one');
  } finally {
    restoreFetch();
  }
});

Deno.test("callDataForSEO - backlink summary endpoint", async () => {
  mockFetch(backlinkSummaryFixture);
  
  try {
    const response = await callDataForSEO({
      endpoint: '/backlinks/summary/live',
      payload: [{
        target: 'example.com'
      }],
      module: 'test-competitor-analyze',
      userId: 'test-user-123'
    });
    
    assertEquals(response.tasks[0].result[0].backlinks, 125430);
    assertEquals(response.tasks[0].result[0].referring_domains, 3420);
    assertEquals(response.tasks[0].result[0].target, 'example.com');
  } finally {
    restoreFetch();
  }
});

Deno.test("callDataForSEO - rate limit error (429)", async () => {
  mockFetch(rateLimitErrorFixture, 429);
  
  try {
    await assertRejects(
      async () => {
        await callDataForSEO({
          endpoint: '/dataforseo_labs/google/keyword_ideas/live',
          payload: [{}],
          module: 'test-rate-limit',
          userId: 'test-user-123'
        });
      },
      DataForSEOError,
      'DataForSEO rate limit exceeded'
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("callDataForSEO - credits exhausted error (402)", async () => {
  mockFetch(creditsExhaustedErrorFixture, 402);
  
  try {
    await assertRejects(
      async () => {
        await callDataForSEO({
          endpoint: '/dataforseo_labs/google/keyword_ideas/live',
          payload: [{}],
          module: 'test-credits',
          userId: 'test-user-123'
        });
      },
      DataForSEOError,
      'DataForSEO API credits exhausted'
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("callDataForSEO - validates response structure", async () => {
  mockFetch(keywordIdeasFixture);
  
  try {
    const response = await callDataForSEO({
      endpoint: '/dataforseo_labs/google/keyword_ideas/live',
      payload: [{}],
      module: 'test-validation',
      userId: 'test-user-123'
    });
    
    // Verify expected structure
    assertEquals(typeof response.status_code, 'number');
    assertEquals(typeof response.status_message, 'string');
    assertEquals(Array.isArray(response.tasks), true);
    assertEquals(typeof response.cost, 'number');
  } finally {
    restoreFetch();
  }
});

Deno.test("callDataForSEO - extracts cost information", async () => {
  mockFetch(keywordIdeasFixture);
  
  try {
    const response = await callDataForSEO({
      endpoint: '/dataforseo_labs/google/keyword_ideas/live',
      payload: [{}],
      module: 'test-cost',
      userId: 'test-user-123'
    });
    
    assertEquals(response.cost, 0.01);
    assertEquals(response.tasks[0].cost, 0.01);
  } finally {
    restoreFetch();
  }
});
