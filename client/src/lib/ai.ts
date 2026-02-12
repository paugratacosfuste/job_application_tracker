import { supabase } from './supabase'

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

async function getApiKey(): Promise<string> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('anthropic_api_key')
    .single()
  if (error || !data?.anthropic_api_key) {
    throw new Error('This feature requires an Anthropic API key. You can add one in Settings → API Key. Get a key at console.anthropic.com')
  }
  return data.anthropic_api_key
}

async function callClaude(apiKey: string, system: string, userMessage: string, maxTokens = 1500): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${errBody}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ''
}

async function callClaudeWithDocument(apiKey: string, system: string, userMessage: string, pdfBase64: string, maxTokens = 2000): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens,
      system,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: userMessage,
          },
        ],
      }],
    }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${errBody}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ''
}

function extractJson(text: string): any {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON found in AI response')
  return JSON.parse(match[0])
}

// ========== Parse Job ==========

const PARSE_PROMPT = `You are a job posting parser. Extract structured data from the following job posting text. Return ONLY valid JSON with these fields (use null for anything not found):

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
  if (lower.includes('lever.co') || lower.includes('greenhouse.io') || lower.includes('workday.com') || lower.includes('ashbyhq.com') || lower.includes('jobs.') || lower.includes('careers.')) return 'company_site'
  return null
}

export async function parseJob(type: 'url' | 'text', content: string, cvText?: string) {
  const apiKey = await getApiKey()
  let textContent = content
  let sourceUrl = type === 'url' ? content : undefined

  if (type === 'url') {
    // Try fetching through a CORS proxy or directly
    try {
      // Use the Edge Function just for URL fetching since we can't fetch cross-origin from browser
      const { data, error } = await supabase.functions.invoke('parse-job', {
        body: { type: 'url', content, cv_text: cvText || undefined },
      })
      // If edge function works, use it
      if (!error && data && !data.error) return data
      // If edge function returned an error in data, throw it
      if (data?.error) throw new Error(data.error)
      // Otherwise fall through to try text-based approach
      throw new Error(error?.message || 'Edge function failed')
    } catch (edgeErr: any) {
      // If the error is about API key or auth, throw it directly
      if (edgeErr.message.includes('API key') || edgeErr.message.includes('auth')) {
        throw edgeErr
      }
      // For URL parsing, we need the edge function for fetching - re-throw
      throw new Error(`Failed to parse URL: ${edgeErr.message}. Try pasting the job description text instead.`)
    }
  }

  // For text parsing, do it client-side
  let userMessage = textContent.slice(0, 10000)
  if (cvText) {
    userMessage += `\n\n--- CANDIDATE CV (for context, not part of the job posting) ---\n${cvText.slice(0, 3000)}`
  }

  const responseText = await callClaude(apiKey, PARSE_PROMPT, userMessage, 1024)
  const parsed = extractJson(responseText)

  if (!parsed.source && sourceUrl) {
    parsed.source = detectSource(sourceUrl)
  }

  return {
    parsed,
    raw_text: textContent.slice(0, 10000),
    source_url: sourceUrl,
    fields_extracted: Object.entries(parsed).filter(([_, v]) => v !== null && v !== '' && v !== false).length,
    total_fields: Object.keys(parsed).length,
  }
}

// ========== Analyze Match ==========

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

export async function analyzeMatch(applicationId: string) {
  const apiKey = await getApiKey()
  const userId = await getCurrentUserId()

  // Get the application
  const { data: application, error: appError } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (appError || !application) {
    throw new Error('Application not found')
  }

  // Get the user's active Master CV
  const { data: masterCV } = await supabase
    .from('master_cvs')
    .select('extracted_text')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (!masterCV?.extracted_text) {
    throw new Error('Please upload your Master CV and add text content in Settings first')
  }

  // Build the job description
  const jobInfo = [
    application.job_title ? `Job Title: ${application.job_title}` : '',
    application.company_name ? `Company: ${application.company_name}` : '',
    application.location_city ? `Location: ${application.location_city}${application.location_country ? ', ' + application.location_country : ''}` : '',
    application.work_mode ? `Work Mode: ${application.work_mode}` : '',
    application.job_description_raw ? `\nJob Description:\n${application.job_description_raw}` : '',
    application.notes ? `\nNotes:\n${application.notes}` : '',
  ].filter(Boolean).join('\n')

  if (!jobInfo.trim()) {
    throw new Error('Application has no job description or details to analyze')
  }

  const userMessage = `--- CANDIDATE CV ---\n${masterCV.extracted_text.slice(0, 4000)}\n\n--- JOB POSTING ---\n${jobInfo.slice(0, 4000)}`

  const responseText = await callClaude(apiKey, ANALYSIS_PROMPT, userMessage, 1500)
  const analysis = extractJson(responseText)

  // Save the analysis to the application
  await supabase
    .from('applications')
    .update({
      match_score: analysis.match_score,
      match_analysis: analysis,
    })
    .eq('id', applicationId)

  return analysis
}

// ========== Generate Cover Letter ==========

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

export async function generateCoverLetter(applicationId: string, instructions?: string) {
  const apiKey = await getApiKey()
  const userId = await getCurrentUserId()

  // Get the application
  const { data: application, error: appError } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (appError || !application) {
    throw new Error('Application not found')
  }

  // Get the user's active Master CV
  const { data: masterCV } = await supabase
    .from('master_cvs')
    .select('extracted_text')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (!masterCV?.extracted_text) {
    throw new Error('Please upload your Master CV and add text content in Settings first')
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

  const responseText = await callClaude(apiKey, COVER_LETTER_PROMPT, userMessage, 2000)
  const result = extractJson(responseText)

  // Save the cover letter
  const { data: savedCL, error: saveError } = await supabase
    .from('cover_letters')
    .insert({
      user_id: userId,
      application_id: applicationId,
      generated_text: result.cover_letter,
      instructions: instructions || null,
      label: `AI Generated - ${new Date().toLocaleDateString()}`,
    })
    .select()
    .single()

  if (saveError) {
    console.error('Failed to save cover letter:', saveError)
  }

  return {
    ...result,
    id: savedCL?.id,
  }
}

// ========== Extract CV Text from PDF ==========

export async function extractCVText(pdfFile: File): Promise<string> {
  const apiKey = await getApiKey()

  // Read file as base64
  const arrayBuffer = await pdfFile.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }
  const base64 = btoa(binary)

  const extractPrompt = 'Extract ALL text content from this PDF document. Return ONLY the plain text content, preserving the structure (headings, bullet points, sections). Do not add any commentary or formatting instructions.'

  const responseText = await callClaudeWithDocument(
    apiKey,
    'You are a document text extractor. Extract all text from the provided document accurately.',
    extractPrompt,
    base64,
    4000
  )

  return responseText.trim()
}
