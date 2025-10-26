/**
 * Types for keyword clustering system
 */

export interface Keyword {
  id?: string;
  text: string;
  serp_titles?: string[];
  serp_urls?: string[];
  search_volume?: number;
  difficulty?: number;
}

export interface ClusteringParams {
  overlap_threshold: number; // 0-10, minimum SERP overlap score to group keywords
  distance_threshold: number; // 0-1, semantic distance threshold (lower = more similar)
  min_cluster_size: number; // minimum keywords per cluster
  semantic_provider: 'none' | 'openai'; // semantic similarity provider
}

export interface ClusterMember {
  keyword_id?: string;
  keyword_text: string;
  is_representative: boolean;
  serp_titles?: string[];
  serp_urls?: string[];
}

export interface Cluster {
  id?: string;
  name: string;
  members: ClusterMember[];
  representative?: string; // convenience field for the representative keyword text
}

export interface ClusteringResult {
  clusters: Cluster[];
  params: ClusteringParams;
  unclustered: Keyword[]; // keywords that didn't meet thresholds
}

export interface CommitClusterRequest {
  project_id: string;
  params: ClusteringParams;
  clusters: Cluster[];
}

export interface CommitClusterResponse {
  success: boolean;
  cluster_ids?: string[];
  csv_url?: string;
  json_url?: string;
  error?: string;
}
