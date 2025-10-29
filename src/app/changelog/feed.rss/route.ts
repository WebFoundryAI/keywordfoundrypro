import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: entries, error } = await supabase
      .from('changelog')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const siteUrl = import.meta.env.VITE_SITE_URL || 'https://keywordfoundrypro.com';
    const buildDate = new Date().toUTCString();

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Keyword Foundry Pro - Changelog</title>
    <link>${siteUrl}/changelog</link>
    <description>Latest updates, features, and improvements to Keyword Foundry Pro</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${siteUrl}/changelog/feed.rss" rel="self" type="application/rss+xml" />
    ${entries?.map(entry => `
    <item>
      <title>${escapeXml(entry.title)}</title>
      <link>${siteUrl}/changelog#${entry.id}</link>
      <guid isPermaLink="false">${entry.id}</guid>
      <pubDate>${new Date(entry.published_at).toUTCString()}</pubDate>
      <description>${escapeXml(entry.description || '')}</description>
      <category>${escapeXml(entry.category)}</category>
      ${entry.version ? `<category>Version ${escapeXml(entry.version)}</category>` : ''}
    </item>`).join('')}
  </channel>
</rss>`;

    return new Response(rss, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new Response('Error generating feed', { status: 500 });
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
