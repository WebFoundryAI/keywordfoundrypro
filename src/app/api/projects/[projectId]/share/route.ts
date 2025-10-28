import { NextRequest, NextResponse } from 'next/server';
import {
  createProjectShare,
  listProjectShares,
  deleteProjectShare,
} from '@/lib/collab/shares';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const shares = await listProjectShares(params.projectId);
    return NextResponse.json({ shares });
  } catch (error) {
    console.error('Error fetching shares:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shares' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json();
    const { invited_email, role } = body;

    if (!invited_email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: invited_email, role' },
        { status: 400 }
      );
    }

    if (!['viewer', 'commenter'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be viewer or commenter' },
        { status: 400 }
      );
    }

    const { data, error } = await createProjectShare({
      project_id: params.projectId,
      invited_email,
      role,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ share: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating share:', error);
    return NextResponse.json(
      { error: 'Failed to create share' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get('shareId');

    if (!shareId) {
      return NextResponse.json(
        { error: 'Missing shareId parameter' },
        { status: 400 }
      );
    }

    const { success, error } = await deleteProjectShare(shareId);

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting share:', error);
    return NextResponse.json(
      { error: 'Failed to delete share' },
      { status: 500 }
    );
  }
}
