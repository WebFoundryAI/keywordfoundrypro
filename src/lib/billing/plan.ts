/**
 * Plan resolution logic with admin Pro override
 *
 * Admins are automatically treated as Pro tier regardless of Stripe subscription status.
 * This ensures admins have full access to all Pro features without payment requirements.
 */

import { createClient } from '@supabase/supabase-js';
import type { PlanId } from './entitlements';

const supabaseUrl = "https://vhjffdzroebdkbmvcpgv.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoamZmZHpyb2ViZGtibXZjcGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMzA0MDgsImV4cCI6MjA3NDcwNjQwOH0.jxNm1b-5oJJTzFFHpmZ1BNYZGb2lJuphDlmY3Si4tHc";

/**
 * Resolve user's current plan tier
 *
 * Priority order:
 * 1. Admin users → Always 'pro'
 * 2. Active subscription → Use subscription tier
 * 3. Default → 'free'
 *
 * @param userId - User ID to check
 * @param userMetadata - Optional user metadata (to avoid extra DB calls)
 * @returns Plan tier
 */
export async function resolveUserPlan(
  userId: string,
  userMetadata?: any
): Promise<PlanId> {
  // Check if user is admin (multiple possible locations)
  const isAdmin =
    userMetadata?.role === 'admin' ||
    userMetadata?.app_metadata?.roles?.includes('admin') ||
    await checkIsAdmin(userId);

  // Admins always get Pro tier
  if (isAdmin) {
    console.log(`[Plan] User ${userId} is admin, resolving to 'pro'`);
    return 'pro';
  }

  // Check subscription status
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .order('current_period_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscription?.status === 'active' || subscription?.status === 'trialing') {
    const tier = subscription.tier as PlanId;
    console.log(`[Plan] User ${userId} has active subscription: ${tier}`);
    return tier;
  }

  // Default to free tier
  console.log(`[Plan] User ${userId} defaulting to 'free' tier`);
  return 'free';
}

/**
 * Check if user has admin role
 * @param userId - User ID
 * @returns true if user is admin
 */
async function checkIsAdmin(userId: string): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  return !!data;
}
