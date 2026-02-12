import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import * as cheerio from 'cheerio';

const router = Router();

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
  "company_size": "startup|mid|enterprise"
}`;

async function parseWithClaude(text: string): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-api-key-here') {
    throw new Error('ANTHROPIC_API_KEY not configured. Set it in Settings.');
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  // Extract JSON from the response
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');

  return JSON.parse(jsonMatch[0]);
}

// POST /api/parse/url
router.post('/url', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts and styles
    $('script, style, nav, footer, header').remove();

    // Extract text content
    const textContent = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);

    // Try to extract some basic info from meta tags
    const title = $('title').text() || $('meta[property="og:title"]').attr('content') || '';
    const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';

    const fullText = `Page Title: ${title}\nMeta Description: ${description}\n\nPage Content:\n${textContent}`;

    const parsed = await parseWithClaude(fullText);

    res.json({
      parsed,
      raw_text: textContent,
      source_url: url,
      fields_extracted: Object.entries(parsed).filter(([_, v]) => v !== null && v !== '').length,
      total_fields: Object.keys(parsed).length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/parse/text
router.post('/text', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    const parsed = await parseWithClaude(text.slice(0, 8000));

    res.json({
      parsed,
      raw_text: text,
      fields_extracted: Object.entries(parsed).filter(([_, v]) => v !== null && v !== '').length,
      total_fields: Object.keys(parsed).length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
