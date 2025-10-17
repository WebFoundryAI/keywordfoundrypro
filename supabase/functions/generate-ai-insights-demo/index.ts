import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysisData, competitorDomain } = await req.json();
    
    if (!analysisData || !competitorDomain) {
      return new Response(
        JSON.stringify({ error: 'Analysis data and competitor domain are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create a summary of the analysis data
    const summary = {
      keyword_gaps_count: analysisData.keyword_gap_list?.length || 0,
      top_keywords: analysisData.keyword_gap_list?.slice(0, 5).map((k: any) => ({
        keyword: k.keyword,
        position: k.position,
        search_volume: k.search_volume
      })) || [],
      backlinks: {
        your_domain: analysisData.backlink_summary?.your_domain || {},
        competitor: analysisData.backlink_summary?.competitor_domain || {}
      },
      technical: {
        your_domain: analysisData.onpage_summary?.your_domain || {},
        competitor: analysisData.onpage_summary?.competitor_domain || {}
      }
    };

    const prompt = `Analyze this SEO competitor comparison data and write a brief summary.
Focus on the most critical insight only. Keep it under 400 characters.

Data:
${JSON.stringify(summary, null, 2)}

Provide one actionable insight that will help outrank the competitor.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert SEO strategist. Provide concise, actionable insights.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 200
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let reportText = data.choices[0].message.content;

    // Truncate to 500 characters for demo
    if (reportText.length > 500) {
      reportText = reportText.substring(0, 497) + '...';
    }

    return new Response(
      JSON.stringify({ report: reportText, is_demo: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-ai-insights-demo:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
