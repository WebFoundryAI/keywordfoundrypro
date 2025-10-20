import React from 'react';

export default function TroubleshootingDoc() {
  return (
    <article className="prose max-w-none">
      <h1>Troubleshooting</h1>

      <h2>"Analysis failed" or red toast</h2>
      <ul>
        <li><strong>Rate limit / credits:</strong> reduce <em>Top N</em>, retry later, and confirm DataForSEO credentials for functions.</li>
        <li><strong>Transient errors:</strong> we auto-retry with backoff; if failures persist, you'll see a partial result with <code>warnings[]</code>.</li>
      </ul>

      <h2>On-Page metrics are zero</h2>
      <ul>
        <li>The crawl may still be running; we return a neutral summary if a result isn't ready yet.</li>
        <li>Try again later; once the crawl finishes, summary data will populate.</li>
      </ul>

      <h2>Unexpected domain mismatch</h2>
      <ul>
        <li>Use the exact root domain (no path), and confirm both domains are valid, live sites.</li>
        <li>Verify <em>location_code</em> and <em>language_code</em> match your target market.</li>
      </ul>

      <h2>Exports look different from the table</h2>
      <ul>
        <li>Exports include added fields such as <code>competitor_url</code> and <code>competitor_rank</code> if available.</li>
      </ul>
    </article>
  );
}
