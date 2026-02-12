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

const COVER_LETTER_PROMPT = `You are an expert cover letter writer. Write a professional, compelling cover letter for the candidate based on their CV and the job posting.

Guidelines:
- Be professional but personable — avoid generic filler
- Highlight specific experiences from the CV that match job requirements
- Show enthusiasm for the specific role and company
- Keep it concise: 3-4 paragraphs, under 400 words
- Don't repeat the CV verbatim — synthesize and highlight
- Address specific requirements mentioned in the job posting
- End with a clear call to action

Return ONLY valid JSON:
{
  "cover_letter": "The full cover letter text with proper paragraphs",
  "key_points": ["key point 1 highlighted", "key point 2", ...],
  "tone": "professional|enthusiastic|formal|conversational"
}`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { application_id, instructions } = await req.json()

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

    // Build job info
    const jobInfo = [
      application.job_title ? `Job Title: ${application.job_title}` : '',
      application.company_name ? `Company: ${application.company_name}` : '',
      application.location_city ? `Location: ${application.location_city}${application.location_country ? ', ' + application.location_country : ''}` : '',
      application.work_mode ? `Work Mode: ${application.work_mode}` : '',
      application.job_description_raw ? `\nJob Description:\n${application.job_description_raw}` : '',
      application.notes ? `\nNotes/Summary:\n${application.notes}` : '',
      application.cover_letter_notes ? `\nCover Letter Notes:\n${application.cover_letter_notes}` : '',
    ].filter(Boolean).join('\n')

    let userMessage = `--- CANDIDATE CV ---\n${masterCV.extracted_text.slice(0, 4000)}\n\n--- JOB POSTING ---\n${jobInfo.slice(0, 4000)}`

    if (instructions) {
      userMessage += `\n\n--- ADDITIONAL INSTRUCTIONS ---\n${instructions}`
    }

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
        max_tokens: 2000,
        system: COVER_LETTER_PROMPT,
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

    const result = JSON.parse(jsonMatch[0])

    // Save the cover letter
    const { data: savedCL, error: saveError } = await supabase
      .from('cover_letters')
      .insert({
        user_id: user.id,
        application_id,
        generated_text: result.cover_letter,
        instructions: instructions || null,
        version: 1,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save cover letter:', saveError)
    }

    return jsonResponse({
      ...result,
      id: savedCL?.id,
    })
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500)
  }
})
