/**
 * Cache layer for API responses with 24h TTL
 * Avoids re-charging for identical queries
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { createHash } from 'https://deno.land/std@0.168.0/hash/mod.ts';

export interface CacheOptions {
  userId: string;
  projectId?: string;
  seedQuery?: string;
  country?: string;
  language?: string;
  depth?: number;
  endpoint: string;
  filters?: Record<string, unknown>;
  ttlSeconds?: number;
}

export interface CacheEntry<T = unknown> {
  id: string;
  cache_key: string;
  value_json: T;
  first_seen_at: string;
  last_hit_at: string;
  hit_count: number;
  ttl_seconds: number;
}

export interface CacheResult<T = unknown> {
  hit: boolean;
  data: T | null;
  cacheKey?: string;
}

const DEFAULT_TTL_SECONDS = 86400; // 24 hours

/**
 * Generate a deterministic cache key from query parameters
 * Format: hash(userId|projectId|seedQuery|country|language|depth|endpoint|filters)
 */
export function generateCacheKey(options: CacheOptions): string {
  // Normalize filters to ensure consistent key generation
  const normalizedFilters = options.filters
    ? JSON.stringify(sortObjectKeys(options.filters))
    : '';

  // Build key components in fixed order
  const components = [
    options.userId,
    options.projectId || '',
    options.seedQuery || '',
    options.country || '',
    options.language || '',
    options.depth?.toString() || '',
    options.endpoint,
    normalizedFilters,
  ];

  // Join and hash
  const keyString = components.join('|');
  const hash = createHash('sha256');
  hash.update(keyString);
  return hash.toString();
}

/**
 * Sort object keys recursively for deterministic JSON stringification
 */
function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item =>
      typeof item === 'object' && item !== null
        ? sortObjectKeys(item as Record<string, unknown>)
        : item
    );
  }

  const sorted: Record<string, unknown> = {};
  Object.keys(obj).sort().forEach(key => {
    const value = obj[key];
    sorted[key] = typeof value === 'object' && value !== null
      ? sortObjectKeys(value as Record<string, unknown>)
      : value;
  });

  return sorted;
}

/**
 * Get cached result if exists and not expired
 */
export async function getCachedResult<T = unknown>(
  supabase: SupabaseClient,
  options: CacheOptions
): Promise<CacheResult<T>> {
  try {
    const cacheKey = generateCacheKey(options);

    // Query cache table
    const { data, error } = await supabase
      .from('cached_results')
      .select('*')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !data) {
      return { hit: false, data: null };
    }

    // Check if expired
    const createdAt = new Date(data.created_at);
    const ttl = data.ttl_seconds || DEFAULT_TTL_SECONDS;
    const expiresAt = new Date(createdAt.getTime() + ttl * 1000);

    if (expiresAt < new Date()) {
      // Expired - delete and return miss
      await supabase
        .from('cached_results')
        .delete()
        .eq('id', data.id);

      console.log(`[Cache] Expired entry deleted: ${cacheKey}`);
      return { hit: false, data: null, cacheKey };
    }

    // Cache hit! Update last_hit_at and increment hit_count
    await supabase
      .from('cached_results')
      .update({
        last_hit_at: new Date().toISOString(),
        hit_count: data.hit_count + 1,
      })
      .eq('id', data.id);

    console.log(JSON.stringify({
      event: 'cache_hit',
      cache_key: cacheKey,
      hit_count: data.hit_count + 1,
      age_seconds: Math.floor((Date.now() - createdAt.getTime()) / 1000),
      user_id: options.userId,
      project_id: options.projectId,
      timestamp: new Date().toISOString(),
    }));

    return {
      hit: true,
      data: data.value_json as T,
      cacheKey,
    };
  } catch (error) {
    console.error('[Cache] Error getting cached result:', error);
    return { hit: false, data: null };
  }
}

/**
 * Store result in cache
 */
export async function setCachedResult<T = unknown>(
  supabase: SupabaseClient,
  options: CacheOptions,
  value: T
): Promise<boolean> {
  try {
    const cacheKey = generateCacheKey(options);
    const ttlSeconds = options.ttlSeconds || DEFAULT_TTL_SECONDS;

    const { error } = await supabase
      .from('cached_results')
      .upsert({
        cache_key: cacheKey,
        user_id: options.userId,
        project_id: options.projectId || null,
        value_json: value as Record<string, unknown>,
        ttl_seconds: ttlSeconds,
        first_seen_at: new Date().toISOString(),
        last_hit_at: new Date().toISOString(),
        hit_count: 0,
      }, {
        onConflict: 'cache_key',
      });

    if (error) {
      console.error('[Cache] Error setting cached result:', error);
      return false;
    }

    console.log(JSON.stringify({
      event: 'cache_set',
      cache_key: cacheKey,
      ttl_seconds: ttlSeconds,
      user_id: options.userId,
      project_id: options.projectId,
      timestamp: new Date().toISOString(),
    }));

    return true;
  } catch (error) {
    console.error('[Cache] Error setting cached result:', error);
    return false;
  }
}

/**
 * Invalidate (delete) a specific cache entry
 */
export async function invalidateCacheEntry(
  supabase: SupabaseClient,
  cacheKey: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cached_results')
      .delete()
      .eq('cache_key', cacheKey);

    if (error) {
      console.error('[Cache] Error invalidating cache entry:', error);
      return false;
    }

    console.log(JSON.stringify({
      event: 'cache_invalidate',
      cache_key: cacheKey,
      timestamp: new Date().toISOString(),
    }));

    return true;
  } catch (error) {
    console.error('[Cache] Error invalidating cache entry:', error);
    return false;
  }
}

/**
 * Invalidate all cache entries for a user
 */
export async function invalidateUserCache(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('cached_results')
      .delete()
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('[Cache] Error invalidating user cache:', error);
      return 0;
    }

    const count = data?.length || 0;

    console.log(JSON.stringify({
      event: 'cache_invalidate_user',
      user_id: userId,
      deleted_count: count,
      timestamp: new Date().toISOString(),
    }));

    return count;
  } catch (error) {
    console.error('[Cache] Error invalidating user cache:', error);
    return 0;
  }
}
