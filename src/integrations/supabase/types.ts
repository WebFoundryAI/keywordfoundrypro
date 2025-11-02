export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_reports: {
        Row: {
          competitor: string
          created_at: string
          id: string
          report_text: string
          user_id: string
        }
        Insert: {
          competitor: string
          created_at?: string
          id?: string
          report_text: string
          user_id: string
        }
        Update: {
          competitor?: string
          created_at?: string
          id?: string
          report_text?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          project_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cached_results: {
        Row: {
          cache_key: string
          created_at: string
          data: Json
          deleted_at: string | null
          expires_at: string
          id: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          data: Json
          deleted_at?: string | null
          expires_at: string
          id?: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          data?: Json
          deleted_at?: string | null
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      clusters: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          keywords: Json | null
          name: string
          research_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          keywords?: Json | null
          name: string
          research_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          keywords?: Json | null
          name?: string
          research_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      competitor_analysis: {
        Row: {
          backlink_summary: Json | null
          competitor_domain: string
          created_at: string
          expires_at: string
          id: string
          keyword_gap_list: Json | null
          onpage_summary: Json | null
          user_id: string
          your_domain: string
        }
        Insert: {
          backlink_summary?: Json | null
          competitor_domain: string
          created_at?: string
          expires_at: string
          id?: string
          keyword_gap_list?: Json | null
          onpage_summary?: Json | null
          user_id: string
          your_domain: string
        }
        Update: {
          backlink_summary?: Json | null
          competitor_domain?: string
          created_at?: string
          expires_at?: string
          id?: string
          keyword_gap_list?: Json | null
          onpage_summary?: Json | null
          user_id?: string
          your_domain?: string
        }
        Relationships: []
      }
      competitor_cache: {
        Row: {
          checksum: string
          created_at: string
          id: string
          payload: Json
          user_id: string
        }
        Insert: {
          checksum: string
          created_at?: string
          id?: string
          payload: Json
          user_id: string
        }
        Update: {
          checksum?: string
          created_at?: string
          id?: string
          payload?: Json
          user_id?: string
        }
        Relationships: []
      }
      dataforseo_usage: {
        Row: {
          cost_usd: number | null
          created_at: string
          credits_used: number | null
          endpoint: string
          error_message: string | null
          id: string
          module: string
          request_payload: Json | null
          response_status: number | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          credits_used?: number | null
          endpoint: string
          error_message?: string | null
          id?: string
          module: string
          request_payload?: Json | null
          response_status?: number | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          credits_used?: number | null
          endpoint?: string
          error_message?: string | null
          id?: string
          module?: string
          request_payload?: Json | null
          response_status?: number | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      domain_gap_reports: {
        Row: {
          competitor_domain: string
          created_at: string
          freshness: string
          id: string
          include_related: boolean
          include_serp: boolean
          market: string
          my_domain: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          competitor_domain: string
          created_at?: string
          freshness: string
          id?: string
          include_related?: boolean
          include_serp?: boolean
          market: string
          my_domain: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          competitor_domain?: string
          created_at?: string
          freshness?: string
          id?: string
          include_related?: boolean
          include_serp?: boolean
          market?: string
          my_domain?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exports: {
        Row: {
          created_at: string
          deleted_at: string | null
          file_url: string | null
          format: string
          id: string
          research_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          file_url?: string | null
          format: string
          id?: string
          research_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          file_url?: string | null
          format?: string
          id?: string
          research_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      gap_keywords: {
        Row: {
          cpc: number | null
          created_at: string
          delta: number | null
          difficulty: number | null
          id: string
          keyword: string
          kind: string
          opportunity_score: number | null
          report_id: string
          serp_features: Json | null
          their_pos: number | null
          volume: number | null
          your_pos: number | null
        }
        Insert: {
          cpc?: number | null
          created_at?: string
          delta?: number | null
          difficulty?: number | null
          id?: string
          keyword: string
          kind: string
          opportunity_score?: number | null
          report_id: string
          serp_features?: Json | null
          their_pos?: number | null
          volume?: number | null
          your_pos?: number | null
        }
        Update: {
          cpc?: number | null
          created_at?: string
          delta?: number | null
          difficulty?: number | null
          id?: string
          keyword?: string
          kind?: string
          opportunity_score?: number | null
          report_id?: string
          serp_features?: Json | null
          their_pos?: number | null
          volume?: number | null
          your_pos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gap_keywords_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "domain_gap_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      gap_pages: {
        Row: {
          created_at: string
          gaps: Json | null
          id: string
          report_id: string
          their_keywords: Json | null
          their_url: string | null
          your_keywords: Json | null
          your_url: string | null
        }
        Insert: {
          created_at?: string
          gaps?: Json | null
          id?: string
          report_id: string
          their_keywords?: Json | null
          their_url?: string | null
          your_keywords?: Json | null
          your_url?: string | null
        }
        Update: {
          created_at?: string
          gaps?: Json | null
          id?: string
          report_id?: string
          their_keywords?: Json | null
          their_url?: string | null
          your_keywords?: Json | null
          your_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gap_pages_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "domain_gap_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_clusters: {
        Row: {
          cluster_id: string
          created_at: string
          id: string
          job_completed_at: string | null
          job_started_at: string | null
          keyword_count: number
          method: string
          payload: Json | null
          research_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["cluster_status"]
          updated_at: string
          version: string
        }
        Insert: {
          cluster_id: string
          created_at?: string
          id?: string
          job_completed_at?: string | null
          job_started_at?: string | null
          keyword_count?: number
          method?: string
          payload?: Json | null
          research_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["cluster_status"]
          updated_at?: string
          version?: string
        }
        Update: {
          cluster_id?: string
          created_at?: string
          id?: string
          job_completed_at?: string | null
          job_started_at?: string | null
          keyword_count?: number
          method?: string
          payload?: Json | null
          research_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["cluster_status"]
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "keyword_clusters_research_id_fkey"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "keyword_research"
            referencedColumns: ["id"]
          },
        ]
      }
      keyword_research: {
        Row: {
          api_cost: number | null
          created_at: string
          deleted_at: string | null
          id: string
          language_code: string
          language_name: string | null
          location_code: number
          location_name: string | null
          results_limit: number
          seed_keyword: string
          total_results: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_cost?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          language_code?: string
          language_name?: string | null
          location_code?: number
          location_name?: string | null
          results_limit?: number
          seed_keyword: string
          total_results?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_cost?: number | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          language_code?: string
          language_name?: string | null
          location_code?: number
          location_name?: string | null
          results_limit?: number
          seed_keyword?: string
          total_results?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "keyword_research_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      keyword_results: {
        Row: {
          cluster_id: string | null
          cpc: number | null
          created_at: string
          difficulty: number | null
          id: string
          intent: string | null
          keyword: string
          metrics_source: string | null
          related_keywords: string[] | null
          research_id: string
          search_volume: number | null
          suggestions: string[] | null
        }
        Insert: {
          cluster_id?: string | null
          cpc?: number | null
          created_at?: string
          difficulty?: number | null
          id?: string
          intent?: string | null
          keyword: string
          metrics_source?: string | null
          related_keywords?: string[] | null
          research_id: string
          search_volume?: number | null
          suggestions?: string[] | null
        }
        Update: {
          cluster_id?: string | null
          cpc?: number | null
          created_at?: string
          difficulty?: number | null
          id?: string
          intent?: string | null
          keyword?: string
          metrics_source?: string | null
          related_keywords?: string[] | null
          research_id?: string
          search_volume?: number | null
          suggestions?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "keyword_results_research_id_fkey"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "keyword_research"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          data_retention_days: number | null
          display_name: string | null
          email: string | null
          free_reports_renewal_at: string | null
          free_reports_used: number
          has_sample_project: boolean | null
          has_seen_tour: boolean | null
          id: string
          is_admin: boolean | null
          privacy_opt_out: boolean | null
          show_onboarding: boolean
          tour_seen_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          data_retention_days?: number | null
          display_name?: string | null
          email?: string | null
          free_reports_renewal_at?: string | null
          free_reports_used?: number
          has_sample_project?: boolean | null
          has_seen_tour?: boolean | null
          id?: string
          is_admin?: boolean | null
          privacy_opt_out?: boolean | null
          show_onboarding?: boolean
          tour_seen_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          data_retention_days?: number | null
          display_name?: string | null
          email?: string | null
          free_reports_renewal_at?: string | null
          free_reports_used?: number
          has_sample_project?: boolean | null
          has_seen_tour?: boolean | null
          id?: string
          is_admin?: boolean | null
          privacy_opt_out?: boolean | null
          show_onboarding?: boolean
          tour_seen_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_comments: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          project_id: string
          subject_id: string | null
          subject_type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          project_id: string
          subject_id?: string | null
          subject_type: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string
          subject_id?: string | null
          subject_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      project_shares: {
        Row: {
          created_at: string
          id: string
          permission: string
          project_id: string
          shared_by_user_id: string
          shared_with_email: string
          shared_with_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          project_id: string
          shared_by_user_id: string
          shared_with_email: string
          shared_with_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          project_id?: string
          shared_by_user_id?: string
          shared_with_email?: string
          shared_with_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_shares_shared_by_user_id_fkey"
            columns: ["shared_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "project_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      project_snapshots: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          project_id: string | null
          state: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          project_id?: string | null
          state: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          project_id?: string | null
          state?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      research_spaces: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      response_cache: {
        Row: {
          created_at: string
          data: Json
          expires_at: string
          id: string
          key: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          expires_at: string
          id?: string
          key: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          expires_at?: string
          id?: string
          key?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          keywords_per_month: number
          max_saved_projects: number | null
          name: string
          price_monthly: number
          price_yearly: number | null
          related_keywords_per_month: number
          serp_analyses_per_month: number
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          keywords_per_month: number
          max_saved_projects?: number | null
          name: string
          price_monthly: number
          price_yearly?: number | null
          related_keywords_per_month: number
          serp_analyses_per_month: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          keywords_per_month?: number
          max_saved_projects?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          related_keywords_per_month?: number
          serp_analyses_per_month?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
        }
        Relationships: []
      }
      user_limits: {
        Row: {
          created_at: string
          credits_reset_at: string
          credits_used_this_month: number
          id: string
          last_query_reset: string
          plan_id: string
          queries_today: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_reset_at?: string
          credits_used_this_month?: number
          id?: string
          last_query_reset?: string
          plan_id?: string
          queries_today?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_reset_at?: string
          credits_used_this_month?: number
          id?: string
          last_query_reset?: string
          plan_id?: string
          queries_today?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end: string
          current_period_start?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_usage: {
        Row: {
          created_at: string | null
          id: string
          keywords_used: number | null
          period_end: string
          period_start: string
          related_keywords_used: number | null
          serp_analyses_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          keywords_used?: number | null
          period_end: string
          period_start: string
          related_keywords_used?: number | null
          serp_analyses_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          keywords_used?: number | null
          period_end?: string
          period_start?: string
          related_keywords_used?: number | null
          serp_analyses_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_user_perform_action: {
        Args: { action_type: string; user_id_param: string }
        Returns: boolean
      }
      delete_old_system_logs: { Args: never; Returns: undefined }
      delete_user_completely: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      ensure_user_subscription: {
        Args: { user_id_param: string }
        Returns: {
          status: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string
          user_id: string
        }[]
      }
      get_error_rates_by_endpoint: {
        Args: { since_timestamp: string }
        Returns: {
          endpoint: string
          error_rate: number
          error_requests: number
          total_requests: number
        }[]
      }
      get_user_subscription: {
        Args: { user_id_param: string }
        Returns: {
          is_trial: boolean
          period_end: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_credit_usage: {
        Args: { p_credits: number; p_user_id: string }
        Returns: undefined
      }
      increment_query_count: { Args: { p_user_id: string }; Returns: undefined }
      increment_usage: {
        Args: { action_type: string; amount?: number; user_id_param: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_project_member: {
        Args: { p_min_role?: string; p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      refresh_analytics_funnel_view: { Args: never; Returns: undefined }
      update_api_key_last_used: {
        Args: { key_hash_param: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      cluster_status: "unreviewed" | "approved" | "rejected"
      subscription_tier:
        | "free_trial"
        | "starter"
        | "professional"
        | "enterprise"
        | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      cluster_status: ["unreviewed", "approved", "rejected"],
      subscription_tier: [
        "free_trial",
        "starter",
        "professional",
        "enterprise",
        "admin",
      ],
    },
  },
} as const
