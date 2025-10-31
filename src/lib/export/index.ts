/**
 * Export utilities for CSV/TSV/JSON data export
 * RFC4180-compliant CSV encoding with proper escaping
 */

import { supabase } from '@/integrations/supabase/client';

export type ExportType = 'csv' | 'tsv' | 'json';

export interface ExportColumn {
  field: string;
  header: string;
}

export interface ExportOptions {
  type: ExportType;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
  filename?: string;
  projectId?: string;
  filters?: Record<string, unknown>;
  sort?: Record<string, unknown>;
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  rowCount?: number;
  error?: string;
}

/**
 * Escape CSV field according to RFC4180
 * - Fields containing comma, quote, or newline must be quoted
 * - Quotes inside fields must be doubled
 * - Use decimal point for numbers (not locale-specific)
 */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // Normalize numbers to use decimal point
  if (typeof value === 'number') {
    str = value.toString();
  }

  // Check if quoting is needed
  const needsQuoting = str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r');

  if (!needsQuoting) {
    return str;
  }

  // Escape quotes by doubling them
  str = str.replace(/"/g, '""');

  // Wrap in quotes
  return `"${str}"`;
}

/**
 * Escape TSV field
 * - Replace tabs with spaces
 * - Replace newlines with spaces
 * - No quoting needed for TSV
 */
function escapeTsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // Normalize numbers to use decimal point
  if (typeof value === 'number') {
    str = value.toString();
  }

  // Replace tabs and newlines with spaces
  str = str.replace(/\t/g, ' ').replace(/\r?\n/g, ' ');

  return str;
}

/**
 * Convert data to CSV format (RFC4180)
 */
function toCsv(columns: ExportColumn[], data: Record<string, unknown>[]): string {
  const lines: string[] = [];

  // Header row
  const headers = columns.map((col) => escapeCsvField(col.header));
  lines.push(headers.join(','));

  // Data rows
  for (const row of data) {
    const values = columns.map((col) => escapeCsvField(row[col.field]));
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Convert data to TSV format
 */
function toTsv(columns: ExportColumn[], data: Record<string, unknown>[]): string {
  const lines: string[] = [];

  // Header row
  const headers = columns.map((col) => escapeTsvField(col.header));
  lines.push(headers.join('\t'));

  // Data rows
  for (const row of data) {
    const values = columns.map((col) => escapeTsvField(row[col.field]));
    lines.push(values.join('\t'));
  }

  return lines.join('\n');
}

/**
 * Convert data to JSON format
 */
function toJson(columns: ExportColumn[], data: Record<string, unknown>[]): string {
  const exportData = data.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const col of columns) {
      obj[col.field] = row[col.field];
    }
    return obj;
  });

  return JSON.stringify(exportData, null, 2);
}

/**
 * Generate deterministic filename
 * Format: kfp_export_{projectId}_{YYYYMMDD_HHMM}.{ext}
 */
export function generateFilename(
  type: ExportType,
  projectId?: string,
  customName?: string
): string {
  if (customName) {
    return customName;
  }

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '_');

  const projectPart = projectId ? `_${projectId.slice(0, 8)}` : '';
  const ext = type === 'json' ? 'json' : type;

  return `kfp_export${projectPart}_${dateStr}.${ext}`;
}

/**
 * Export data to specified format
 */
export function exportData(options: ExportOptions): ExportResult {
  try {
    const { type, columns, data, filename } = options;

    if (!data || data.length === 0) {
      return { success: false, error: 'No data to export' };
    }

    if (!columns || columns.length === 0) {
      return { success: false, error: 'No columns specified' };
    }

    let content: string;
    let mimeType: string;

    switch (type) {
      case 'csv':
        content = toCsv(columns, data);
        mimeType = 'text/csv;charset=utf-8';
        break;
      case 'tsv':
        content = toTsv(columns, data);
        mimeType = 'text/tab-separated-values;charset=utf-8';
        break;
      case 'json':
        content = toJson(columns, data);
        mimeType = 'application/json;charset=utf-8';
        break;
      default:
        return { success: false, error: `Unsupported export type: ${type}` };
    }

    // Create blob and download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || generateFilename(type, options.projectId);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      success: true,
      filename: a.download,
      rowCount: data.length,
    };
  } catch (err) {
    console.error('[Export] Error exporting data:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Export failed',
    };
  }
}

/**
 * Record export in database for audit trail
 */
export async function recordExport(
  options: ExportOptions,
  result: ExportResult
): Promise<void> {
  if (!result.success || !result.filename) {
    return;
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn('[Export] Not authenticated, skipping export record');
      return;
    }

    const columnNames = options.columns.map((col) => col.field);

    await supabase.from('exports').insert([{
      user_id: user.id,
      research_id: options.projectId || null,
      format: 'csv',
      status: 'completed',
    }]);
  } catch (err) {
    console.error('[Export] Error recording export:', err);
    // Don't fail the export if recording fails
  }
}

/**
 * Export data with automatic recording
 */
export async function exportDataWithRecord(
  options: ExportOptions
): Promise<ExportResult> {
  const result = exportData(options);

  if (result.success) {
    // Record in background (non-blocking)
    recordExport(options, result).catch((err) => {
      console.error('[Export] Failed to record export:', err);
    });
  }

  return result;
}

/**
 * Get export history for a user
 */
export async function getExportHistory(
  projectId?: string,
  limit: number = 50
): Promise<{ exports: unknown[]; error?: string }> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { exports: [], error: 'Not authenticated' };
    }

    let data: any = null;
    let error: any = null;
    
    if (projectId) {
      const result: any = await (supabase as any)
        .from('exports')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);
      data = result.data;
      error = result.error;
    } else {
      const result: any = await (supabase as any)
        .from('exports')
        .select('*')
        .eq('user_id', user.id)
        .is('project_id', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('[Export] Error fetching export history:', error);
      return { exports: [], error: error.message };
    }

    return { exports: data || [] };
  } catch (err) {
    console.error('[Export] Unexpected error:', err);
    return {
      exports: [],
      error: err instanceof Error ? err.message : 'Failed to fetch export history',
    };
  }
}
