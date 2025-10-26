import quickstart from './content/quickstart.md?raw';
import filters from './content/filters.md?raw';
import exports from './content/exports.md?raw';
import limits from './content/limits.md?raw';

export interface DocPage {
  slug: string;
  title: string;
  description: string;
  content: string;
  category: string;
}

export const DOCS_PAGES: DocPage[] = [
  {
    slug: 'quickstart',
    title: 'Getting Started',
    description: 'Run your first keyword research project in minutes',
    content: quickstart,
    category: 'Getting Started',
  },
  {
    slug: 'filters',
    title: 'Filters & Sorting',
    description: 'Learn how to filter and sort results to find opportunities',
    content: filters,
    category: 'Features',
  },
  {
    slug: 'exports',
    title: 'Exporting Results',
    description: 'Export your data in CSV or JSON formats',
    content: exports,
    category: 'Features',
  },
  {
    slug: 'limits',
    title: 'Plans & Limits',
    description: 'Understand your plan limits and usage',
    content: limits,
    category: 'Account',
  },
];

/**
 * Get a documentation page by slug
 */
export function getDocBySlug(slug: string): DocPage | null {
  return DOCS_PAGES.find((doc) => doc.slug === slug) || null;
}

/**
 * Get all documentation pages
 */
export function getAllDocs(): DocPage[] {
  return DOCS_PAGES;
}

/**
 * Search documentation pages
 */
export function searchDocs(query: string): DocPage[] {
  if (!query || query.trim().length === 0) {
    return DOCS_PAGES;
  }

  const lowerQuery = query.toLowerCase();

  return DOCS_PAGES.filter((doc) => {
    const titleMatch = doc.title.toLowerCase().includes(lowerQuery);
    const descriptionMatch = doc.description.toLowerCase().includes(lowerQuery);
    const contentMatch = doc.content.toLowerCase().includes(lowerQuery);
    const categoryMatch = doc.category.toLowerCase().includes(lowerQuery);

    return titleMatch || descriptionMatch || contentMatch || categoryMatch;
  }).map((doc) => {
    // Add search snippet
    const lowerContent = doc.content.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index !== -1) {
      const start = Math.max(0, index - 50);
      const end = Math.min(doc.content.length, index + query.length + 50);
      const snippet = doc.content.substring(start, end);

      return {
        ...doc,
        searchSnippet: `...${snippet}...`,
      };
    }

    return doc;
  });
}

/**
 * Get documentation grouped by category
 */
export function getDocsByCategory(): Record<string, DocPage[]> {
  return DOCS_PAGES.reduce(
    (acc, doc) => {
      if (!acc[doc.category]) {
        acc[doc.category] = [];
      }
      acc[doc.category].push(doc);
      return acc;
    },
    {} as Record<string, DocPage[]>
  );
}

/**
 * Extract headings from markdown content
 */
export function extractHeadings(
  content: string
): Array<{ level: number; text: string; id: string }> {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Array<{ level: number; text: string; id: string }> = [];

  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2];
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    headings.push({ level, text, id });
  }

  return headings;
}
