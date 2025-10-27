import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser, isAdmin } from '@/lib/api/auth';

/**
 * GET /api/roadmap
 * Get all roadmap items with vote counts
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all roadmap items
    const { data: items, error } = await supabase
      .from('roadmap_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get vote counts for each item
    const { data: votes } = await supabase
      .from('roadmap_votes')
      .select('item_id');

    const voteCounts: Record<string, number> = {};
    votes?.forEach((vote) => {
      voteCounts[vote.item_id] = (voteCounts[vote.item_id] || 0) + 1;
    });

    // Combine items with vote counts
    const itemsWithVotes = items?.map((item) => ({
      ...item,
      vote_count: voteCounts[item.id] || 0,
    }));

    return NextResponse.json({ items: itemsWithVotes }, { status: 200 });
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/roadmap
 * Create a new roadmap item (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const { userId, error: authError } = await getAuthenticatedUser(request);

    if (authError || !userId) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user is admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, body: itemBody, state } = body;

    if (!title || !itemBody) {
      return NextResponse.json(
        { error: 'Missing required fields: title, body' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('roadmap_items')
      .insert({
        title,
        body: itemBody,
        state: state || 'idea',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating roadmap item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
