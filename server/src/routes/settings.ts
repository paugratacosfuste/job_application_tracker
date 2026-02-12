import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
const envPath = path.join(__dirname, '..', '..', '.env');

// GET /api/settings/api-key-status
router.get('/api-key-status', (_req: Request, res: Response) => {
  const key = process.env.ANTHROPIC_API_KEY;
  res.json({
    configured: !!key && key !== 'your-api-key-here',
    masked: key && key !== 'your-api-key-here' ? key.slice(0, 10) + '...' + key.slice(-4) : null,
  });
});

// POST /api/settings/api-key
router.post('/api-key', (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'API key is required' });

    // Read current .env
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    // Update or add ANTHROPIC_API_KEY
    if (envContent.includes('ANTHROPIC_API_KEY=')) {
      envContent = envContent.replace(/ANTHROPIC_API_KEY=.*/, `ANTHROPIC_API_KEY=${apiKey}`);
    } else {
      envContent += `\nANTHROPIC_API_KEY=${apiKey}`;
    }

    fs.writeFileSync(envPath, envContent);
    process.env.ANTHROPIC_API_KEY = apiKey;

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/clear-data
router.post('/clear-data', (_req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM application_tags').run();
    db.prepare('DELETE FROM status_history').run();
    db.prepare('DELETE FROM applications').run();
    db.prepare('DELETE FROM tags').run();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
