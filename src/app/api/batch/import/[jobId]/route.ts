import { NextRequest, NextResponse } from 'next/server';
import { getBatchJobStatus } from '@/lib/batch/enqueue';
import { verifyApiKey } from '@/lib/auth/apiKey';

/**
 * GET /api/batch/import/[jobId]
 * Get status of a batch import job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;

    // Authenticate via API key or session
    const authHeader = request.headers.get('Authorization');

    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const apiKey = authHeader.substring(7);
      const { valid, userId: keyUserId } = await verifyApiKey(apiKey);

      if (!valid || !keyUserId) {
        return NextResponse.json(
          { error: 'Invalid or revoked API key' },
          { status: 401 }
        );
      }

      userId = keyUserId;
    } else {
      // TODO: Check session authentication
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get job status
    const { job, error } = await getBatchJobStatus(jobId);

    if (error || !job) {
      return NextResponse.json(
        { error: error || 'Job not found' },
        { status: 404 }
      );
    }

    // Verify user owns the job
    if (job.user_id !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        jobId: job.id,
        status: job.status,
        total: job.total,
        ok: job.ok,
        failed: job.failed,
        created_at: job.created_at,
        finished_at: job.finished_at,
        progress: job.total > 0 ? Math.round(((job.ok + job.failed) / job.total) * 100) : 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
