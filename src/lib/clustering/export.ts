/**
 * Export utilities for cluster data (CSV and JSON)
 * Generates pillar → support keyword maps for content planning
 */

import type { Cluster } from './types';

/**
 * Escape CSV field (RFC4180 compliant)
 * @param value - Field value
 * @returns Escaped CSV field
 */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);

  const needsQuoting =
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r');

  if (!needsQuoting) return str;

  // Escape quotes by doubling them
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Export clusters to CSV format
 * Columns: Pillar Keyword, Support Keyword, Cluster Name, Search Volume, Difficulty
 * @param clusters - Array of clusters
 * @returns CSV string
 */
export function exportClustersToCSV(clusters: Cluster[]): string {
  const headers = [
    'Pillar Keyword',
    'Support Keyword',
    'Cluster Name',
    'Cluster ID',
  ];
  const rows: string[] = [headers.map(escapeCsvField).join(',')];

  for (const cluster of clusters) {
    const pillar = cluster.members.find((m) => m.is_representative);
    const supports = cluster.members.filter((m) => !m.is_representative);

    const pillarText = pillar?.keyword_text || '(no pillar)';
    const clusterName = cluster.name;
    const clusterId = cluster.id || '';

    // One row per support keyword
    for (const support of supports) {
      rows.push(
        [
          escapeCsvField(pillarText),
          escapeCsvField(support.keyword_text),
          escapeCsvField(clusterName),
          escapeCsvField(clusterId),
        ].join(',')
      );
    }

    // If no supports, still output the pillar
    if (supports.length === 0) {
      rows.push(
        [
          escapeCsvField(pillarText),
          escapeCsvField(''),
          escapeCsvField(clusterName),
          escapeCsvField(clusterId),
        ].join(',')
      );
    }
  }

  return rows.join('\n');
}

/**
 * Export clusters to JSON format
 * @param clusters - Array of clusters
 * @returns JSON string (pretty-printed)
 */
export function exportClustersToJSON(clusters: Cluster[]): string {
  const output = clusters.map((cluster) => {
    const pillar = cluster.members.find((m) => m.is_representative);
    const supports = cluster.members
      .filter((m) => !m.is_representative)
      .map((m) => m.keyword_text);

    return {
      id: cluster.id || null,
      name: cluster.name,
      pillar: pillar?.keyword_text || null,
      supports,
      member_count: cluster.members.length,
    };
  });

  return JSON.stringify(output, null, 2);
}

/**
 * Generate filename for cluster export
 * @param projectId - Project ID
 * @param format - Export format ('csv' or 'json')
 * @returns Filename string
 */
export function generateClusterExportFilename(
  projectId: string,
  format: 'csv' | 'json'
): string {
  const now = new Date();
  const dateStr = now
    .toISOString()
    .slice(0, 16)
    .replace(/[-:]/g, '')
    .replace('T', '_');
  const projectPart = projectId.slice(0, 8);
  return `kfp_clusters_${projectPart}_${dateStr}.${format}`;
}
