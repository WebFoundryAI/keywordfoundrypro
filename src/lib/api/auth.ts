import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Extract and verify user from Authorization header
 * Returns user ID if authenticated, null otherwise
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ userId: string | null; error: string | null }> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return { userId: null, error: 'Missing Authorization header' };
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return { userId: null, error: 'Invalid Authorization header format' };
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the token and get user
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return { userId: null, error: 'Invalid or expired token' };
    }

    return { userId: data.user.id, error: null };
  } catch (error) {
    return { userId: null, error: 'Authentication failed' };
  }
}

/**
 * Check if user has admin role
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}
