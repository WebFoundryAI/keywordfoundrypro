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

    // JSON Feed 1.1 format
    const feed = {
      version: 'https://jsonfeed.org/version/1.1',
      title: 'Keyword Foundry Pro - Changelog',
      home_page_url: `${siteUrl}/changelog`,
      feed_url: `${siteUrl}/changelog/feed.json`,
      description: 'Latest updates, features, and improvements to Keyword Foundry Pro',
      items: entries?.map(entry => ({
        id: entry.id,
        url: `${siteUrl}/changelog#${entry.id}`,
        title: entry.title,
        content_html: entry.content || '',
        summary: entry.description || '',
        date_published: entry.published_at,
        tags: [entry.category, ...(entry.version ? [`v${entry.version}`] : [])],
        _category: entry.category,
        _version: entry.version,
      })) || [],
    };

    return new Response(JSON.stringify(feed, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating JSON feed:', error);
    return new Response(JSON.stringify({ error: 'Error generating feed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
