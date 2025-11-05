import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting user creation...");
    
    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Try to create the user, or get existing user
    let userId: string;
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: "nicoletmein@gmail.com",
      password: "letmein123",
      email_confirm: true,
      user_metadata: {
        full_name: "Nico",
        display_name: "Nico"
      }
    });

    if (createError) {
      // If user already exists, get their ID
      const errorStr = String(createError);
      console.log("Create error:", errorStr);
      if (errorStr.includes("already been registered") || errorStr.includes("email")) {
        console.log("User already exists, fetching ID...");
        const { data: existingProfile } = await supabaseAdmin
          .from('profiles')
          .select('user_id')
          .eq('email', 'nicoletmein@gmail.com')
          .single();
        
        if (!existingProfile) throw new Error("User exists but profile not found");
        userId = existingProfile.user_id;
        console.log("Found existing user:", userId);
      } else {
        throw createError;
      }
    } else {
      if (!newUser.user) throw new Error("User not created");
      userId = newUser.user.id;
      console.log("User created:", userId);
    }

    // Add admin role (ignore if already exists)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'admin'
      });

    if (roleError && !roleError.message.includes("duplicate key")) {
      throw roleError;
    }
    console.log("Admin role ensured");

    // Update professional subscription
    const { error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        tier: 'professional',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        stripe_customer_id: 'internal_admin_nico',
        stripe_subscription_id: 'internal_admin_nico'
      })
      .eq('user_id', userId);

    if (subError) throw subError;
    console.log("Professional subscription added");

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: userId,
          email: "nicoletmein@gmail.com"
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating user:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
