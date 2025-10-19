# DataForSEO Client Tests

This directory contains unit tests for the DataForSEO API client wrapper.

## Running Tests

Run all tests:
```bash
deno test supabase/functions/_shared/tests/
```

Run tests with coverage:
```bash
deno test --coverage=coverage supabase/functions/_shared/tests/
deno coverage coverage
```

Run a specific test file:
```bash
deno test supabase/functions/_shared/tests/dataforseo-client.test.ts
```

## Test Structure

- `dataforseo-client.test.ts` - Tests for the centralized DataForSEO client
- `../fixtures/*.json` - Mock API responses used in tests

## Fixtures

Test fixtures are located in `supabase/functions/_shared/fixtures/` and contain representative responses from the DataForSEO API.

### Available Fixtures:
- `keyword-ideas.json` - Keyword research API response
- `serp-organic.json` - SERP analysis organic results
- `ranked-keywords.json` - Ranked keywords for a domain
- `backlink-summary.json` - Backlink summary data
- `rate-limit-error.json` - 429 rate limit error response
- `credits-exhausted-error.json` - 402 payment required error response

## Refreshing Fixtures

**WARNING**: This will make real API calls and consume DataForSEO credits.

To refresh fixtures with live API data (development only):
```bash
deno run --allow-net --allow-read --allow-write --allow-env supabase/functions/_shared/scripts/refresh-fixtures.ts
```

This script:
1. Reads your DataForSEO credentials from environment variables
2. Makes real API calls to DataForSEO endpoints
3. Saves the responses as fixture files
4. Should only be run when you need to update test data with real API responses

## Best Practices

1. **Never commit real API keys** - fixtures are sanitized responses
2. **Keep fixtures minimal** - only include fields used by the tests
3. **Update fixtures sparingly** - only when API contract changes
4. **Mock all external calls** - tests should never make real HTTP requests
5. **Verify error handling** - test both success and error scenarios
