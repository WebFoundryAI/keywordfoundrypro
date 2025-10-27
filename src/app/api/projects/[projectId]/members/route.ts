import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getProjectMembers,
  addProjectMember,
  updateMemberRole,
  removeMember,
  type ProjectRole,
} from '@/lib/permissions/roles';

/**
 * GET /api/projects/[projectId]/members
 * List all members of a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId;

    // Get user from session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For simplicity, assume authenticated user
    // In production, verify session token

    const members = await getProjectMembers(projectId);

    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[projectId]/members
 * Add a new member to a project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId;
    const body = await request.json();

    const { user_id, role, added_by } = body;

    if (!user_id || !role || !added_by) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, role, added_by' },
        { status: 400 }
      );
    }

    if (!['viewer', 'commenter', 'editor', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const result = await addProjectMember(
      projectId,
      user_id,
      role as ProjectRole,
      added_by
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[projectId]/members
 * Update a member's role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId;
    const body = await request.json();

    const { user_id, role, updated_by } = body;

    if (!user_id || !role || !updated_by) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, role, updated_by' },
        { status: 400 }
      );
    }

    if (!['viewer', 'commenter', 'editor', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const result = await updateMemberRole(
      projectId,
      user_id,
      role as ProjectRole,
      updated_by
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[projectId]/members
 * Remove a member from a project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId;
    const body = await request.json();

    const { user_id, removed_by } = body;

    if (!user_id || !removed_by) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, removed_by' },
        { status: 400 }
      );
    }

    const result = await removeMember(projectId, user_id, removed_by);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
