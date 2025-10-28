import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getProjectMembers,
  addProjectMember,
  updateMemberRole,
  removeMember,
  canView,
  type ProjectRole,
} from '@/lib/permissions/roles';
import { getAuthenticatedUser } from '@/lib/api/auth';

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

    // Get authenticated user
    const { userId, error: authError } = await getAuthenticatedUser(request);

    if (authError || !userId) {
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to this project
    const hasAccess = await canView(projectId, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have access to this project' },
        { status: 403 }
      );
    }

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

    // Get authenticated user
    const { userId, error: authError } = await getAuthenticatedUser(request);

    if (authError || !userId) {
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_id, role } = body;

    if (!user_id || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, role' },
        { status: 400 }
      );
    }

    if (!['viewer', 'commenter', 'editor', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Use authenticated user as the one adding the member
    const result = await addProjectMember(
      projectId,
      user_id,
      role as ProjectRole,
      userId
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

    // Get authenticated user
    const { userId, error: authError } = await getAuthenticatedUser(request);

    if (authError || !userId) {
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_id, role } = body;

    if (!user_id || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, role' },
        { status: 400 }
      );
    }

    if (!['viewer', 'commenter', 'editor', 'owner'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Use authenticated user as the one updating the role
    const result = await updateMemberRole(
      projectId,
      user_id,
      role as ProjectRole,
      userId
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

    // Get authenticated user
    const { userId, error: authError } = await getAuthenticatedUser(request);

    if (authError || !userId) {
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'Missing required field: user_id' },
        { status: 400 }
      );
    }

    // Use authenticated user as the one removing the member
    const result = await removeMember(projectId, user_id, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
