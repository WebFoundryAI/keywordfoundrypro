import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionChangeRequest {
  userId: string;
  oldTier: string;
  newTier: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
}

const tierDisplayNames: Record<string, string> = {
  'free_trial': 'Free Trial',
  'starter': 'Starter',
  'professional': 'Professional',
  'enterprise': 'Enterprise',
};

const formatTierName = (tier: string): string => {
  return tierDisplayNames[tier] || tier;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[Subscription Notification] Function invoked");

    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify caller is admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: isAdminData, error: adminError } = await supabaseClient.rpc('is_admin', {
      _user_id: user.id
    });

    if (adminError || !isAdminData) {
      throw new Error("Only admins can send subscription notifications");
    }

    console.log("[Subscription Notification] Admin verified:", user.email);

    // Parse request body
    const { userId, oldTier, newTier, oldStatus, newStatus, changedBy }: SubscriptionChangeRequest = await req.json();

    console.log("[Subscription Notification] Processing change for user:", userId);
    console.log("[Subscription Notification] Change details:", { oldTier, newTier, oldStatus, newStatus });

    // Get user details
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email, display_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.email) {
      throw new Error(`User not found or has no email: ${profileError?.message}`);
    }

    console.log("[Subscription Notification] Sending email to:", profile.email);

    // Determine what changed
    const tierChanged = oldTier !== newTier;
    const statusChanged = oldStatus !== newStatus;

    let subject = "Your Subscription Has Been Updated";
    let changeDescription = "";

    if (tierChanged && statusChanged) {
      changeDescription = `Your subscription tier has been changed from <strong>${formatTierName(oldTier)}</strong> to <strong>${formatTierName(newTier)}</strong>, and the status has been updated to <strong>${newStatus}</strong>.`;
    } else if (tierChanged) {
      changeDescription = `Your subscription tier has been changed from <strong>${formatTierName(oldTier)}</strong> to <strong>${formatTierName(newTier)}</strong>.`;
      if (oldTier === 'free_trial' && newTier !== 'free_trial') {
        subject = "Welcome to Your New Subscription Plan!";
      } else if (newTier === 'professional' || newTier === 'enterprise') {
        subject = "Your Subscription Has Been Upgraded!";
      }
    } else if (statusChanged) {
      changeDescription = `Your subscription status has been changed from <strong>${oldStatus}</strong> to <strong>${newStatus}</strong>.`;
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Keyword Foundry Pro <onboarding@resend.dev>",
      to: [profile.email],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Subscription Update</h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e1e8ed; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${profile.display_name || 'there'},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              We wanted to let you know that your subscription has been updated by our team.
            </p>
            
            <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <p style="margin: 0; font-size: 16px;">${changeDescription}</p>
            </div>
            
            ${tierChanged ? `
            <div style="margin: 30px 0;">
              <h2 style="color: #667eea; font-size: 20px; margin-bottom: 15px;">What's Next?</h2>
              <ul style="padding-left: 20px; margin: 0;">
                <li style="margin-bottom: 10px;">Log in to your dashboard to see your updated plan details</li>
                <li style="margin-bottom: 10px;">Explore the features available in your ${formatTierName(newTier)} plan</li>
                <li style="margin-bottom: 10px;">Contact support if you have any questions</li>
              </ul>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://keywordfoundrypro.com/dashboard" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                View Dashboard
              </a>
            </div>
            
            <p style="font-size: 14px; color: #718096; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e8ed;">
              If you have any questions about this change, please don't hesitate to contact our support team.
            </p>
            
            <p style="font-size: 14px; color: #718096; margin-top: 20px;">
              Best regards,<br>
              <strong>The Keyword Foundry Pro Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px; color: #718096; font-size: 12px;">
            <p style="margin: 5px 0;">© ${new Date().getFullYear()} Keyword Foundry Pro. All rights reserved.</p>
            <p style="margin: 5px 0;">Changed by: ${changedBy}</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("[Subscription Notification] Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse.data?.id,
        recipient: profile.email 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("[Subscription Notification] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
