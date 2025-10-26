import { SearchIntent, IntentSignals } from './types';

/**
 * Keyword patterns for intent classification
 */
const INTENT_PATTERNS = {
  informational: {
    prefixes: ['what', 'how', 'why', 'when', 'where', 'who', 'guide', 'tutorial'],
    keywords: ['learn', 'meaning', 'definition', 'explain', 'understand', 'difference'],
    weight: 0.8,
  },
  navigational: {
    prefixes: ['login', 'sign in', 'official'],
    keywords: ['website', 'site', 'homepage', 'portal', 'near me', 'open now'],
    weight: 0.9,
  },
  transactional: {
    prefixes: ['buy', 'purchase', 'order', 'download', 'get', 'book', 'subscribe'],
    keywords: [
      'price',
      'cost',
      'cheap',
      'deal',
      'discount',
      'coupon',
      'shop',
      'store',
      'for sale',
    ],
    weight: 0.85,
  },
  commercial: {
    prefixes: ['best', 'top', 'review', 'compare', 'alternative'],
    keywords: [
      'vs',
      'vs.',
      'comparison',
      'versus',
      'affordable',
      'recommended',
      'options',
      'choices',
    ],
    weight: 0.75,
  },
};

/**
 * SERP feature signals for intent
 */
const SERP_INTENT_SIGNALS = {
  informational: ['featured_snippet', 'paa', 'video', 'knowledge_graph'],
  navigational: ['site_links', 'local_pack', 'map'],
  transactional: ['shopping', 'product_listings', 'reviews'],
  commercial: ['reviews', 'comparison_tools', 'paa'],
};

/**
 * Classify search intent based on keyword patterns
 */
function classifyByKeyword(keyword: string): IntentSignals {
  const lowerKeyword = keyword.toLowerCase();
  const signals: string[] = [];
  const scores: Record<SearchIntent, number> = {
    informational: 0,
    navigational: 0,
    commercial: 0,
    transactional: 0,
  };

  // Check each intent type
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    const intentType = intent as SearchIntent;

    // Check prefixes
    for (const prefix of patterns.prefixes) {
      if (lowerKeyword.startsWith(prefix)) {
        scores[intentType] += patterns.weight;
        signals.push(`Starts with "${prefix}"`);
      }
    }

    // Check keywords
    for (const keyword of patterns.keywords) {
      if (lowerKeyword.includes(keyword)) {
        scores[intentType] += patterns.weight * 0.7; // Lower weight for contains
        signals.push(`Contains "${keyword}"`);
      }
    }
  }

  // Find the highest scoring intent
  let maxIntent: SearchIntent = 'informational';
  let maxScore = scores.informational;

  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxIntent = intent as SearchIntent;
      maxScore = score;
    }
  }

  // If no strong signal, default to informational
  if (maxScore === 0) {
    return {
      intent: 'informational',
      confidence: 0.3,
      signals: ['No strong signals - defaulting to informational'],
    };
  }

  return {
    intent: maxIntent,
    confidence: Math.min(maxScore, 1),
    signals,
  };
}

/**
 * Enhance classification with SERP feature analysis
 */
function enhanceWithSerpFeatures(
  baseClassification: IntentSignals,
  serpFeatures: string[]
): IntentSignals {
  if (!serpFeatures || serpFeatures.length === 0) {
    return baseClassification;
  }

  const signals = [...baseClassification.signals];
  let confidenceBoost = 0;

  for (const [intent, features] of Object.entries(SERP_INTENT_SIGNALS)) {
    const matchingFeatures = features.filter((f) =>
      serpFeatures.some((sf) => sf.toLowerCase().includes(f.toLowerCase()))
    );

    if (matchingFeatures.length > 0 && intent === baseClassification.intent) {
      confidenceBoost += matchingFeatures.length * 0.1;
      signals.push(
        `SERP features support ${intent}: ${matchingFeatures.join(', ')}`
      );
    }
  }

  return {
    ...baseClassification,
    confidence: Math.min(baseClassification.confidence + confidenceBoost, 1),
    signals,
  };
}

/**
 * Main classification function
 */
export function classifyIntent(
  keyword: string,
  serpFeatures?: string[]
): IntentSignals {
  // Start with keyword-based classification
  const baseClassification = classifyByKeyword(keyword);

  // Enhance with SERP features if available
  if (serpFeatures && serpFeatures.length > 0) {
    return enhanceWithSerpFeatures(baseClassification, serpFeatures);
  }

  return baseClassification;
}

/**
 * Classify multiple keywords
 */
export function classifyIntentBatch(
  keywords: Array<{ keyword: string; serpFeatures?: string[] }>
): Array<{ keyword: string; classification: IntentSignals }> {
  return keywords.map((item) => ({
    keyword: item.keyword,
    classification: classifyIntent(item.keyword, item.serpFeatures),
  }));
}

/**
 * Get intent label for display
 */
export function getIntentLabel(intent: SearchIntent): string {
  const labels: Record<SearchIntent, string> = {
    informational: 'Informational',
    navigational: 'Navigational',
    commercial: 'Commercial',
    transactional: 'Transactional',
  };
  return labels[intent];
}

/**
 * Get intent color for UI
 */
export function getIntentColor(intent: SearchIntent): string {
  const colors: Record<SearchIntent, string> = {
    informational: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    navigational:
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    commercial:
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    transactional:
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  };
  return colors[intent];
}
