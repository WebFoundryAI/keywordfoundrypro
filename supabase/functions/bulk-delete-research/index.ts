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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

// Input validation schema
const BulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid("Invalid ID format"))
    .min(1, "At least one ID must be provided")
    .max(1000, "Cannot delete more than 1000 items at once"),
});

serve(async (req) => {
  console.log('=== BULK DELETE RESEARCH REQUEST RECEIVED ===');
  console.log('Method:', req.method);
  console.log('Origin:', req.headers.get('origin'));
  console.log('Authorization header present:', !!req.headers.get('Authorization'));
  console.log('Timestamp:', new Date().toISOString());

  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Get JWT from header - Supabase already verified it
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

    // Parse and validate input
    const rawBody = await req.json();
    const parseResult = BulkDeleteSchema.safeParse(rawBody);

    if (!parseResult.success) {
      console.error('Validation error:', parseResult.error);
      return new Response(
        JSON.stringify({ error: 'Invalid payload', details: parseResult.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { ids } = parseResult.data;
    console.log(`User ${user.id} requesting deletion of ${ids.length} items`);

    // Create Supabase client with user context for RLS
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Delete only rows owned by this user (RLS will enforce, but we add .eq as belt-and-suspenders)
    const { error: deleteError, count } = await supabase
      .from('keyword_research')
      .delete({ count: 'exact' })
      .in('id', ids)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Delete failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully deleted ${count ?? 0} items for user ${user.id}`);

    return new Response(
      JSON.stringify({ ok: true, deleted_count: count ?? 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
