import { NextRequest, NextResponse } from 'next/server';
import {
  createComment,
  listComments,
  updateComment,
  deleteComment,
} from '@/lib/collab/comments';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const subjectType = searchParams.get('subjectType') as 'keyword' | 'cluster';
    const subjectId = searchParams.get('subjectId');

    if (!projectId || !subjectType || !subjectId) {
      return NextResponse.json(
        { error: 'Missing required parameters: projectId, subjectType, subjectId' },
        { status: 400 }
      );
    }

    if (!['keyword', 'cluster'].includes(subjectType)) {
      return NextResponse.json(
        { error: 'Invalid subjectType. Must be keyword or cluster' },
        { status: 400 }
      );
    }

    const comments = await listComments(projectId, subjectType, subjectId);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { project_id, subject_type, subject_id, body: commentBody } = body;

    if (!project_id || !subject_type || !subject_id || !commentBody) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: project_id, subject_type, subject_id, body',
        },
        { status: 400 }
      );
    }

    if (!['keyword', 'cluster'].includes(subject_type)) {
      return NextResponse.json(
        { error: 'Invalid subject_type. Must be keyword or cluster' },
        { status: 400 }
      );
    }

    const { data, error } = await createComment({
      project_id,
      subject_type,
      subject_id,
      body: commentBody,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentId, body: commentBody } = body;

    if (!commentId || !commentBody) {
      return NextResponse.json(
        { error: 'Missing required fields: commentId, body' },
        { status: 400 }
      );
    }

    const { success, error } = await updateComment(commentId, commentBody);

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json(
        { error: 'Missing commentId parameter' },
        { status: 400 }
      );
    }

    const { success, error } = await deleteComment(commentId);

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
