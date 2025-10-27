import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/roadmap/[itemId]/vote
 * Vote for a roadmap item
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const itemId = params.itemId;

    // TODO: Get user ID from session
    // For now, return error
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );

    // const userId = 'user-id-from-session';

    // const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    // const supabase = createClient(supabaseUrl, supabaseKey);

    // const { error } = await supabase
    //   .from('roadmap_votes')
    //   .insert({
    //     item_id: itemId,
    //     user_id: userId,
    //   });

    // if (error) {
    //   if (error.code === '23505') {
    //     return NextResponse.json(
    //       { error: 'Already voted for this item' },
    //       { status: 409 }
    //     );
    //   }
    //   return NextResponse.json({ error: error.message }, { status: 500 });
    // }

    // return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error voting:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/roadmap/[itemId]/vote
 * Remove vote from a roadmap item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const itemId = params.itemId;

    // TODO: Get user ID from session
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );

    // const userId = 'user-id-from-session';

    // const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    // const supabase = createClient(supabaseUrl, supabaseKey);

    // const { error } = await supabase
    //   .from('roadmap_votes')
    //   .delete()
    //   .eq('item_id', itemId)
    //   .eq('user_id', userId);

    // if (error) {
    //   return NextResponse.json({ error: error.message }, { status: 500 });
    // }

    // return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error removing vote:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
