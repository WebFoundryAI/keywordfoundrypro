// Content script for scraping SERP data from Google

interface SerpResult {
  position: number;
  title: string;
  url: string;
  snippet: string;
  type: 'organic' | 'featured' | 'shopping' | 'paa';
}

interface SerpData {
  query: string;
  results: SerpResult[];
  paaPresent: boolean;
  shoppingPresent: boolean;
  totalResults: number;
  country: string;
  language: string;
  scrapedAt: string;
}

function extractQuery(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('q') || '';
}

function extractResults(): SerpResult[] {
  const results: SerpResult[] = [];

  // Organic results (main search results)
  const organicElements = document.querySelectorAll('div.g');

  organicElements.forEach((element, index) => {
    const titleEl = element.querySelector('h3');
    const linkEl = element.querySelector('a');
    const snippetEl = element.querySelector('div[data-sncf], div.VwiC3b');

    if (titleEl && linkEl) {
      results.push({
        position: index + 1,
        title: titleEl.textContent || '',
        url: linkEl.getAttribute('href') || '',
        snippet: snippetEl?.textContent || '',
        type: 'organic'
      });
    }
  });

  return results;
}

function checkPAA(): boolean {
  return document.querySelector('[jsname="related-question"]') !== null ||
         document.querySelector('[jscontroller*="RelatedQuestion"]') !== null;
}

function checkShopping(): boolean {
  return document.querySelector('[data-async-context*="shopping"]') !== null ||
         document.querySelector('.cu-container') !== null;
}

function extractCountry(): string {
  // Try to extract from URL params or page metadata
  const params = new URLSearchParams(window.location.search);
  const gl = params.get('gl');
  if (gl) return gl;

  // Default to US
  return 'US';
}

function extractLanguage(): string {
  const params = new URLSearchParams(window.location.search);
  const hl = params.get('hl');
  if (hl) return hl;

  return document.documentElement.lang || 'en';
}

function scrapeSerpData(): SerpData {
  return {
    query: extractQuery(),
    results: extractResults(),
    paaPresent: checkPAA(),
    shoppingPresent: checkShopping(),
    totalResults: extractResults().length,
    country: extractCountry(),
    language: extractLanguage(),
    scrapedAt: new Date().toISOString()
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeSERP') {
    try {
      const data = scrapeSerpData();
      sendResponse({ success: true, data });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  return true; // Keep channel open for async response
});

// Notify that content script is ready
console.log('[KF SERP Saver] Content script loaded');
