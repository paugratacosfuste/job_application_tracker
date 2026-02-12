import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

const ANALYSIS_PROMPT = `You are an expert career advisor and resume analyst. Analyze the compatibility between the candidate's CV/resume and the job posting.

Return ONLY valid JSON with this structure:
{
  "match_score": <1-5 integer>,
  "summary": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2", ...],
  "gaps": ["gap 1", "gap 2", ...],
  "suggestions": ["actionable suggestion 1", "suggestion 2", ...],
  "keyword_matches": ["matched keyword 1", "matched keyword 2", ...],
  "missing_keywords": ["missing keyword 1", "missing keyword 2", ...]
}

Scoring guide:
- 5: Excellent match — meets nearly all requirements, strong relevant experience
- 4: Good match — meets most requirements, some relevant experience
- 3: Moderate match — meets some requirements, transferable skills
- 2: Weak match — meets few requirements, significant gaps
- 1: Poor match — minimal relevant experience

Be specific and actionable in your analysis. Reference specific skills, experiences, and requirements.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { application_id } = await req.json()

    if (!application_id) {
      return jsonResponse({ error: 'Missing application_id' }, 400)
    }

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

    // Get user's API key
    const { data: settings } = await supabase
      .from('user_settings')
      .select('anthropic_api_key')
      .eq('user_id', user.id)
      .single()

    if (!settings?.anthropic_api_key) {
      return jsonResponse({ error: 'Please set your Anthropic API key in Settings' }, 400)
    }

    // Get the application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', application_id)
      .eq('user_id', user.id)
      .single()

    if (appError || !application) {
      return jsonResponse({ error: 'Application not found' }, 404)
    }

    // Get the user's active Master CV
    const { data: masterCV } = await supabase
      .from('master_cvs')
      .select('extracted_text')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!masterCV?.extracted_text) {
      return jsonResponse({ error: 'Please upload your Master CV and add text content in Settings first' }, 400)
    }

    // Build the job description from available data
    const jobInfo = [
      application.job_title ? `Job Title: ${application.job_title}` : '',
      application.company_name ? `Company: ${application.company_name}` : '',
      application.location_city ? `Location: ${application.location_city}${application.location_country ? ', ' + application.location_country : ''}` : '',
      application.work_mode ? `Work Mode: ${application.work_mode}` : '',
      application.job_description_raw ? `\nJob Description:\n${application.job_description_raw}` : '',
      application.notes ? `\nNotes:\n${application.notes}` : '',
    ].filter(Boolean).join('\n')

    if (!jobInfo.trim()) {
      return jsonResponse({ error: 'Application has no job description or details to analyze' }, 400)
    }

    const userMessage = `--- CANDIDATE CV ---\n${masterCV.extracted_text.slice(0, 4000)}\n\n--- JOB POSTING ---\n${jobInfo.slice(0, 4000)}`

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.anthropic_api_key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1500,
        system: ANALYSIS_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!claudeResponse.ok) {
      const errBody = await claudeResponse.text()
      return jsonResponse({ error: `Claude API error: ${claudeResponse.status} - ${errBody}` }, 500)
    }

    const claudeData = await claudeResponse.json()
    const responseText = claudeData.content?.[0]?.text || ''

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return jsonResponse({ error: 'No JSON found in AI response' }, 500)
    }

    const analysis = JSON.parse(jsonMatch[0])

    // Save the analysis to the application
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        match_score: analysis.match_score,
        match_analysis: analysis,
      })
      .eq('id', application_id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to save analysis:', updateError)
    }

    return jsonResponse(analysis)
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500)
  }
})
