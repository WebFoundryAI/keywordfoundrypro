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

    console.log('Google Ads status request')

    const login = Deno.env.get('DATAFORSEO_LOGIN')
    const password = Deno.env.get('DATAFORSEO_PASSWORD')
    const authString = btoa(`${login}:${password}`)

    const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/status', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
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

    const status = task.result?.[0] || {}

    return new Response(
      JSON.stringify({
        success: true,
        status,
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