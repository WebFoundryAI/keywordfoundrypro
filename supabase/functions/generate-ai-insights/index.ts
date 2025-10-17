import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create a summary of the analysis data
    const summary = {
      keyword_gaps_count: analysisData.keyword_gap_list?.length || 0,
      top_keywords: analysisData.keyword_gap_list?.slice(0, 10).map((k: any) => ({
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

    const prompt = `Analyze this SEO competitor comparison data and write a short report for a marketing executive.
Focus on keyword gaps, backlink strength, and technical performance.
Provide clear, prioritized recommendations to outrank the competitor.

Data:
${JSON.stringify(summary, null, 2)}

Please provide:
1. Executive Summary (2-3 sentences)
2. Key Findings (3-4 bullet points)
3. Strategic Recommendations (3-5 actionable items with priority levels)
4. Quick Wins (2-3 immediate actions)

Keep the tone professional but conversational. Focus on actionable insights.`;

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
            content: 'You are an expert SEO strategist who provides clear, actionable competitive analysis reports for marketing executives.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const reportText = data.choices[0].message.content;

    // Store the report
    const { error: insertError } = await supabaseClient
      .from('ai_reports')
      .insert({
        user_id: user.id,
        competitor: competitorDomain,
        report_text: reportText
      });

    if (insertError) {
      console.error('Error storing AI report:', insertError);
    }

    return new Response(
      JSON.stringify({ report: reportText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-ai-insights:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});