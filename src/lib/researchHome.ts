import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

/**
 * Get or create the user's default research space
 * Returns the canonical path to the user's research space
 */
export async function getOrCreateUserResearchHome(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  return '/app/keyword-research';
}
