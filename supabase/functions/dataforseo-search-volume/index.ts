import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { 
      keywords, 
      location_name, 
      language_name,
      use_clickstream = true
    } = body

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(JSON.stringify({ error: 'keywords array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (keywords.length > 1000) {
      return new Response(JSON.stringify({ error: 'Maximum 1000 keywords allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('DataForSEO search volume request:', { keywords: keywords.length, use_clickstream })

    const login = Deno.env.get('DATAFORSEO_LOGIN')
    const password = Deno.env.get('DATAFORSEO_PASSWORD')
    const authString = btoa(`${login}:${password}`)

    const payload = [{
      keywords,
      location_name: location_name || 'United Kingdom',
      language_name: language_name || 'English',
      use_clickstream
    }]

    const response = await fetch('https://api.dataforseo.com/v3/keywords_data/clickstream_data/dataforseo_search_volume/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DataForSEO API error:', errorText)
      throw new Error(`DataForSEO API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('DataForSEO response tasks:', data.tasks?.length)

    if (!data.tasks || data.tasks.length === 0) {
      throw new Error('No tasks returned from DataForSEO')
    }

    const task = data.tasks[0]
    if (task.status_code !== 20000) {
      throw new Error(task.status_message || 'DataForSEO task failed')
    }

    const results = task.result || []
    const cost = data.cost || 0

    await supabaseClient.from('dataforseo_usage').insert({
      user_id: user.id,
      module: 'clickstream_data',
      endpoint: 'dataforseo_search_volume',
      cost_usd: cost,
      response_status: task.status_code,
      request_payload: payload,
    })

    return new Response(
      JSON.stringify({
        success: true,
        results,
        cost,
        total: results.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})