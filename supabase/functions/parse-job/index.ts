import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SYSTEM_PROMPT = `You are a job posting parser. Extract structured data from the following job posting text. Return ONLY valid JSON with these fields (use null for anything not found):
{
  "company_name": "",
  "job_title": "",
  "salary_min": null,
  "salary_max": null,
  "salary_currency": "EUR",
  "compensation_type": "annual",
  "location_city": "",
  "location_country": "",
  "work_mode": "remote|hybrid|on-site",
  "requirements": ["skill1", "skill2"],
  "description_summary": "2-3 sentence summary",
  "seniority_level": "",
  "company_size": "startup|mid|enterprise",
  "company_website": ""
}`

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { type, content } = await req.json()

    if (!type || !content) {
      return new Response(JSON.stringify({ error: 'Missing type or content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Get the user's API key from their settings
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create a client with the user's JWT to get their settings
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Get the user from the JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Get the user's Anthropic API key
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('anthropic_api_key')
      .eq('user_id', user.id)
      .single()

    if (settingsError || !settings?.anthropic_api_key) {
      return new Response(JSON.stringify({ error: 'Please set your Anthropic API key in Settings' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const apiKey = settings.anthropic_api_key
    let textContent = content

    // If URL, fetch and extract text
    if (type === 'url') {
      try {
        const response = await fetch(content, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        })

        if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status}`)

        const html = await response.text()

        // Simple HTML to text extraction (no cheerio in Deno)
        textContent = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[\s\S]*?<\/nav>/gi, '')
          .replace(/<footer[\s\S]*?<\/footer>/gi, '')
          .replace(/<header[\s\S]*?<\/header>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 8000)

        // Extract title from HTML
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
        const title = titleMatch ? titleMatch[1] : ''

        textContent = `Page Title: ${title}\n\nPage Content:\n${textContent}`
      } catch (fetchErr: any) {
        return new Response(JSON.stringify({ error: `Failed to fetch URL: ${fetchErr.message}` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }
    }

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: textContent.slice(0, 8000) }],
      }),
    })

    if (!claudeResponse.ok) {
      const errBody = await claudeResponse.text()
      return new Response(JSON.stringify({ error: `Claude API error: ${claudeResponse.status} - ${errBody}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const claudeData = await claudeResponse.json()
    const responseText = claudeData.content?.[0]?.text || ''

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'No JSON found in AI response' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const parsed = JSON.parse(jsonMatch[0])

    const result = {
      parsed,
      raw_text: textContent.slice(0, 8000),
      source_url: type === 'url' ? content : undefined,
      fields_extracted: Object.entries(parsed).filter(([_, v]) => v !== null && v !== '').length,
      total_fields: Object.keys(parsed).length,
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
