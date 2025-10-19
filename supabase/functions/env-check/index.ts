import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnvCheckResult {
  name: string;
  present: boolean;
  required: boolean;
  category: string;
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

    // Define required environment variables
    const requiredVars: Array<{ name: string; category: string }> = [
      { name: 'SUPABASE_URL', category: 'Supabase' },
      { name: 'SUPABASE_ANON_KEY', category: 'Supabase' },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', category: 'Supabase' },
      { name: 'DATAFORSEO_LOGIN', category: 'DataForSEO' },
      { name: 'DATAFORSEO_PASSWORD', category: 'DataForSEO' },
    ];

    const optionalVars: Array<{ name: string; category: string }> = [
      { name: 'OPENAI_API_KEY', category: 'AI Features' },
      { name: 'STRIPE_SECRET_KEY', category: 'Payments' },
      { name: 'STRIPE_WEBHOOK_SECRET', category: 'Payments' },
      { name: 'LOVABLE_API_KEY', category: 'AI Features' },
    ];

    // Check which variables are present (without exposing values)
    const results: EnvCheckResult[] = [];

    requiredVars.forEach(({ name, category }) => {
      const value = Deno.env.get(name);
      results.push({
        name,
        present: !!value && value.length > 0,
        required: true,
        category,
      });
    });

    optionalVars.forEach(({ name, category }) => {
      const value = Deno.env.get(name);
      results.push({
        name,
        present: !!value && value.length > 0,
        required: false,
        category,
      });
    });

    // Calculate summary
    const totalRequired = requiredVars.length;
    const requiredPresent = results.filter(r => r.required && r.present).length;
    const totalOptional = optionalVars.length;
    const optionalPresent = results.filter(r => !r.required && r.present).length;

    const missingRequired = results.filter(r => r.required && !r.present);
    const allRequiredPresent = missingRequired.length === 0;

    console.log(`Environment check: ${requiredPresent}/${totalRequired} required vars present`);

    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        status: allRequiredPresent ? 'healthy' : 'missing_required',
        summary: {
          required: {
            total: totalRequired,
            present: requiredPresent,
            missing: totalRequired - requiredPresent,
          },
          optional: {
            total: totalOptional,
            present: optionalPresent,
            missing: totalOptional - optionalPresent,
          },
        },
        variables: results,
        warnings: missingRequired.length > 0 
          ? [`Missing required variables: ${missingRequired.map(v => v.name).join(', ')}`]
          : [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in env-check function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
