import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClusterRequest {
  research_id: string;
  cluster_id: string;
  version?: string;
  method?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Admin check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { research_id, cluster_id, version = '1.0', method = 'serp+semantic' }: ClusterRequest = await req.json();

    if (!research_id || !cluster_id) {
      return new Response(
        JSON.stringify({ error: 'research_id and cluster_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting clustering job for research_id: ${research_id}, cluster_id: ${cluster_id}`);

    const jobStartedAt = new Date().toISOString();

    // Fetch keywords for this research
    const { data: keywords, error: keywordsError } = await supabaseClient
      .from('keyword_results')
      .select('keyword, search_volume, difficulty, intent, cluster_id')
      .eq('research_id', research_id)
      .limit(1000);

    if (keywordsError) {
      console.error('Error fetching keywords:', keywordsError);
      throw new Error(`Failed to fetch keywords: ${keywordsError.message}`);
    }

    if (!keywords || keywords.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No keywords found for this research' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${keywords.length} keywords`);

    // Simulate clustering algorithm (placeholder for now)
    // In a real implementation, this would run semantic analysis, SERP similarity, etc.
    const clusteringResult = {
      total_keywords: keywords.length,
      clusters_found: 1,
      method_details: {
        semantic_weight: 0.6,
        serp_weight: 0.4,
      },
      keywords_by_cluster: {
        [cluster_id]: keywords.map(k => k.keyword),
      },
      metadata: {
        processing_time_ms: 0, // Will be calculated below
        algorithm_version: version,
      },
    };

    const jobCompletedAt = new Date().toISOString();
    const processingTime = new Date(jobCompletedAt).getTime() - new Date(jobStartedAt).getTime();
    clusteringResult.metadata.processing_time_ms = processingTime;

    // Check if cluster already exists
    const { data: existingCluster } = await supabaseClient
      .from('keyword_clusters')
      .select('id')
      .eq('research_id', research_id)
      .eq('cluster_id', cluster_id)
      .maybeSingle();

    let result;
    if (existingCluster) {
      // Update existing cluster
      const { data, error } = await supabaseClient
        .from('keyword_clusters')
        .update({
          version,
          method,
          payload: clusteringResult,
          job_started_at: jobStartedAt,
          job_completed_at: jobCompletedAt,
          keyword_count: keywords.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCluster.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating cluster:', error);
        throw new Error(`Failed to update cluster: ${error.message}`);
      }
      result = data;
    } else {
      // Insert new cluster
      const { data, error } = await supabaseClient
        .from('keyword_clusters')
        .insert({
          research_id,
          cluster_id,
          version,
          method,
          payload: clusteringResult,
          job_started_at: jobStartedAt,
          job_completed_at: jobCompletedAt,
          keyword_count: keywords.length,
          status: 'unreviewed',
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting cluster:', error);
        throw new Error(`Failed to insert cluster: ${error.message}`);
      }
      result = data;
    }

    console.log(`Clustering job completed successfully. Cluster ID: ${result.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        cluster: {
          id: result.id,
          research_id: result.research_id,
          cluster_id: result.cluster_id,
          version: result.version,
          method: result.method,
          keyword_count: result.keyword_count,
          created_at: result.created_at,
          job_completed_at: result.job_completed_at,
        },
        payload: clusteringResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cluster-keywords function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
