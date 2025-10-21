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
  // First, try to find existing default space
  const { data: existingSpace, error: selectError } = await supabase
    .from('research_spaces')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_default', true)
    .limit(1)
    .maybeSingle();

  if (selectError) {
    logger.error('Error fetching research space:', selectError);
    throw selectError;
  }

  if (existingSpace) {
    return `/app/research/${existingSpace.id}`;
  }

  // No default space exists, create one
  const { data: newSpace, error: insertError } = await supabase
    .from('research_spaces')
    .insert({
      owner_id: userId,
      title: 'My Research',
      is_default: true,
    })
    .select('id')
    .single();

  if (insertError) {
    logger.error('Error creating research space:', insertError);
    throw insertError;
  }

  return `/app/research/${newSpace.id}`;
}
