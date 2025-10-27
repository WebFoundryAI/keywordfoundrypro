import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * PATCH /api/roadmap/[itemId]
 * Update a roadmap item (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const itemId = params.itemId;
    const body = await request.json();
    const { title, body: itemBody, state } = body;

    // TODO: Verify user is admin

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (itemBody !== undefined) updateData.body = itemBody;
    if (state !== undefined) {
      if (!['idea', 'planned', 'in-progress', 'done'].includes(state)) {
        return NextResponse.json(
          { error: 'Invalid state value' },
          { status: 400 }
        );
      }
      updateData.state = state;
    }

    const { data, error } = await supabase
      .from('roadmap_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item: data }, { status: 200 });
  } catch (error) {
    console.error('Error updating roadmap item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/roadmap/[itemId]
 * Delete a roadmap item (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const itemId = params.itemId;

    // TODO: Verify user is admin

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete votes first (cascade should handle this, but being explicit)
    await supabase
      .from('roadmap_votes')
      .delete()
      .eq('item_id', itemId);

    // Delete the item
    const { error } = await supabase
      .from('roadmap_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting roadmap item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
