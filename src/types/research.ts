export type ResearchRow = {
  id: string;
  user_id: string;
  seed_keyword: string;
  language_code?: string;
  language_name?: string;
  location_code?: number;
  location_name?: string;
  total_results?: number;
  created_at: string;
  updated_at?: string;
  query_source?: string;
};
