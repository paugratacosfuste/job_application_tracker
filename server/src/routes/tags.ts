import { Router, Request, Response } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/tags
router.get('/', (_req: Request, res: Response) => {
  try {
    const tags = db.prepare(`
      SELECT t.*, COUNT(at2.application_id) as usage_count
      FROM tags t
      LEFT JOIN application_tags at2 ON t.id = at2.tag_id
      GROUP BY t.id
      ORDER BY t.name ASC
    `).all();
    res.json(tags);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tags
router.post('/', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Tag name is required' });
    db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(name);
    const tag = db.prepare('SELECT * FROM tags WHERE name = ?').get(name);
    res.status(201).json(tag);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tags/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    db.prepare('DELETE FROM application_tags WHERE tag_id = ?').run(req.params.id);
    db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tags/:id
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    db.prepare('UPDATE tags SET name = ? WHERE id = ?').run(name, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tags/merge
router.post('/merge', (req: Request, res: Response) => {
  try {
    const { sourceId, targetId } = req.body;
    // Move all applications from source tag to target tag
    const apps = db.prepare('SELECT application_id FROM application_tags WHERE tag_id = ?').all(sourceId) as { application_id: number }[];
    for (const app of apps) {
      db.prepare('INSERT OR IGNORE INTO application_tags (application_id, tag_id) VALUES (?, ?)').run(app.application_id, targetId);
    }
    db.prepare('DELETE FROM application_tags WHERE tag_id = ?').run(sourceId);
    db.prepare('DELETE FROM tags WHERE id = ?').run(sourceId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
