import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const API_KEY_PREFIX = 'kf_';

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface CreateApiKeyResult {
  apiKey: ApiKey;
  plaintextKey: string; // Only returned once
}

/**
 * Generate a secure random API key
 */
function generateKey(): string {
  const randomPart = randomBytes(32).toString('hex');
  return `${API_KEY_PREFIX}${randomPart}`;
}

/**
 * Hash API key using SHA-256
 */
function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(
  userId: string,
  name: string
): Promise<CreateApiKeyResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const plaintextKey = generateKey();
  const keyHash = hashKey(plaintextKey);
  const keyPrefix = plaintextKey.substring(0, 12); // kf_ + first 8 chars

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: userId,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }

  return {
    apiKey: data,
    plaintextKey,
  };
}

/**
 * Verify an API key and return the associated user ID
 * Uses timing-safe comparison to prevent timing attacks
 */
export async function verifyApiKey(
  key: string
): Promise<{ valid: boolean; userId: string | null }> {
  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return { valid: false, userId: null };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const keyHash = hashKey(key);

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single();

  if (error || !data) {
    return { valid: false, userId: null };
  }

  // Use timing-safe comparison
  const storedHash = Buffer.from(data.key_hash, 'hex');
  const providedHash = Buffer.from(keyHash, 'hex');

  if (storedHash.length !== providedHash.length) {
    return { valid: false, userId: null };
  }

  const isValid = timingSafeEqual(storedHash, providedHash);

  if (isValid) {
    // Update last_used_at
    await supabase.rpc('update_api_key_last_used', {
      key_hash_param: keyHash,
    });

    return { valid: true, userId: data.user_id };
  }

  return { valid: false, userId: null };
}

/**
 * List all API keys for a user
 */
export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing API keys:', error);
    return [];
  }

  return data || [];
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(
  keyId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
