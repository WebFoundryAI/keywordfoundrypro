/**
 * Ensure admin users have an Enterprise subscription record in the database
 *
 * This creates a virtual/internal subscription for admins so they appear
 * in the Subscriptions UI as active Enterprise users without requiring Stripe payment.
 *
 * The upsert is idempotent and safe to call repeatedly.
 */

import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://oobxytqzbnvtspodjjop.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYnh5dHF6Ym52dHNwb2Rqam9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzQwNTUsImV4cCI6MjA3ODYxMDA1NX0.EirF0I3Bhmwo5PUDPL3IcyBwjNQPhO14r3zttm6JU88";

export interface EnsureAdminProParams {
  userId: string;
}

/**
 * Upsert internal Enterprise subscription for admin user
 *
 * Creates or updates a subscription record with:
 * - status: 'active'
 * - tier: 'enterprise'
 * - stripe_subscription_id: null (internal grant, not from Stripe)
 * - stripe_customer_id: 'internal-admin'
 *
 * @param params - User ID
 * @returns Success status
 */
export async function ensureAdminPro({
  userId,
}: EnsureAdminProParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const now = new Date().toISOString();

    // Far future date for admin subscriptions (100 years)
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 100);

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('user_subscriptions')
      .select('id, tier, status, stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      // If already has internal admin subscription with correct tier, skip
      if (
        existing.stripe_customer_id === 'internal-admin' &&
        existing.tier === 'enterprise' &&
        existing.status === 'active'
      ) {
        console.log(`[ensureAdminPro] Admin ${userId} already has internal Enterprise subscription`);
        return { success: true };
      }

      // Update existing subscription to internal admin Enterprise
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          tier: 'enterprise',
          stripe_subscription_id: null,
          stripe_customer_id: 'internal-admin',
          current_period_start: now,
          current_period_end: farFuture.toISOString(),
          trial_ends_at: null,
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('[ensureAdminPro] Update error:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log(`[ensureAdminPro] Updated subscription for admin ${userId} to internal Enterprise`);
      return { success: true };
    }

    // Insert new internal admin subscription
    const { error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        status: 'active',
        tier: 'enterprise',
        stripe_subscription_id: null,
        stripe_customer_id: 'internal-admin',
        current_period_start: now,
        current_period_end: farFuture.toISOString(),
        trial_ends_at: null,
      });

    if (insertError) {
      console.error('[ensureAdminPro] Insert error:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log(`[ensureAdminPro] Created internal Enterprise subscription for admin ${userId}`);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ensureAdminPro] Exception:', error);
    return { success: false, error: message };
  }
}

/**
 * React hook to ensure admin Enterprise subscription on mount
 * Call this in admin pages or layouts to ensure subscription exists
 */
export function useEnsureAdminPro(userId: string | undefined, isAdmin: boolean) {
  const [ensured, setEnsured] = React.useState(false);

  React.useEffect(() => {
    if (!userId || !isAdmin || ensured) return;

    ensureAdminPro({ userId }).then((result) => {
      if (result.success) {
        setEnsured(true);
      } else {
        console.warn('[useEnsureAdminPro] Failed to ensure admin Enterprise:', result.error);
      }
    });
  }, [userId, isAdmin, ensured]);

  return ensured;
}
