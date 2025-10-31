import { supabase } from '@/integrations/supabase/client';
import { createHash } from 'crypto';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  created_at: string;
  expires_at: string;
}

/**
 * Generate a cache key from parameters
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  // Sort keys for consistent hashing
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  const paramString = JSON.stringify(sortedParams);

  // For browser environment, use a simpler hash
  if (typeof window !== 'undefined') {
    // Simple hash function for browser
    let hash = 0;
    for (let i = 0; i < paramString.length; i++) {
      const char = paramString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${prefix}:${Math.abs(hash).toString(36)}`;
  }

  // For Node/Deno environment
  try {
    const hash = createHash('sha256').update(paramString).digest('hex').substring(0, 16);
    return `${prefix}:${hash}`;
  } catch (error) {
    // Fallback to simple hash
    let hash = 0;
    for (let i = 0; i < paramString.length; i++) {
      const char = paramString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `${prefix}:${Math.abs(hash).toString(36)}`;
  }
}

/**
 * Get cached response if available and not expired
 */
export async function getCachedResponse<T = any>(
  key: string,
  userId?: string
): Promise<CacheEntry<T> | null> {
  try {
    let query = supabase
      .from('response_cache')
      .select('*')
      .eq('key', key)
      .gt('expires_at', new Date().toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      key: data.key,
      data: data.data as T,
      created_at: data.created_at,
      expires_at: data.expires_at,
    };
  } catch (error) {
    console.error('Error fetching cached response:', error);
    return null;
  }
}

/**
 * Set cached response with TTL
 */
export async function setCachedResponse<T = any>(
  key: string,
  data: T,
  userId?: string,
  ttlMs: number = CACHE_TTL_MS
): Promise<boolean> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    const cacheEntry = {
      key,
      data,
      user_id: userId || null,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    const { error } = await supabase
      .from('response_cache')
      .upsert([{
        key,
        data: data as any,
        user_id: userId || null,
        expires_at: expiresAt.toISOString(),
      }]);

    if (error) {
      console.error('Error setting cached response:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error setting cached response:', error);
    return false;
  }
}

/**
 * Invalidate cached responses by key pattern
 */
export async function invalidateCache(keyPattern: string, userId?: string): Promise<number> {
  try {
    let query = supabase.from('response_cache').delete();

    // Use LIKE for pattern matching
    if (keyPattern.includes('*')) {
      const likePattern = keyPattern.replace(/\*/g, '%');
      query = query.like('key', likePattern);
    } else {
      query = query.eq('key', keyPattern);
    }

    // Optionally filter by user
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error invalidating cache:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return 0;
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const { data, error, count } = await supabase
      .from('response_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error cleaning up expired cache:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error cleaning up expired cache:', error);
    return 0;
  }
}

/**
 * Wrapper function to cache API responses
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttlMs?: number;
    userId?: string;
    bypassCache?: boolean;
  }
): Promise<T> {
  const { ttlMs = CACHE_TTL_MS, userId, bypassCache = false } = options || {};

  // Check cache first (unless bypass requested)
  if (!bypassCache) {
    const cached = await getCachedResponse<T>(key, userId);
    if (cached) {
      console.log('Cache hit:', key);
      return cached.data;
    }
  }

  // Cache miss - fetch fresh data
  console.log('Cache miss:', key);
  const data = await fetcher();

  // Store in cache
  await setCachedResponse(key, data, userId, ttlMs);

  return data;
}

/**
 * Admin helper to bypass cache
 */
export function shouldBypassCache(isAdmin: boolean, forceRefresh: boolean = false): boolean {
  return isAdmin && forceRefresh;
}
