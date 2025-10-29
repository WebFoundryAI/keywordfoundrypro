import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Map Stripe price IDs to plan IDs (configure these in your environment)
const PRICE_TO_PLAN_MAP: Record<string, string> = {
  // These should come from env vars or database in production
  'price_trial': 'trial',
  'price_pro_monthly': 'pro',
  'price_pro_yearly': 'pro',
  'price_enterprise': 'enterprise',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeSecretKey || !stripeWebhookSecret) {
      console.error('Missing Stripe credentials');
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('No signature provided');
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);

    console.log('Stripe webhook event:', event.type, 'ID:', event.id);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Idempotency check - have we processed this event already?
    const { data: existingEvent } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('event_id', event.id)
      .single();

    if (existingEvent) {
      console.log('Event already processed:', event.id);
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record that we're processing this event
    await supabase.from('webhook_events').insert({
      event_id: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout completed:', session.id);

        if (session.mode === 'subscription' && session.subscription && session.customer) {
          // Get customer email to find user
          const customer = await stripe.customers.retrieve(session.customer as string);
          const customerEmail = 'email' in customer ? customer.email : null;

          if (!customerEmail) {
            console.error('No email found for customer');
            break;
          }

          // Find user by email
          const { data: userData } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('email', customerEmail)
            .single();

          if (!userData) {
            console.error('User not found for email:', customerEmail);
            break;
          }

          // Update user_subscriptions
          await supabase
            .from('user_subscriptions')
            .upsert({
              user_id: userData.user_id,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              status: 'active',
            }, { onConflict: 'user_id' });

          // Audit event
          await supabase.rpc('record_audit_event', {
            p_user_id: userData.user_id,
            p_project_id: null,
            p_action: 'subscription_created',
            p_meta: {
              stripe_session_id: session.id,
              stripe_subscription_id: session.subscription,
            },
          });

          console.log('Checkout session processed for user:', userData.user_id);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Processing subscription:', subscription.id);

        const priceId = subscription.items.data[0]?.price.id;

        // Determine plan from price ID
        let planId = PRICE_TO_PLAN_MAP[priceId] || 'trial';

        // Try to get plan from database
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('tier')
          .eq('stripe_price_id_monthly', priceId)
          .or(`stripe_price_id_yearly.eq.${priceId}`)
          .single();

        if (planData) {
          planId = planData.tier;
        }

        // Get user from stripe customer ID
        const { data: subData } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', subscription.customer)
          .single();

        if (!subData) {
          console.error('Subscription not found for customer:', subscription.customer);
          break;
        }

        // Update user_subscriptions
        await supabase
          .from('user_subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            tier: planId,
            status: subscription.status === 'active' ? 'active' : 'inactive',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('stripe_customer_id', subscription.customer);

        // Update user_limits with the new plan
        await supabase
          .from('user_limits')
          .update({ plan_id: planId })
          .eq('user_id', subData.user_id);

        // Audit event
        await supabase.rpc('record_audit_event', {
          p_user_id: subData.user_id,
          p_project_id: null,
          p_action: event.type === 'customer.subscription.created' ? 'subscription_created' : 'subscription_updated',
          p_meta: {
            stripe_subscription_id: subscription.id,
            plan_id: planId,
            status: subscription.status,
          },
        });

        console.log('Subscription processed:', subscription.id, 'Plan:', planId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Processing subscription deletion:', subscription.id);

        // Get user from subscription
        const { data: subData } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (!subData) {
          console.error('Subscription not found:', subscription.id);
          break;
        }

        // Downgrade to free
        await supabase
          .from('user_subscriptions')
          .update({
            tier: 'free',
            status: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('stripe_subscription_id', subscription.id);

        // Update user_limits to free plan
        await supabase
          .from('user_limits')
          .update({ plan_id: 'free' })
          .eq('user_id', subData.user_id);

        // Audit event
        await supabase.rpc('record_audit_event', {
          p_user_id: subData.user_id,
          p_project_id: null,
          p_action: 'subscription_canceled',
          p_meta: {
            stripe_subscription_id: subscription.id,
            downgraded_to: 'free',
          },
        });

        console.log('Subscription canceled, downgraded to free:', subData.user_id);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment succeeded for invoice:', invoice.id);

        if (invoice.subscription) {
          const { data: subData } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();

          if (subData) {
            await supabase
              .from('user_subscriptions')
              .update({ status: 'active' })
              .eq('stripe_subscription_id', invoice.subscription);

            // Audit event
            await supabase.rpc('record_audit_event', {
              p_user_id: subData.user_id,
              p_project_id: null,
              p_action: 'payment_succeeded',
              p_meta: {
                stripe_invoice_id: invoice.id,
                amount: invoice.amount_paid,
              },
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment failed for invoice:', invoice.id);

        if (invoice.subscription) {
          const { data: subData } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();

          if (subData) {
            await supabase
              .from('user_subscriptions')
              .update({ status: 'past_due' })
              .eq('stripe_subscription_id', invoice.subscription);

            // Audit event
            await supabase.rpc('record_audit_event', {
              p_user_id: subData.user_id,
              p_project_id: null,
              p_action: 'payment_failed',
              p_meta: {
                stripe_invoice_id: invoice.id,
                amount: invoice.amount_due,
              },
            });
          }
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unexpected error occurred' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});