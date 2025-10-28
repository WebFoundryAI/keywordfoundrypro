/**
 * Keyword clustering orchestrator
 * Combines SERP overlap and optional semantic similarity to group keywords
 */

import type { Keyword, ClusteringParams, Cluster, ClusteringResult } from './types';
import { buildOverlapMatrix } from './overlap';
import { getSemanticProvider, buildSemanticMatrix } from './semantic';

/**
 * Cluster keywords using SERP overlap and optional semantic similarity
 * @param keywords - Array of keywords with SERP data
 * @param params - Clustering parameters
 * @returns Clustering result with clusters and unclustered keywords
 */
export async function clusterKeywords(
  keywords: Keyword[],
  params: ClusteringParams
): Promise<ClusteringResult> {
  if (keywords.length === 0) {
    return { clusters: [], params, unclustered: [] };
  }

  // Build overlap matrix
  const overlapMatrix = buildOverlapMatrix(keywords);

  // Build semantic matrix if enabled
  let semanticMatrix: number[][] | null = null;
  if (params.semantic_provider !== 'none') {
    const provider = getSemanticProvider(
      params.semantic_provider,
      process.env.OPENAI_API_KEY
    );
    const texts = keywords.map((k) => k.text);
    const embeddings = await provider.embed(texts);
    semanticMatrix = buildSemanticMatrix(embeddings, provider);
  }

  // Union-find data structure for clustering
  const parent: number[] = keywords.map((_, i) => i);
  const rank: number[] = Array(keywords.length).fill(0);

  const find = (i: number): number => {
    if (parent[i] !== i) {
      parent[i] = find(parent[i]); // path compression
    }
    return parent[i];
  };

  const union = (i: number, j: number): void => {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI === rootJ) return;

    // Union by rank
    if (rank[rootI] < rank[rootJ]) {
      parent[rootI] = rootJ;
    } else if (rank[rootI] > rank[rootJ]) {
      parent[rootJ] = rootI;
    } else {
      parent[rootJ] = rootI;
      rank[rootI]++;
    }
  };

  // Merge keywords that meet both thresholds
  for (let i = 0; i < keywords.length; i++) {
    for (let j = i + 1; j < keywords.length; j++) {
      let shouldMerge = false;

      // Check overlap threshold
      if (overlapMatrix[i][j] >= params.overlap_threshold) {
        shouldMerge = true;

        // If semantic is enabled, also check semantic threshold
        if (semanticMatrix && semanticMatrix[i][j] > params.distance_threshold) {
          shouldMerge = false; // Too semantically different
        }
      }

      if (shouldMerge) {
        union(i, j);
      }
    }
  }

  // Group keywords by cluster
  const clusterMap = new Map<number, number[]>();
  for (let i = 0; i < keywords.length; i++) {
    const root = find(i);
    if (!clusterMap.has(root)) {
      clusterMap.set(root, []);
    }
    clusterMap.get(root)!.push(i);
  }

  // Filter out clusters smaller than min_cluster_size
  const clusters: Cluster[] = [];
  const unclustered: Keyword[] = [];

  for (const [_root, indices] of clusterMap.entries()) {
    if (indices.length < params.min_cluster_size) {
      // Add to unclustered
      indices.forEach((i) => unclustered.push(keywords[i]));
      continue;
    }

    // Pick representative (highest search volume, or first if no volume)
    let repIndex = indices[0];
    let maxVolume = keywords[repIndex].search_volume || 0;

    for (const idx of indices) {
      const volume = keywords[idx].search_volume || 0;
      if (volume > maxVolume) {
        maxVolume = volume;
        repIndex = idx;
      }
    }

    const representative = keywords[repIndex];
    const members = indices.map((i) => ({
      keyword_id: keywords[i].id,
      keyword_text: keywords[i].text,
      is_representative: i === repIndex,
      serp_titles: keywords[i].serp_titles,
      serp_urls: keywords[i].serp_urls,
    }));

    clusters.push({
      name: `Cluster: ${representative.text}`,
      members,
      representative: representative.text,
    });
  }

  return { clusters, params, unclustered };
}

/**
 * Merge multiple clusters into one
 * @param clusters - Array of clusters to merge
 * @param newName - Name for the merged cluster
 * @returns Single merged cluster
 */
export function mergeClusters(clusters: Cluster[], newName: string): Cluster {
  const allMembers = clusters.flatMap((c) => c.members);

  // Clear all representative flags
  allMembers.forEach((m) => (m.is_representative = false));

  // Pick new representative (highest search volume if available, else first)
  if (allMembers.length > 0) {
    allMembers[0].is_representative = true;
  }

  return {
    name: newName,
    members: allMembers,
    representative: allMembers.find((m) => m.is_representative)?.keyword_text,
  };
}

/**
 * Split a cluster into two based on keyword selection
 * @param cluster - Original cluster
 * @param selectedKeywords - Keywords to move to new cluster
 * @param newName - Name for the new cluster
 * @returns Tuple of [remaining cluster, new cluster]
 */
export function splitCluster(
  cluster: Cluster,
  selectedKeywords: string[],
  newName: string
): [Cluster, Cluster] {
  const selectedSet = new Set(selectedKeywords);

  const remaining = cluster.members.filter(
    (m) => !selectedSet.has(m.keyword_text)
  );
  const newMembers = cluster.members.filter((m) =>
    selectedSet.has(m.keyword_text)
  );

  // Clear representative flags and assign new ones
  remaining.forEach((m) => (m.is_representative = false));
  newMembers.forEach((m) => (m.is_representative = false));

  if (remaining.length > 0) remaining[0].is_representative = true;
  if (newMembers.length > 0) newMembers[0].is_representative = true;

  return [
    {
      name: cluster.name,
      members: remaining,
      representative: remaining.find((m) => m.is_representative)?.keyword_text,
    },
    {
      name: newName,
      members: newMembers,
      representative: newMembers.find((m) => m.is_representative)?.keyword_text,
    },
  ];
}
