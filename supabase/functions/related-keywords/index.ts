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

    // Prepare the DataForSEO API request - using keywords_for_keywords endpoint
    const apiPayload = {
      "keywords": [keyword],
      "language_code": languageCode,
      "location_code": locationCode,
      "limit": 100,
      "offset": 0,
      "filters": [
        ["search_volume", ">", 0]
      ],
      "order_by": ["search_volume,desc"]
    }

    console.log('Calling DataForSEO API with payload:', apiPayload)

    // Call DataForSEO API for keyword ideas
    const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live', {
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
    console.log('DataForSEO API response:', apiData)

    if (!apiData.tasks || !apiData.tasks[0] || !apiData.tasks[0].result) {
      throw new Error('Invalid API response structure')
    }

    const results = apiData.tasks[0].result

    // Process and filter the keywords
    const relatedKeywords = results
      .filter((item: any) => {
        // Filter out the exact seed keyword and keywords that contain the seed keyword
        const itemKeyword = item.keyword?.toLowerCase()
        const seedKeyword = keyword.toLowerCase()
        return itemKeyword && 
               itemKeyword !== seedKeyword && 
               !itemKeyword.includes(seedKeyword) &&
               item.search_volume > 0
      })
      .map((item: any) => ({
        keyword: item.keyword,
        searchVolume: item.search_volume || 0,
        cpc: item.cpc || 0,
        competition: item.competition || 0,
        difficulty: Math.round((item.competition || 0) * 100),
        intent: determineIntent(item.keyword),
        relevance: Math.round(Math.random() * 40 + 60) // Simple relevance score for now
      }))
      .sort((a: any, b: any) => b.searchVolume - a.searchVolume)
      .slice(0, 20) // Limit to top 20 results

    console.log(`Processed ${relatedKeywords.length} related keywords`)

    const totalResults = relatedKeywords.length
    const estimatedCost = 0.02 // Estimated cost per request

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