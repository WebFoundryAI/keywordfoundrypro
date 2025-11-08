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
    const { target, target_type = 'site', location_name, language_name, include_serp_info = false, include_clickstream_data = false, limit = 100 } = body

    if (!target) {
      return new Response(JSON.stringify({ error: 'target is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Keywords for site request:', { target, target_type, location_name, language_name })

    // DataForSEO API credentials
    const login = Deno.env.get('DATAFORSEO_LOGIN')
    const password = Deno.env.get('DATAFORSEO_PASSWORD')
    const authString = btoa(`${login}:${password}`)

    const payload = [{
      target,
      target_type,
      location_name: location_name || 'United Kingdom',
      language_name: language_name || 'English',
      include_serp_info,
      include_clickstream_data,
      limit
    }]

    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/keywords_for_site/live', {
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

    const results = task.result?.[0]?.items || []
    const cost = data.cost || 0

    // Log usage
    await supabaseClient.from('dataforseo_usage').insert({
      user_id: user.id,
      module: 'dataforseo_labs',
      endpoint: 'keywords_for_site',
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