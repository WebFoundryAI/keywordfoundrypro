import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/auth/apiKey';
import { createClient } from '@supabase/supabase-js';

interface SerpResult {
  position: number;
  title: string;
  url: string;
  snippet: string;
  type: 'organic' | 'featured' | 'shopping' | 'paa';
}

interface SerpData {
  query: string;
  results: SerpResult[];
  paaPresent: boolean;
  shoppingPresent: boolean;
  totalResults: number;
  country: string;
  language: string;
  scrapedAt: string;
}

interface IngestRequest {
  project_id: string;
  serp_data: SerpData;
  note?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // Extract API key from Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify API key
    const { valid, userId } = await verifyApiKey(apiKey);

    if (!valid || !userId) {
      return NextResponse.json(
        { error: 'Invalid or revoked API key' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: IngestRequest = await request.json();
    const { project_id, serp_data, note } = body;

    // Validate required fields
    if (!project_id || !serp_data) {
      return NextResponse.json(
        { error: 'Missing required fields: project_id, serp_data' },
        { status: 400 }
      );
    }

    // Validate SERP data structure
    if (!serp_data.query || !Array.isArray(serp_data.results)) {
      return NextResponse.json(
        { error: 'Invalid serp_data structure' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user owns the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.user_id !== userId) {
      return NextResponse.json(
        { error: 'Access denied to this project' },
        { status: 403 }
      );
    }

    // Store SERP snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('serp_snapshots')
      .insert({
        project_id,
        user_id: userId,
        query: serp_data.query,
        data: {
          results: serp_data.results,
          paaPresent: serp_data.paaPresent,
          shoppingPresent: serp_data.shoppingPresent,
          totalResults: serp_data.totalResults,
          country: serp_data.country,
          language: serp_data.language,
          scrapedAt: serp_data.scrapedAt,
          note: note || null,
        },
        source: 'extension',
      })
      .select()
      .single();

    if (snapshotError) {
      console.error('Error saving SERP snapshot:', snapshotError);
      return NextResponse.json(
        { error: 'Failed to save snapshot' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      snapshot_id: snapshot.id,
      message: 'SERP snapshot saved successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error ingesting SERP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
