import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify the user is an admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdminData, error: adminError } = await supabaseAdmin
      .rpc('is_admin', { _user_id: user.id });

    if (adminError || !isAdminData) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check triggers
    const { data: triggerStatus, error: checkError } = await supabaseAdmin
      .rpc('check_critical_triggers');

    if (checkError) {
      throw checkError;
    }

    // Log the results
    const missingTriggers = triggerStatus.filter((t: any) => t.status === 'MISSING');
    
    for (const trigger of triggerStatus) {
      await supabaseAdmin
        .from('trigger_health_logs')
        .insert({
          trigger_name: trigger.trigger_name,
          table_schema: trigger.table_schema,
          table_name: trigger.table_name,
          status: trigger.status,
          checked_by: user.id
        });
    }

    // Return results with alert if triggers are missing
    return new Response(
      JSON.stringify({
        success: true,
        triggers: triggerStatus,
        missing_count: missingTriggers.length,
        alert: missingTriggers.length > 0 
          ? `⚠️ ${missingTriggers.length} critical trigger(s) missing!`
          : '✅ All critical triggers present',
        missing_triggers: missingTriggers
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error checking triggers:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
