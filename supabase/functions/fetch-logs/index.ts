import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdminData } = await supabaseClient
      .rpc('is_admin', { _user_id: user.id });

    if (!isAdminData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const level = url.searchParams.get('level');
    const functionName = url.searchParams.get('function');

    // Build query
    let query = supabaseClient
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 1000));

    if (level && level !== 'all') {
      query = query.eq('level', level);
    }

    if (functionName && functionName !== 'all') {
      query = query.eq('function_name', functionName);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching logs:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch logs', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform logs to match frontend format
    const transformedLogs = (logs || []).map(log => ({
      timestamp: log.created_at,
      level: log.level,
      message: log.message,
      function: log.function_name,
      metadata: log.metadata,
      user_id: log.user_id,
      request_id: log.request_id
    }));

    return new Response(
      JSON.stringify({ logs: transformedLogs, count: transformedLogs.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
