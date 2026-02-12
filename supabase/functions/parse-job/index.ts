import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SYSTEM_PROMPT = `You are a job posting parser. Extract structured data from the following job posting text. Return ONLY valid JSON with these fields (use null for anything not found):

{
  "company_name": "string",
  "job_title": "string",
  "salary_min": number_or_null,
  "salary_max": number_or_null,
  "salary_currency": "EUR",
  "salary_not_specified": true_if_no_salary_info_found,
  "compensation_type": "annual|hourly|contract",
  "location_city": "string",
  "location_country": "string",
  "work_mode": "remote|hybrid|on-site",
  "requirements": ["React", "TypeScript", "Node.js", "AWS"],
  "description_summary": "2-3 sentence summary focusing on key responsibilities and what makes this role unique",
  "seniority_level": "junior|mid|senior|lead|principal|staff",
  "company_size": "startup|mid|enterprise",
  "company_website": "https://company.com",
  "source": "linkedin|indeed|company_site|referral|job_board|other"
}

IMPORTANT RULES:
- requirements MUST be short skill keywords (1-3 words max), NOT full sentences. Examples: "React", "TypeScript", "AWS", "Docker", "GraphQL", "CI/CD", "Agile", "PostgreSQL". Extract 5-15 relevant technical skills.
- salary_not_specified: set to true if the posting does NOT mention any salary, compensation, or pay range
- company_website: infer from the company name or any URLs in the text. Use the main company domain, not the job board URL.
- source: detect from the URL or text. "linkedin" if from linkedin.com, "indeed" if from indeed.com, etc.
- For salary, convert to annual if given as monthly/hourly. Use the local currency if specified.
- Return ONLY the JSON object, no markdown, no explanation.`

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

// Detect source from URL
function detectSource(url: string): string | null {
  if (!url) return null
  const lower = url.toLowerCase()
  if (lower.includes('linkedin.com')) return 'linkedin'
  if (lower.includes('indeed.com')) return 'indeed'
  if (lower.includes('glassdoor.com')) return 'job_board'
  if (lower.includes('wellfound.com') || lower.includes('angel.co')) return 'job_board'
  if (lower.includes('stackoverflow.com') || lower.includes('stackoverflow.jobs')) return 'job_board'
  if (lower.includes('remoteok.com') || lower.includes('weworkremotely.com')) return 'job_board'
  if (lower.includes('monster.com') || lower.includes('ziprecruiter.com')) return 'job_board'
  if (lower.includes('hired.com') || lower.includes('triplebyte.com')) return 'job_board'
  if (lower.includes('lever.co') || lower.includes('greenhouse.io') || lower.includes('workday.com') || lower.includes('ashbyhq.com') || lower.includes('jobs.') || lower.includes('careers.')) return 'company_site'
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { type, content, cv_text } = await req.json()

    if (!type || !content) {
      return jsonResponse({ error: 'Missing type or content' }, 400)
    }

    // Get the user's API key from their settings
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Not authenticated' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userError || !user) {
      return jsonResponse({ error: 'Invalid auth token' }, 401)
    }

    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('anthropic_api_key')
      .eq('user_id', user.id)
      .single()

    if (settingsError || !settings?.anthropic_api_key) {
      return jsonResponse({ error: 'Please set your Anthropic API key in Settings' }, 400)
    }

    const apiKey = settings.anthropic_api_key
    let textContent = content
    let sourceUrl = type === 'url' ? content : undefined

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

        // HTML to text extraction
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
          .slice(0, 10000)

        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i)
        const title = titleMatch ? titleMatch[1] : ''

        textContent = `Source URL: ${content}\nPage Title: ${title}\n\nPage Content:\n${textContent}`
      } catch (fetchErr: any) {
        return jsonResponse({ error: `Failed to fetch URL: ${fetchErr.message}` }, 400)
      }
    }

    // Build the user message
    let userMessage = textContent.slice(0, 10000)

    // Include CV text if available for match score
    if (cv_text) {
      userMessage += `\n\n--- CANDIDATE CV (for context, not part of the job posting) ---\n${cv_text.slice(0, 3000)}`
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
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!claudeResponse.ok) {
      const errBody = await claudeResponse.text()
      return jsonResponse({ error: `Claude API error: ${claudeResponse.status} - ${errBody}` }, 500)
    }

    const claudeData = await claudeResponse.json()
    const responseText = claudeData.content?.[0]?.text || ''

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return jsonResponse({ error: 'No JSON found in AI response' }, 500)
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Override source detection from URL if AI didn't catch it
    if (!parsed.source && sourceUrl) {
      parsed.source = detectSource(sourceUrl)
    }

    const result = {
      parsed,
      raw_text: textContent.slice(0, 10000),
      source_url: sourceUrl,
      fields_extracted: Object.entries(parsed).filter(([_, v]) => v !== null && v !== '' && v !== false).length,
      total_fields: Object.keys(parsed).length,
    }

    return jsonResponse(result)
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500)
  }
})
