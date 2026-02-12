import { Router, Request, Response } from 'express';
import db from '../db/database.js';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/export/csv
router.get('/csv', (_req: Request, res: Response) => {
  try {
    const applications = db.prepare(`
      SELECT a.*, GROUP_CONCAT(t.name) as tags
      FROM applications a
      LEFT JOIN application_tags at2 ON a.id = at2.application_id
      LEFT JOIN tags t ON at2.tag_id = t.id
      GROUP BY a.id
    `).all() as any[];

    if (applications.length === 0) {
      return res.status(404).json({ error: 'No applications to export' });
    }

    const headers = Object.keys(applications[0]);
    const csvRows = [headers.join(',')];

    for (const app of applications) {
      const values = headers.map(h => {
        const val = app[h];
        if (val === null || val === undefined) return '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
      });
      csvRows.push(values.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=applications.csv');
    res.send(csvRows.join('\n'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/json
router.get('/json', (_req: Request, res: Response) => {
  try {
    const applications = db.prepare(`
      SELECT a.*, GROUP_CONCAT(t.name) as tags
      FROM applications a
      LEFT JOIN application_tags at2 ON a.id = at2.application_id
      LEFT JOIN tags t ON at2.tag_id = t.id
      GROUP BY a.id
    `).all();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=applications.json');
    res.json(applications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/import/csv
router.post('/csv', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const content = req.file.buffer.toString('utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    if (lines.length < 2) return res.status(400).json({ error: 'CSV file is empty or has no data rows' });

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const allowedFields = [
      'company_name', 'company_website', 'company_size', 'job_title', 'job_url',
      'job_description_raw', 'salary_min', 'salary_max', 'salary_currency',
      'compensation_type', 'location_city', 'location_country', 'work_mode',
      'status', 'date_applied', 'match_score', 'source', 'contact_name',
      'contact_email', 'contact_role', 'notes', 'priority', 'follow_up_date',
      'resume_version', 'cover_letter_notes', 'tags'
    ];

    let imported = 0;

    for (let i = 1; i < lines.length; i++) {
      // Simple CSV parsing (handles basic quoted fields)
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of lines[i]) {
        if (char === '"') { inQuotes = !inQuotes; continue; }
        if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
        current += char;
      }
      values.push(current.trim());

      const row: any = {};
      const tagNames: string[] = [];

      headers.forEach((h, idx) => {
        if (h === 'tags' && values[idx]) {
          tagNames.push(...values[idx].split(',').map(t => t.trim()).filter(Boolean));
        } else if (allowedFields.includes(h) && values[idx]) {
          row[h] = values[idx];
        }
      });

      if (!row.company_name || !row.job_title) continue;

      const fields = Object.keys(row);
      const placeholders = fields.map(() => '?').join(', ');
      const vals = fields.map(k => row[k]);

      const result = db.prepare(
        `INSERT INTO applications (${fields.join(', ')}) VALUES (${placeholders})`
      ).run(...vals);

      const appId = result.lastInsertRowid;

      for (const tagName of tagNames) {
        db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(tagName);
        const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as { id: number };
        db.prepare('INSERT OR IGNORE INTO application_tags (application_id, tag_id) VALUES (?, ?)').run(appId, tag.id);
      }

      imported++;
    }

    res.json({ success: true, imported });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
