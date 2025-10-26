/**
 * Simple markdown renderer
 * Handles basic markdown syntax for documentation
 */

export function renderMarkdown(markdown: string): string {
  let html = markdown;

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-10 mb-6">$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-md my-4 overflow-x-auto"><code>$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>');

  // Lists
  html = html.replace(/^\* (.+)$/gim, '<li class="ml-4">$1</li>');
  html = html.replace(/^- (.+)$/gim, '<li class="ml-4">$1</li>');
  html = html.replace(/^(\d+)\. (.+)$/gim, '<li class="ml-4 list-decimal">$2</li>');

  // Wrap lists in ul/ol
  html = html.replace(/(<li class="ml-4">.*<\/li>\n?)+/g, '<ul class="list-disc list-inside my-4 space-y-2">$&</ul>');
  html = html.replace(/(<li class="ml-4 list-decimal">.*<\/li>\n?)+/g, '<ol class="list-decimal list-inside my-4 space-y-2">$&</ol>');

  // Paragraphs
  html = html.split('\n\n').map(paragraph => {
    // Don't wrap if already wrapped in HTML tag
    if (paragraph.startsWith('<') || paragraph.trim().length === 0) {
      return paragraph;
    }
    return `<p class="my-4">${paragraph}</p>`;
  }).join('\n\n');

  // Tables
  html = html.replace(/\|(.+)\|/g, (match) => {
    const cells = match.split('|').filter(c => c.trim().length > 0);
    const cellsHtml = cells.map(cell =>
      `<td class="border border-gray-300 dark:border-gray-700 px-4 py-2">${cell.trim()}</td>`
    ).join('');
    return `<tr>${cellsHtml}</tr>`;
  });

  html = html.replace(/(<tr>.*<\/tr>\n?)+/g, '<table class="w-full my-4 border-collapse">$&</table>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gim, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-700 pl-4 italic my-4">$1</blockquote>');

  return html;
}
