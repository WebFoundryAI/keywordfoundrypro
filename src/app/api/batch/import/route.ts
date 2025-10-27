import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/auth/apiKey';
import { validateCsv, validateJson } from '@/lib/batch/validator';
import { createBatchJob, processBatchJob } from '@/lib/batch/enqueue';

/**
 * POST /api/batch/import
 * Import keywords in CSV or JSON format
 */
export async function POST(request: NextRequest) {
  try {
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

    // Parse request body
    const contentType = request.headers.get('content-type') || '';
    let inputFormat: 'csv' | 'json';
    let validationResult;

    if (contentType.includes('text/csv') || contentType.includes('application/csv')) {
      inputFormat = 'csv';
      const csvContent = await request.text();
      validationResult = validateCsv(csvContent);
    } else if (contentType.includes('application/json')) {
      inputFormat = 'json';
      const jsonData = await request.json();

      // Extract data if wrapped
      const data = jsonData.data || jsonData.keywords || jsonData;

      // Extract projectId if provided
      const projectId = jsonData.project_id || jsonData.projectId;

      if (!projectId) {
        return NextResponse.json(
          { error: 'Missing project_id' },
          { status: 400 }
        );
      }

      validationResult = validateJson(data);

      // Store projectId for later use
      request.headers.set('x-project-id', projectId);
    } else {
      return NextResponse.json(
        { error: 'Unsupported content type. Use text/csv or application/json' },
        { status: 400 }
      );
    }

    // Check validation errors
    if (!validationResult.valid || validationResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: validationResult.errors,
        },
        { status: 400 }
      );
    }

    // Get project ID from request
    const projectId = request.headers.get('x-project-id') || '';

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing project_id' },
        { status: 400 }
      );
    }

    // Create batch job
    const { jobId, error } = await createBatchJob(
      userId,
      projectId,
      inputFormat,
      validationResult.rows.length,
      {
        validRows: validationResult.rows.length,
        errors: validationResult.errors,
      }
    );

    if (error || !jobId) {
      return NextResponse.json(
        { error: error || 'Failed to create batch job' },
        { status: 500 }
      );
    }

    // Process job asynchronously (in production, use queue)
    processBatchJob(jobId, projectId, validationResult.rows).catch((err) => {
      console.error('Error processing batch job:', err);
    });

    return NextResponse.json(
      {
        success: true,
        jobId,
        total: validationResult.rows.length,
        message: 'Batch job created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing batch import:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
