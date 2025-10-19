/**
 * Generic CSV/TSV export utilities
 * Provides consistent export functionality across the application
 */

export type ExportRow = Record<string, string | number | boolean | null | undefined>;

interface ExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  formatters?: Record<string, (value: any) => string>;
}

/**
 * Escape a CSV field value
 * Handles quotes, commas, and newlines
 */
function escapeCSVField(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Escape a TSV field value
 * Replaces tabs and newlines with spaces
 */
function escapeTSVField(value: string): string {
  return value.replace(/[\t\n\r]/g, ' ');
}

/**
 * Convert value to string, handling null/undefined
 */
function stringifyValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Generate CSV content from array of objects
 * @param rows - Array of data objects
 * @param headers - Column headers (keys to export in order)
 * @param options - Export options
 */
export function toCSV(
  rows: ExportRow[],
  headers: string[],
  options: ExportOptions = {}
): string {
  const { includeHeaders = true, formatters = {} } = options;
  const lines: string[] = [];

  // Add header row
  if (includeHeaders) {
    lines.push(headers.map(escapeCSVField).join(','));
  }

  // Add data rows
  for (const row of rows) {
    const values = headers.map(header => {
      const value = row[header];
      const formatter = formatters[header];
      const stringValue = formatter ? formatter(value) : stringifyValue(value);
      return escapeCSVField(stringValue);
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Generate TSV content from array of objects
 * @param rows - Array of data objects
 * @param headers - Column headers (keys to export in order)
 * @param options - Export options
 */
export function toTSV(
  rows: ExportRow[],
  headers: string[],
  options: ExportOptions = {}
): string {
  const { includeHeaders = true, formatters = {} } = options;
  const lines: string[] = [];

  // Add header row
  if (includeHeaders) {
    lines.push(headers.map(escapeTSVField).join('\t'));
  }

  // Add data rows
  for (const row of rows) {
    const values = headers.map(header => {
      const value = row[header];
      const formatter = formatters[header];
      const stringValue = formatter ? formatter(value) : stringifyValue(value);
      return escapeTSVField(stringValue);
    });
    lines.push(values.join('\t'));
  }

  return lines.join('\n');
}

/**
 * Trigger browser download of content
 * @param content - File content
 * @param filename - Filename for download
 * @param mimeType - MIME type
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export rows as CSV file
 * @param rows - Array of data objects
 * @param headers - Column headers (keys to export in order)
 * @param filename - Filename for download
 * @param options - Export options
 */
export function exportCSV(
  rows: ExportRow[],
  headers: string[],
  filename: string,
  options: ExportOptions = {}
): void {
  const csvContent = toCSV(rows, headers, options);
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
}

/**
 * Export rows as TSV file
 * @param rows - Array of data objects
 * @param headers - Column headers (keys to export in order)
 * @param filename - Filename for download
 * @param options - Export options
 */
export function exportTSV(
  rows: ExportRow[],
  headers: string[],
  filename: string,
  options: ExportOptions = {}
): void {
  const tsvContent = toTSV(rows, headers, options);
  downloadFile(tsvContent, filename, 'text/tab-separated-values;charset=utf-8');
}

/**
 * Generate a timestamp-based filename
 * @param prefix - Filename prefix
 * @param extension - File extension (without dot)
 */
export function generateFilename(prefix: string, extension: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // Remove milliseconds
  return `${prefix}_${timestamp}.${extension}`;
}
