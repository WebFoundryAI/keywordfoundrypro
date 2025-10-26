import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface ClusterMember {
  keyword_id?: string;
  keyword_text: string;
  is_representative: boolean;
}

interface Cluster {
  id?: string;
  name: string;
  members: ClusterMember[];
}

interface ClusteringParams {
  overlap_threshold: number;
  distance_threshold: number;
  min_cluster_size: number;
  semantic_provider: 'none' | 'openai';
}

interface CommitRequest {
  project_id: string;
  params: ClusteringParams;
  clusters: Cluster[];
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

    const { project_id, params, clusters }: CommitRequest = await req.json();

    if (!project_id || !clusters || clusters.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'project_id and clusters array are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `Committing ${clusters.length} clusters for project ${project_id}`
    );

    // Verify project exists
    const { data: project, error: projectError } = await supabaseClient
      .from('keyword_research')
      .select('id')
      .eq('id', project_id)
      .maybeSingle();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert clusters and members in a transaction
    const clusterIds: string[] = [];

    for (const cluster of clusters) {
      // Insert cluster
      const { data: insertedCluster, error: clusterError } =
        await supabaseClient
          .from('clusters')
          .insert({
            project_id,
            name: cluster.name,
            params,
            created_by: user.id,
          })
          .select('id')
          .single();

      if (clusterError) {
        console.error('Error inserting cluster:', clusterError);
        throw new Error(`Failed to insert cluster: ${clusterError.message}`);
      }

      clusterIds.push(insertedCluster.id);

      // Insert cluster members
      const memberRows = cluster.members.map((member) => ({
        cluster_id: insertedCluster.id,
        keyword_id: member.keyword_id || null,
        keyword_text: member.keyword_text,
        is_representative: member.is_representative,
      }));

      const { error: membersError } = await supabaseClient
        .from('cluster_members')
        .insert(memberRows);

      if (membersError) {
        console.error('Error inserting cluster members:', membersError);
        throw new Error(
          `Failed to insert cluster members: ${membersError.message}`
        );
      }
    }

    console.log(`Successfully committed ${clusterIds.length} clusters`);

    // Generate CSV export
    const csvRows: string[] = ['Pillar Keyword,Support Keyword,Cluster Name,Cluster ID'];

    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      const clusterId = clusterIds[i];
      const pillar = cluster.members.find((m) => m.is_representative);
      const supports = cluster.members.filter((m) => !m.is_representative);

      const pillarText = pillar?.keyword_text || '(no pillar)';

      for (const support of supports) {
        csvRows.push(
          `"${pillarText}","${support.keyword_text}","${cluster.name}","${clusterId}"`
        );
      }

      // If no supports, still output the pillar
      if (supports.length === 0) {
        csvRows.push(
          `"${pillarText}","","${cluster.name}","${clusterId}"`
        );
      }
    }

    const csvContent = csvRows.join('\n');

    // Generate JSON export
    const jsonExport = clusters.map((cluster, i) => {
      const pillar = cluster.members.find((m) => m.is_representative);
      const supports = cluster.members
        .filter((m) => !m.is_representative)
        .map((m) => m.keyword_text);

      return {
        id: clusterIds[i],
        name: cluster.name,
        pillar: pillar?.keyword_text || null,
        supports,
        member_count: cluster.members.length,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        cluster_ids: clusterIds,
        csv_content: csvContent,
        json_content: JSON.stringify(jsonExport, null, 2),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in clustering-commit function:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
