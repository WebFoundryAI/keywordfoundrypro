export interface ValidationError {
  line: number;
  field: string;
  message: string;
}

export interface KeywordRow {
  keyword: string;
  country?: string;
  language?: string;
  note?: string;
}

export interface ValidationResult {
  valid: boolean;
  rows: KeywordRow[];
  errors: ValidationError[];
}

/**
 * Validate CSV header and map to expected fields
 */
export function validateCsvHeader(header: string[]): {
  valid: boolean;
  mapping: Record<string, number>;
  errors: string[];
} {
  const errors: string[] = [];
  const mapping: Record<string, number> = {};

  // Required: keyword column
  const keywordIndex = header.findIndex((h) =>
    ['keyword', 'keywords', 'query', 'term'].includes(h.toLowerCase().trim())
  );

  if (keywordIndex === -1) {
    errors.push('Missing required column: keyword (or keywords/query/term)');
  } else {
    mapping.keyword = keywordIndex;
  }

  // Optional columns
  const countryIndex = header.findIndex((h) =>
    ['country', 'location', 'geo'].includes(h.toLowerCase().trim())
  );
  if (countryIndex !== -1) mapping.country = countryIndex;

  const langIndex = header.findIndex((h) =>
    ['language', 'lang', 'locale'].includes(h.toLowerCase().trim())
  );
  if (langIndex !== -1) mapping.language = langIndex;

  const noteIndex = header.findIndex((h) =>
    ['note', 'notes', 'comment', 'comments'].includes(h.toLowerCase().trim())
  );
  if (noteIndex !== -1) mapping.note = noteIndex;

  return {
    valid: errors.length === 0,
    mapping,
    errors,
  };
}

/**
 * Validate CSV rows
 */
export function validateCsvRows(
  rows: string[][],
  mapping: Record<string, number>
): ValidationResult {
  const validRows: KeywordRow[] = [];
  const errors: ValidationError[] = [];

  rows.forEach((row, index) => {
    const lineNumber = index + 2; // +2 because of header and 1-based indexing

    // Check keyword exists and is not empty
    const keyword = row[mapping.keyword]?.trim();
    if (!keyword) {
      errors.push({
        line: lineNumber,
        field: 'keyword',
        message: 'Keyword is required and cannot be empty',
      });
      return;
    }

    // Validate keyword length
    if (keyword.length > 200) {
      errors.push({
        line: lineNumber,
        field: 'keyword',
        message: 'Keyword exceeds maximum length of 200 characters',
      });
      return;
    }

    // Build validated row
    const validRow: KeywordRow = { keyword };

    if (mapping.country !== undefined) {
      const country = row[mapping.country]?.trim();
      if (country) validRow.country = country;
    }

    if (mapping.language !== undefined) {
      const language = row[mapping.language]?.trim();
      if (language) validRow.language = language;
    }

    if (mapping.note !== undefined) {
      const note = row[mapping.note]?.trim();
      if (note) validRow.note = note;
    }

    validRows.push(validRow);
  });

  return {
    valid: errors.length === 0,
    rows: validRows,
    errors,
  };
}

/**
 * Parse and validate CSV content
 */
export function validateCsv(csvContent: string): ValidationResult {
  const lines = csvContent.trim().split('\n');

  if (lines.length === 0) {
    return {
      valid: false,
      rows: [],
      errors: [{ line: 0, field: 'csv', message: 'CSV file is empty' }],
    };
  }

  // Parse header
  const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const headerValidation = validateCsvHeader(header);

  if (!headerValidation.valid) {
    return {
      valid: false,
      rows: [],
      errors: headerValidation.errors.map((err) => ({
        line: 1,
        field: 'header',
        message: err,
      })),
    };
  }

  // Parse data rows
  const dataRows = lines.slice(1).map((line) =>
    line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
  );

  return validateCsvRows(dataRows, headerValidation.mapping);
}

/**
 * Validate JSON array of keywords
 */
export function validateJson(jsonData: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!Array.isArray(jsonData)) {
    return {
      valid: false,
      rows: [],
      errors: [{ line: 0, field: 'json', message: 'JSON must be an array of objects' }],
    };
  }

  const validRows: KeywordRow[] = [];

  jsonData.forEach((item, index) => {
    const lineNumber = index + 1;

    if (typeof item !== 'object' || item === null) {
      errors.push({
        line: lineNumber,
        field: 'item',
        message: 'Each item must be an object',
      });
      return;
    }

    const obj = item as Record<string, unknown>;

    // Validate keyword
    if (!obj.keyword || typeof obj.keyword !== 'string') {
      errors.push({
        line: lineNumber,
        field: 'keyword',
        message: 'Keyword is required and must be a string',
      });
      return;
    }

    const keyword = obj.keyword.trim();
    if (!keyword) {
      errors.push({
        line: lineNumber,
        field: 'keyword',
        message: 'Keyword cannot be empty',
      });
      return;
    }

    if (keyword.length > 200) {
      errors.push({
        line: lineNumber,
        field: 'keyword',
        message: 'Keyword exceeds maximum length of 200 characters',
      });
      return;
    }

    const validRow: KeywordRow = { keyword };

    if (obj.country && typeof obj.country === 'string') {
      validRow.country = obj.country.trim();
    }

    if (obj.language && typeof obj.language === 'string') {
      validRow.language = obj.language.trim();
    }

    if (obj.note && typeof obj.note === 'string') {
      validRow.note = obj.note.trim();
    }

    validRows.push(validRow);
  });

  return {
    valid: errors.length === 0,
    rows: validRows,
    errors,
  };
}
