import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface KeywordRequest {
  keyword: string;
  languageCode?: string;
  locationCode?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse the request body
    const { keyword, languageCode = 'en', locationCode = 2840 }: KeywordRequest = await req.json()

    if (!keyword) {
      throw new Error('Keyword is required')
    }

    // Prepare the DataForSEO API request - using Labs Related Keywords endpoint
    const apiPayload = {
      "keyword": keyword,
      "language_code": languageCode,
      "location_code": locationCode,
      "depth": 1,
      "limit": 100
    }

    console.log('Calling DataForSEO Labs API with payload:', JSON.stringify(apiPayload))

    // Call DataForSEO Labs API for related keywords
    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${Deno.env.get('DATAFORSEO_LOGIN')}:${Deno.env.get('DATAFORSEO_PASSWORD')}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([apiPayload])
    })

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status} ${response.statusText}`)
    }

    const apiData = await response.json()
    console.log('DataForSEO Labs API response (first 200 chars):', JSON.stringify(apiData).substring(0, 200))

    if (!apiData.tasks || !apiData.tasks[0]) {
      throw new Error('Invalid API response structure')
    }

    const task = apiData.tasks[0]
    
    if (task.status_code !== 20000) {
      throw new Error(`API error: ${task.status_code} - ${task.status_message}`)
    }

    if (!task.result || !task.result[0] || !task.result[0].items) {
      console.log('No related keywords found')
      return new Response(
        JSON.stringify({ 
          success: true,
          results: [],
          total_results: 0,
          estimated_cost: 0,
          message: 'No related keywords found. Try a broader seed keyword or change location/language.'
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    const items = task.result[0].items

    // Process the keywords from Labs endpoint
    const relatedKeywords = items
      .filter((item: any) => {
        // Filter out items without keywords or search volume
        return item.keyword_data && 
               item.keyword_data.keyword && 
               (item.keyword_data.keyword_info?.search_volume || 0) > 0
      })
      .map((item: any) => {
        const keywordData = item.keyword_data
        const keywordInfo = keywordData.keyword_info || {}
        
        return {
          keyword: keywordData.keyword,
          searchVolume: keywordInfo.search_volume || 0,
          cpc: keywordInfo.cpc || 0,
          competition: keywordInfo.competition || 0,
          difficulty: convertCompetitionToDifficulty(keywordInfo.competition_level, keywordInfo.competition_index),
          intent: determineIntent(keywordData.keyword),
          relevance: Math.round((item.relevance || 0) * 100), // Use API relevance score
          trend: keywordInfo.monthly_searches || null,
          categories: keywordData.categories || []
        }
      })
      .sort((a: any, b: any) => b.searchVolume - a.searchVolume)
      .slice(0, 100) // Limit to 100 results as per credit-efficiency guidelines

    console.log(`Processed ${relatedKeywords.length} related keywords`)

    const totalResults = relatedKeywords.length
    const estimatedCost = 0.02 // Estimated cost per request

    // Store results in database if any exist
    if (relatedKeywords.length > 0) {
      // First create a research record
      const { data: research, error: researchError } = await supabaseClient
        .from('keyword_research')
        .insert({
          user_id: user.id,
          seed_keyword: keyword,
          language_code: languageCode,
          location_code: locationCode,
          results_limit: relatedKeywords.length,
          total_results: relatedKeywords.length,
          api_cost: estimatedCost
        })
        .select()
        .single();

      if (researchError) {
        console.error('Error creating research record:', researchError);
        throw new Error('Failed to create research record');
      }

      // Then store the keyword results
      const resultsWithResearchId = relatedKeywords.map((result: any) => ({
        research_id: research.id,
        keyword: result.keyword,
        search_volume: result.searchVolume,
        cpc: result.cpc,
        intent: result.intent,
        difficulty: result.difficulty,
        metrics_source: 'dataforseo_related'
      }));

      const { error: resultsError } = await supabaseClient
        .from('keyword_results')
        .insert(resultsWithResearchId);

      if (resultsError) {
        console.error('Error storing keyword results:', resultsError);
        throw new Error('Failed to store keyword results');
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          research_id: research.id,
          results: relatedKeywords,
          total_results: totalResults,
          estimated_cost: estimatedCost.toFixed(4)
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results: relatedKeywords,
        total_results: totalResults,
        estimated_cost: estimatedCost.toFixed(4)
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in related keywords function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

function convertCompetitionToDifficulty(competition_level: string, competition_index: number): number {
  // Use competition_index if available (0-100 scale)
  if (competition_index !== null && competition_index !== undefined) {
    return Math.round(competition_index)
  }
  
  // Fallback to competition_level string conversion
  switch (competition_level?.toUpperCase()) {
    case 'HIGH':
      return 80
    case 'MEDIUM':
      return 50
    case 'LOW':
      return 20
    default:
      return 0
  }
}

function determineIntent(keyword: string): string {
  const lowerKeyword = keyword.toLowerCase()
  
  // Transactional intent keywords
  if (lowerKeyword.includes('buy') || lowerKeyword.includes('purchase') || 
      lowerKeyword.includes('order') || lowerKeyword.includes('shop') ||
      lowerKeyword.includes('price') || lowerKeyword.includes('cost') ||
      lowerKeyword.includes('cheap') || lowerKeyword.includes('discount') ||
      lowerKeyword.includes('deal') || lowerKeyword.includes('sale')) {
    return 'transactional'
  }
  
  // Commercial intent keywords
  if (lowerKeyword.includes('best') || lowerKeyword.includes('top') ||
      lowerKeyword.includes('review') || lowerKeyword.includes('compare') ||
      lowerKeyword.includes('vs') || lowerKeyword.includes('alternative')) {
    return 'commercial'
  }
  
  // Navigational intent keywords
  if (lowerKeyword.includes('login') || lowerKeyword.includes('website') ||
      lowerKeyword.includes('official') || lowerKeyword.includes('homepage')) {
    return 'navigational'
  }
  
  // Default to informational
  return 'informational'
}