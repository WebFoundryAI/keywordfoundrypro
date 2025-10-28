/**
 * SERP overlap scoring for keyword clustering
 * Calculates how many URLs two keywords share in their top 10 SERP results
 */

/**
 * Calculate SERP overlap score between two keywords (0-10)
 * @param urls1 - First keyword's SERP URLs (top 10)
 * @param urls2 - Second keyword's SERP URLs (top 10)
 * @returns Score from 0 (no overlap) to 10 (identical SERPs)
 */
export function calculateOverlapScore(
  urls1: string[] | undefined,
  urls2: string[] | undefined
): number {
  if (!urls1 || !urls2 || urls1.length === 0 || urls2.length === 0) {
    return 0;
  }

  // Normalize URLs (remove protocol, www, trailing slashes)
  const normalize = (url: string): string => {
    return url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
  };

  const set1 = new Set(urls1.slice(0, 10).map(normalize));
  const set2 = new Set(urls2.slice(0, 10).map(normalize));

  // Count intersection
  let overlap = 0;
  for (const url of set1) {
    if (set2.has(url)) {
      overlap++;
    }
  }

  return overlap;
}

/**
 * Build pairwise overlap matrix for all keywords
 * @param keywords - Array of keywords with SERP URLs
 * @returns 2D array where matrix[i][j] is overlap score between keyword i and j
 */
export function buildOverlapMatrix(
  keywords: Array<{ serp_urls?: string[] }>
): number[][] {
  const n = keywords.length;
  const matrix: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 10; // perfect overlap with self
    for (let j = i + 1; j < n; j++) {
      const score = calculateOverlapScore(
        keywords[i].serp_urls,
        keywords[j].serp_urls
      );
      matrix[i][j] = score;
      matrix[j][i] = score; // symmetric
    }
  }

  return matrix;
}

/**
 * Find all keywords that meet the overlap threshold with a given keyword
 * @param keywordIndex - Index of the keyword to compare
 * @param overlapMatrix - Precomputed overlap scores
 * @param threshold - Minimum overlap score (0-10)
 * @returns Array of keyword indices that meet threshold
 */
export function findSimilarKeywords(
  keywordIndex: number,
  overlapMatrix: number[][],
  threshold: number
): number[] {
  const similar: number[] = [];
  const scores = overlapMatrix[keywordIndex];

  for (let i = 0; i < scores.length; i++) {
    if (i !== keywordIndex && scores[i] >= threshold) {
      similar.push(i);
    }
  }

  return similar;
}
