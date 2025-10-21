import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from 'https://esm.sh/resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TrialUser {
  user_id: string;
  email: string;
  display_name: string | null;
  trial_ends_at: string;
  tier: string;
  days_remaining: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting trial reminder check...');

    // Find users with trials expiring in 3 days, 1 day, or expired today
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Query users with active trials expiring soon
    const { data: users, error: queryError } = await supabase
      .from('user_subscriptions')
      .select(`
        user_id,
        trial_ends_at,
        tier,
        profiles!inner(email, display_name)
      `)
      .eq('status', 'active')
      .not('trial_ends_at', 'is', null)
      .gte('trial_ends_at', now.toISOString())
      .lte('trial_ends_at', threeDaysFromNow.toISOString());

    if (queryError) {
      console.error('Query error:', queryError);
      throw queryError;
    }

    if (!users || users.length === 0) {
      console.log('No trials expiring soon');
      return new Response(
        JSON.stringify({ message: 'No trials expiring soon', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${users.length} users with expiring trials`);

    const emailsSent: string[] = [];
    const errors: any[] = [];

    // Process each user
    for (const user of users) {
      try {
        const trialEndsAt = new Date(user.trial_ends_at);
        const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Skip if not at a reminder threshold (3 days, 1 day)
        if (daysRemaining > 3 || daysRemaining < 0) {
          continue;
        }

        const profile = Array.isArray(user.profiles) ? user.profiles[0] : user.profiles;
        const email = profile?.email;
        const displayName = profile?.display_name || 'there';

        if (!email) {
          console.warn(`No email found for user ${user.user_id}`);
          continue;
        }

        // Determine email content based on days remaining
        let subject: string;
        let message: string;

        if (daysRemaining === 3) {
          subject = '⏰ Your trial expires in 3 days';
          message = `
            <h1>Hi ${displayName}!</h1>
            <p>Your trial of Keyword Foundry Pro will expire in <strong>3 days</strong>.</p>
            <p>To continue enjoying unlimited access to our powerful SEO tools, upgrade your account today.</p>
            <p><a href="${Deno.env.get('VITE_APP_BASE_URL') || 'http://localhost:5173'}/pricing" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Pricing Plans</a></p>
            <p>Questions? Just reply to this email.</p>
            <p>Best regards,<br>The Keyword Foundry Pro Team</p>
          `;
        } else if (daysRemaining === 1) {
          subject = '🚨 Your trial expires tomorrow';
          message = `
            <h1>Hi ${displayName}!</h1>
            <p>This is a friendly reminder that your trial of Keyword Foundry Pro expires <strong>tomorrow</strong>.</p>
            <p>Don't lose access to your keyword research, competitor analysis, and SERP insights!</p>
            <p><a href="${Deno.env.get('VITE_APP_BASE_URL') || 'http://localhost:5173'}/pricing" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Upgrade Now</a></p>
            <p>Need help choosing a plan? Reply to this email and we'll assist you.</p>
            <p>Best regards,<br>The Keyword Foundry Pro Team</p>
          `;
        } else {
          continue; // Skip other days
        }

        // Send email via Resend
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'Keyword Foundry Pro <onboarding@resend.dev>',
          to: [email],
          subject,
          html: message,
        });

        if (emailError) {
          console.error(`Failed to send email to ${email}:`, emailError);
          errors.push({ user_id: user.user_id, email, error: emailError });
        } else {
          console.log(`Email sent successfully to ${email} (${daysRemaining} days remaining)`);
          emailsSent.push(email);
        }

      } catch (error) {
        console.error(`Error processing user ${user.user_id}:`, error);
        errors.push({ user_id: user.user_id, error });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emails_sent: emailsSent.length,
        errors: errors.length,
        details: {
          sent: emailsSent,
          errors: errors.length > 0 ? errors : undefined,
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in send-trial-reminders:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
