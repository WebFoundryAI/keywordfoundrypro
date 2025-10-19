/**
 * Fixture Refresh Script
 * 
 * WARNING: This script makes REAL API calls to DataForSEO and will consume credits.
 * Only run this in development when you need to update test fixtures.
 * 
 * Usage:
 *   deno run --allow-net --allow-read --allow-write --allow-env refresh-fixtures.ts
 * 
 * Environment variables required:
 *   DATAFORSEO_LOGIN - Your DataForSEO API login
 *   DATAFORSEO_PASSWORD - Your DataForSEO API password
 */

const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

interface FixtureConfig {
  name: string;
  endpoint: string;
  payload: any;
  description: string;
}

const fixtures: FixtureConfig[] = [
  {
    name: 'keyword-ideas.json',
    endpoint: '/dataforseo_labs/google/keyword_ideas/live',
    payload: [{
      keywords: ['seo tools'],
      location_code: 2840,
      language_code: 'en',
      limit: 5
    }],
    description: 'Keyword research API - keyword ideas endpoint'
  },
  {
    name: 'serp-organic.json',
    endpoint: '/serp/google/organic/live/advanced',
    payload: [{
      keyword: 'seo tools',
      location_code: 2840,
      language_code: 'en',
      device: 'desktop',
      os: 'windows',
      depth: 10
    }],
    description: 'SERP analysis - organic results endpoint'
  },
  {
    name: 'ranked-keywords.json',
    endpoint: '/dataforseo_labs/google/ranked_keywords/live',
    payload: [{
      target: 'example.com',
      location_code: 2840,
      language_code: 'en',
      limit: 3
    }],
    description: 'Competitor analysis - ranked keywords endpoint'
  },
  {
    name: 'backlink-summary.json',
    endpoint: '/backlinks/summary/live',
    payload: [{
      target: 'example.com',
      include_subdomains: true
    }],
    description: 'Competitor analysis - backlink summary endpoint'
  }
];

async function fetchFixture(config: FixtureConfig): Promise<any> {
  const login = Deno.env.get('DATAFORSEO_LOGIN');
  const password = Deno.env.get('DATAFORSEO_PASSWORD');
  
  if (!login || !password) {
    throw new Error('DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD environment variables are required');
  }

  const auth = btoa(`${login}:${password}`);
  const url = `${DATAFORSEO_BASE_URL}${config.endpoint}`;

  console.log(`\n📡 Fetching: ${config.description}`);
  console.log(`   Endpoint: ${config.endpoint}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config.payload)
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`   ✅ Success (cost: $${data.cost || 0})`);
  
  return data;
}

async function saveFixture(name: string, data: any): Promise<void> {
  const fixturesDir = new URL('../fixtures/', import.meta.url).pathname;
  const filePath = `${fixturesDir}${name}`;
  
  await Deno.writeTextFile(filePath, JSON.stringify(data, null, 2));
  console.log(`   💾 Saved to: ${name}`);
}

async function main() {
  console.log('🔄 DataForSEO Fixture Refresh Script');
  console.log('=====================================\n');
  console.log('⚠️  WARNING: This will make REAL API calls and consume credits!\n');

  // Check if running in CI
  if (Deno.env.get('CI') === 'true') {
    console.error('❌ ERROR: This script should not run in CI!');
    console.error('   Fixtures should be committed and not refreshed during CI builds.');
    Deno.exit(1);
  }

  // Verify credentials
  const login = Deno.env.get('DATAFORSEO_LOGIN');
  const password = Deno.env.get('DATAFORSEO_PASSWORD');
  
  if (!login || !password) {
    console.error('❌ ERROR: Missing DataForSEO credentials');
    console.error('   Please set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD environment variables');
    Deno.exit(1);
  }

  console.log(`📋 Refreshing ${fixtures.length} fixtures...\n`);
  
  let totalCost = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const config of fixtures) {
    try {
      const data = await fetchFixture(config);
      await saveFixture(config.name, data);
      totalCost += data.cost || 0;
      successCount++;
    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      errorCount++;
    }
  }

  console.log('\n=====================================');
  console.log(`✨ Refresh complete!`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${errorCount}`);
  console.log(`   Total cost: $${totalCost.toFixed(4)}`);
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some fixtures failed to refresh. Check the errors above.');
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('\n❌ Fatal error:', error);
    Deno.exit(1);
  });
}
