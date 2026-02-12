import { Router, Request, Response } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/applications — list all with filtering
router.get('/', (req: Request, res: Response) => {
  try {
    let query = `
      SELECT a.*, GROUP_CONCAT(t.name) as tag_names
      FROM applications a
      LEFT JOIN application_tags at2 ON a.id = at2.application_id
      LEFT JOIN tags t ON at2.tag_id = t.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (req.query.status) {
      conditions.push('a.status = ?');
      params.push(req.query.status);
    }
    if (req.query.priority) {
      conditions.push('a.priority = ?');
      params.push(req.query.priority);
    }
    if (req.query.work_mode) {
      conditions.push('a.work_mode = ?');
      params.push(req.query.work_mode);
    }
    if (req.query.search) {
      conditions.push('(a.company_name LIKE ? OR a.job_title LIKE ? OR a.notes LIKE ? OR t.name LIKE ?)');
      const searchTerm = `%${req.query.search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    if (req.query.tag) {
      conditions.push('t.name = ?');
      params.push(req.query.tag);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY a.id';

    const sort = req.query.sort as string;
    if (sort) {
      const [field, dir] = sort.split(':');
      const allowedFields = ['company_name', 'job_title', 'date_applied', 'date_added', 'salary_min', 'priority', 'status'];
      if (allowedFields.includes(field)) {
        query += ` ORDER BY a.${field} ${dir === 'desc' ? 'DESC' : 'ASC'}`;
      }
    } else {
      query += ' ORDER BY a.date_added DESC';
    }

    const applications = db.prepare(query).all(...params);
    res.json(applications);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/calendar-events — get all applications with their status history for calendar
// NOTE: This MUST be defined before /:id to avoid Express matching "calendar-events" as an id
router.get('/calendar-events', (_req: Request, res: Response) => {
  try {
    const applications = db.prepare(`
      SELECT a.*, GROUP_CONCAT(t.name) as tag_names
      FROM applications a
      LEFT JOIN application_tags at2 ON a.id = at2.application_id
      LEFT JOIN tags t ON at2.tag_id = t.id
      GROUP BY a.id
      ORDER BY a.date_added DESC
    `).all() as any[];

    const historyStmt = db.prepare(
      'SELECT * FROM status_history WHERE application_id = ? ORDER BY changed_at ASC'
    );

    const result = applications.map(app => ({
      ...app,
      status_history: historyStmt.all(app.id),
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/applications/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });

    const tags = db.prepare(`
      SELECT t.* FROM tags t
      JOIN application_tags at2 ON t.id = at2.tag_id
      WHERE at2.application_id = ?
    `).all(req.params.id);

    const statusHistory = db.prepare(`
      SELECT * FROM status_history WHERE application_id = ? ORDER BY changed_at ASC
    `).all(req.params.id);

    res.json({ ...(app as any), tags, status_history: statusHistory });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/applications
router.post('/', (req: Request, res: Response) => {
  try {
    const { tags: tagNames, ...data } = req.body;
    const fields = Object.keys(data).filter(k => data[k] !== undefined);
    const placeholders = fields.map(() => '?').join(', ');
    const values = fields.map(k => data[k]);

    const result = db.prepare(
      `INSERT INTO applications (${fields.join(', ')}) VALUES (${placeholders})`
    ).run(...values);

    const appId = result.lastInsertRowid;

    // Log initial status
    db.prepare(
      'INSERT INTO status_history (application_id, from_status, to_status, notes) VALUES (?, NULL, ?, ?)'
    ).run(appId, data.status || 'saved', 'Application created');

    // Handle tags
    if (tagNames && Array.isArray(tagNames)) {
      for (const tagName of tagNames) {
        db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(tagName);
        const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as { id: number };
        db.prepare('INSERT OR IGNORE INTO application_tags (application_id, tag_id) VALUES (?, ?)').run(appId, tag.id);
      }
    }

    const newApp = db.prepare('SELECT * FROM applications WHERE id = ?').get(appId);
    res.status(201).json(newApp);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/applications/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Application not found' });

    const { tags: tagNames, ...data } = req.body;
    const fields = Object.keys(data).filter(k => data[k] !== undefined);
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(k => data[k]);

    if (fields.length > 0) {
      db.prepare(`UPDATE applications SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
    }

    // Handle tags
    if (tagNames && Array.isArray(tagNames)) {
      db.prepare('DELETE FROM application_tags WHERE application_id = ?').run(req.params.id);
      for (const tagName of tagNames) {
        db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(tagName);
        const tag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as { id: number };
        db.prepare('INSERT OR IGNORE INTO application_tags (application_id, tag_id) VALUES (?, ?)').run(req.params.id, tag.id);
      }
    }

    // If status changed, log it
    if (data.status && data.status !== (existing as any).status) {
      db.prepare(
        'INSERT INTO status_history (application_id, from_status, to_status) VALUES (?, ?, ?)'
      ).run(req.params.id, (existing as any).status, data.status);
    }

    const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/applications/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const result = db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Application not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/applications/:id/status
router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: 'Application not found' });

    const { status, notes } = req.body;
    const fromStatus = existing.status;

    db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, req.params.id);
    db.prepare(
      'INSERT INTO status_history (application_id, from_status, to_status, notes) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, fromStatus, status, notes || null);

    // Set date_applied if moving to 'applied' status
    if (status === 'applied' && !existing.date_applied) {
      db.prepare('UPDATE applications SET date_applied = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    }

    const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk delete
router.post('/bulk-delete', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM applications WHERE id IN (${placeholders})`).run(...ids);
    res.json({ success: true, deleted: ids.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk status update
router.post('/bulk-status', (req: Request, res: Response) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be an array' });

    const updateStmt = db.prepare('UPDATE applications SET status = ? WHERE id = ?');
    const historyStmt = db.prepare('INSERT INTO status_history (application_id, from_status, to_status) VALUES (?, ?, ?)');
    const getStmt = db.prepare('SELECT status FROM applications WHERE id = ?');

    const transaction = db.transaction(() => {
      for (const id of ids) {
        const current = getStmt.get(id) as { status: string } | undefined;
        if (current) {
          updateStmt.run(status, id);
          historyStmt.run(id, current.status, status);
        }
      }
    });

    transaction();
    res.json({ success: true, updated: ids.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
