import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// CORS - Allowed origins
const allowedOrigins = [
  'https://vhjffdzroebdkbmvcpgv.supabase.co',
  'https://keywordfoundrypro.com',
  'http://localhost:5173',
  'http://localhost:8080',
  'https://lovable.app',
  'https://lovable.dev'
];

// Dynamic CORS headers based on request origin
function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const isAllowed = allowedOrigins.some(allowed =>
    origin === allowed ||
    origin.startsWith(allowed) ||
    origin.endsWith('.lovable.app') ||
    origin.endsWith('.lovable.dev')
  );
  const allowOrigin = isAllowed ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, Authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// Initialize Supabase clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// Admin client for JWT verification only
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Input validation schema for POST
const UpdateOnboardingSchema = z.object({
  show_onboarding: z.boolean(),
});

serve(async (req) => {
  console.log('=== ONBOARDING PREFERENCES REQUEST ===');
  console.log('Method:', req.method);
  console.log('Origin:', req.headers.get('origin'));
  console.log('Timestamp:', new Date().toISOString());

  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Get JWT from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Extract user from already-verified JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    // Create Supabase client with user context
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // GET - Retrieve onboarding preference
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('profiles')
        .select('show_onboarding')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // If profile doesn't exist or column not found, default to true
        return new Response(
          JSON.stringify({ show_onboarding: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const showOnboarding = data?.show_onboarding ?? true;
      console.log(`User ${user.id} onboarding preference: ${showOnboarding}`);

      return new Response(
        JSON.stringify({ show_onboarding: showOnboarding }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Update onboarding preference
    if (req.method === 'POST') {
      const rawBody = await req.json();
      const parseResult = UpdateOnboardingSchema.safeParse(rawBody);

      if (!parseResult.success) {
        console.error('Validation error:', parseResult.error);
        return new Response(
          JSON.stringify({ error: 'Invalid payload', details: parseResult.error.format() }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { show_onboarding } = parseResult.data;
      console.log(`User ${user.id} updating onboarding to: ${show_onboarding}`);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ show_onboarding })
        .eq('id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Update failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Successfully updated onboarding preference for user ${user.id}`);

      return new Response(
        JSON.stringify({ ok: true, show_onboarding }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
