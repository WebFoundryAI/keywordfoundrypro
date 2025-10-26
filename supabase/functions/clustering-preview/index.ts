import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Note: In production, clustering logic should be shared between frontend and Edge Functions
// For now, this is a simplified version that calls the same algorithms

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface Keyword {
  id?: string;
  text: string;
  serp_titles?: string[];
  serp_urls?: string[];
  search_volume?: number;
  difficulty?: number;
}

interface ClusteringParams {
  overlap_threshold: number;
  distance_threshold: number;
  min_cluster_size: number;
  semantic_provider: 'none' | 'openai';
}

interface PreviewRequest {
  keywords: Keyword[];
  params: ClusteringParams;
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { keywords, params }: PreviewRequest = await req.json();

    if (!keywords || keywords.length === 0) {
      return new Response(
        JSON.stringify({ error: 'keywords array is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `Creating cluster preview for ${keywords.length} keywords with params:`,
      params
    );

    // TODO: Implement actual clustering algorithm here
    // For MVP, return a mock response
    // In production, import and use the clustering library
    const mockClusters = [
      {
        id: crypto.randomUUID(),
        name: 'Sample Cluster 1',
        members: keywords.slice(0, Math.min(5, keywords.length)).map((k, i) => ({
          keyword_id: k.id,
          keyword_text: k.text,
          is_representative: i === 0,
          serp_titles: k.serp_titles,
          serp_urls: k.serp_urls,
        })),
        representative: keywords[0]?.text,
      },
    ];

    return new Response(
      JSON.stringify({
        clusters: mockClusters,
        params,
        unclustered: keywords.slice(5),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in clustering-preview function:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
