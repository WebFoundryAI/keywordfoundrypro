import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  reportId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId } = await req.json() as ReportRequest;

    if (!reportId) {
      return new Response(
        JSON.stringify({ error: 'reportId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the authenticated user from the JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Verify JWT
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch report
    const { data: report, error: reportError } = await supabase
      .from('domain_gap_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError || !report || report.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Report not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch keywords
    const { data: allKeywords, error: keywordsError } = await supabase
      .from('gap_keywords')
      .select('*')
      .eq('report_id', reportId)
      .order('opportunity_score', { ascending: false });

    if (keywordsError) throw keywordsError;

    const missingKeywords = allKeywords.filter(k => k.kind === 'missing').slice(0, 20);
    const overlapKeywords = allKeywords
      .filter(k => k.kind === 'overlap' && k.delta !== null)
      .sort((a, b) => (a.delta || 0) - (b.delta || 0)) // Worst delta first (most negative)
      .slice(0, 20);

    // Calculate KPIs
    const yourKeywords = new Set(allKeywords.filter(k => k.your_pos).map(k => k.keyword));
    const theirKeywords = new Set(allKeywords.map(k => k.keyword));
    const overlap = allKeywords.filter(k => k.kind === 'overlap').length;
    const missing = allKeywords.filter(k => k.kind === 'missing').length;

    // Generate HTML report
    const html = generateReportHTML({
      report,
      kpis: {
        totalYourKeywords: yourKeywords.size,
        totalTheirKeywords: theirKeywords.size,
        overlapCount: overlap,
        missingCount: missing,
      },
      missingKeywords,
      overlapKeywords,
      generatedAt: new Date().toISOString(),
    });

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="competitor-gap-report-${reportId}.html"`,
      },
    });

  } catch (error) {
    console.error('Error generating report:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

interface ReportData {
  report: any;
  kpis: {
    totalYourKeywords: number;
    totalTheirKeywords: number;
    overlapCount: number;
    missingCount: number;
  };
  missingKeywords: any[];
  overlapKeywords: any[];
  generatedAt: string;
}

function generateReportHTML(data: ReportData): string {
  const { report, kpis, missingKeywords, overlapKeywords, generatedAt } = data;
  const date = new Date(generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Competitor Gap Analysis Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: white;
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header {
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 40px;
    }
    
    h1 {
      font-size: 32px;
      color: #1e293b;
      margin-bottom: 10px;
    }
    
    .meta {
      color: #64748b;
      font-size: 14px;
    }
    
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    h2 {
      font-size: 24px;
      color: #1e293b;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .input-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .input-item {
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }
    
    .input-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .input-value {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }
    
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .kpi-card {
      padding: 20px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 8px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    
    .kpi-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 10px;
    }
    
    .kpi-value {
      font-size: 36px;
      font-weight: 700;
      color: #1e293b;
    }
    
    .kpi-card.highlight .kpi-value {
      color: #dc2626;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 14px;
    }
    
    th {
      background: #f1f5f9;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #cbd5e1;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    tr:hover {
      background: #f8fafc;
    }
    
    .keyword {
      font-weight: 600;
      color: #1e293b;
    }
    
    .metric {
      color: #64748b;
    }
    
    .positive {
      color: #16a34a;
      font-weight: 600;
    }
    
    .negative {
      color: #dc2626;
      font-weight: 600;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 14px;
    }
    
    .footer-brand {
      font-weight: 700;
      color: #3b82f6;
      margin-bottom: 10px;
      font-size: 18px;
    }
    
    .footer-links {
      margin-top: 15px;
      display: flex;
      justify-content: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    
    .footer-link {
      color: #64748b;
      text-decoration: none;
    }
    
    .footer-link:hover {
      color: #3b82f6;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      table {
        page-break-inside: auto;
      }
      
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔍 Competitor Gap Analysis Report</h1>
    <div class="meta">
      Generated on ${date}
    </div>
  </div>

  <div class="section">
    <h2>Analysis Parameters</h2>
    <div class="input-grid">
      <div class="input-item">
        <div class="input-label">Your Domain</div>
        <div class="input-value">${report.my_domain}</div>
      </div>
      <div class="input-item">
        <div class="input-label">Competitor Domain</div>
        <div class="input-value">${report.competitor_domain}</div>
      </div>
      <div class="input-item">
        <div class="input-label">Market</div>
        <div class="input-value">${report.market.toUpperCase()}</div>
      </div>
      <div class="input-item">
        <div class="input-label">Freshness</div>
        <div class="input-value">${report.freshness}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Key Performance Indicators</h2>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Your Keywords</div>
        <div class="kpi-value">${kpis.totalYourKeywords.toLocaleString()}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Their Keywords</div>
        <div class="kpi-value">${kpis.totalTheirKeywords.toLocaleString()}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Overlap</div>
        <div class="kpi-value">${kpis.overlapCount.toLocaleString()}</div>
      </div>
      <div class="kpi-card highlight">
        <div class="kpi-label">Missing Keywords</div>
        <div class="kpi-value">${kpis.missingCount.toLocaleString()}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Top 20 Missing Keywords (Opportunities)</h2>
    <table>
      <thead>
        <tr>
          <th>Keyword</th>
          <th>Volume</th>
          <th>Difficulty</th>
          <th>CPC</th>
          <th>Their Pos</th>
          <th>Opportunity</th>
        </tr>
      </thead>
      <tbody>
        ${missingKeywords.map(kw => `
          <tr>
            <td class="keyword">${kw.keyword}</td>
            <td class="metric">${kw.volume?.toLocaleString() || '—'}</td>
            <td class="metric">${kw.difficulty || '—'}</td>
            <td class="metric">$${kw.cpc?.toFixed(2) || '—'}</td>
            <td class="metric">${kw.their_pos || '—'}</td>
            <td class="metric">${kw.opportunity_score?.toFixed(2) || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Top 20 Overlap Keywords (Worst Performance Gap)</h2>
    <table>
      <thead>
        <tr>
          <th>Keyword</th>
          <th>Your Pos</th>
          <th>Their Pos</th>
          <th>Delta</th>
          <th>Volume</th>
          <th>CPC</th>
        </tr>
      </thead>
      <tbody>
        ${overlapKeywords.map(kw => {
          const delta = kw.delta || 0;
          const deltaClass = delta > 0 ? 'positive' : 'negative';
          const deltaText = delta > 0 ? `+${delta}` : delta;
          
          return `
            <tr>
              <td class="keyword">${kw.keyword}</td>
              <td class="metric">${kw.your_pos || '—'}</td>
              <td class="metric">${kw.their_pos || '—'}</td>
              <td class="${deltaClass}">${deltaText}</td>
              <td class="metric">${kw.volume?.toLocaleString() || '—'}</td>
              <td class="metric">$${kw.cpc?.toFixed(2) || '—'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <div class="footer-brand">Keyword Foundry Pro</div>
    <p>Professional SEO Analysis • Built for SEO professionals • Powered by real-time data</p>
    <div class="footer-links">
      <a href="https://example.com/about" class="footer-link">About</a>
      <a href="https://example.com/contact" class="footer-link">Contact</a>
      <a href="https://example.com/terms" class="footer-link">Terms</a>
      <a href="https://example.com/privacy" class="footer-link">Privacy</a>
    </div>
  </div>
</body>
</html>
  `.trim();
}
