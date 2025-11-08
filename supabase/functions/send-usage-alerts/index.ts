import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UsageAlert {
  user_id: string;
  email: string;
  display_name: string;
  tier: string;
  usage_type: string;
  used: number;
  usage_limit: number;
  percentage: number;
  period_end: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    // Query users who are at 80%+ of their limits
    const { data: usageData, error: usageError } = await supabase.rpc(
      "get_users_near_limits"
    );

    if (usageError) {
      console.error("Error fetching usage data:", usageError);
      throw usageError;
    }

    if (!usageData || usageData.length === 0) {
      console.log("No users near limits found");
      return new Response(
        JSON.stringify({ message: "No alerts to send" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const alerts: UsageAlert[] = usageData;
    const emailsSent: string[] = [];
    const errors: string[] = [];

    for (const alert of alerts) {
      try {
        // Check if we've already sent this notification
        const { data: existingNotification } = await supabase
          .from("usage_notifications")
          .select("id")
          .eq("user_id", alert.user_id)
          .eq("notification_type", `${alert.usage_type}_80`)
          .gte("sent_at", alert.period_end)
          .single();

        if (existingNotification) {
          console.log(`Already sent ${alert.usage_type} alert to ${alert.email}`);
          continue;
        }

        // Send email
        const usageTypeLabel = alert.usage_type === "keywords" 
          ? "Keyword Searches"
          : alert.usage_type === "serp"
          ? "SERP Analyses"
          : "Related Keywords";

        const { error: emailError } = await resend.emails.send({
          from: "Keyword Research Tool <onboarding@resend.dev>",
          to: [alert.email],
          subject: `⚠️ You've used ${Math.round(alert.percentage)}% of your ${usageTypeLabel}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Usage Alert</h2>
              <p>Hi ${alert.display_name || "there"},</p>
              <p>You've used <strong>${alert.used} out of ${alert.usage_limit}</strong> ${usageTypeLabel} (${Math.round(alert.percentage)}% of your monthly limit).</p>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #991b1b;">
                  <strong>Current Plan:</strong> ${alert.tier}<br>
                  <strong>Limit Resets:</strong> ${new Date(alert.period_end).toLocaleDateString()}
                </p>
              </div>

              <p>To avoid hitting your limit, consider:</p>
              <ul>
                <li>Upgrading to a higher tier plan for more capacity</li>
                <li>Monitoring your remaining usage on your dashboard</li>
                <li>Waiting until ${new Date(alert.period_end).toLocaleDateString()} when your limits reset</li>
              </ul>

              <a href="https://your-domain.com/pricing" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                View Pricing Plans
              </a>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Need help? Contact our support team.
              </p>
            </div>
          `,
        });

        if (emailError) {
          console.error(`Error sending email to ${alert.email}:`, emailError);
          errors.push(`${alert.email}: ${emailError.message}`);
          continue;
        }

        // Record notification
        const { error: notifError } = await supabase
          .from("usage_notifications")
          .insert({
            user_id: alert.user_id,
            notification_type: `${alert.usage_type}_80`,
            period_start: new Date(alert.period_end).toISOString(),
          });

        if (notifError) {
          console.error(`Error recording notification for ${alert.email}:`, notifError);
        }

        emailsSent.push(alert.email);
        console.log(`Sent ${alert.usage_type} alert to ${alert.email}`);
      } catch (err: any) {
        console.error(`Error processing alert for ${alert.email}:`, err);
        errors.push(`${alert.email}: ${err.message || 'Unknown error'}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: emailsSent.length,
        emails: emailsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    console.error("Error in send-usage-alerts:", err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
