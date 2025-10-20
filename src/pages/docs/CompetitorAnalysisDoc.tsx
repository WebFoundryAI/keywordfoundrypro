import React from 'react';

export default function CompetitorAnalysisDoc() {
  return (
    <article className="prose max-w-none">
      <h1>Competitor Analysis</h1>
      <p>
        This report compares two domains using DataForSEO and shows where your competitor ranks
        but you do not ("keyword gap"). Results respect the selected <strong>location_code</strong>,
        <strong> language_code</strong>, and <strong>Top N</strong> limit.
      </p>

      <h2>Data sources</h2>
      <ul>
        <li><strong>Labs Ranked Keywords (per domain):</strong> the keywords and ranks for each domain.</li>
        <li><strong>Backlinks Summary (per domain):</strong> backlink and referring domain counts.</li>
        <li><strong>On-Page Summary (optional):</strong> sitewide metrics; we create a crawl task, poll, then read summary.</li>
      </ul>

      <h2>How the gap is calculated</h2>
      <p>
        We fetch ranked keywords for <em>Your Domain</em> and the <em>Competitor</em> for the same market
        (location &amp; language). The gap is a set difference: <code>competitor_keywords − your_keywords</code>.
      </p>

      <h2>Parameters</h2>
      <ul>
        <li><strong>location_code:</strong> DataForSEO location (default 2840). You can change this in the UI.</li>
        <li><strong>language_code:</strong> Language (default "en"). You can change this in the UI.</li>
        <li><strong>Top N:</strong> Caps per-domain keywords fetched (default 300; min 50; max 1000) to manage credits.</li>
      </ul>

      <h2>Caching & reliability</h2>
      <ul>
        <li><strong>Caching:</strong> Default-parameter runs may be cached up to 24 hours to save credits.</li>
        <li><strong>Custom params:</strong> We bypass cache for non-default params (warn: <code>cache_bypass_custom_params</code>).</li>
        <li><strong>Partial results:</strong> If a sub-call is unavailable, we return a 200 with <code>warnings[]</code> and render what we can.</li>
      </ul>

      <h2>Columns you'll see</h2>
      <ul>
        <li><strong>Keyword</strong> — the query.</li>
        <li><strong>Competitor Rank</strong> — absolute rank reported by Labs.</li>
        <li><strong>Search Volume</strong> — average monthly searches.</li>
        <li><strong>Ranking URL</strong> — competitor's URL for that keyword (when available).</li>
      </ul>
    </article>
  );
}
