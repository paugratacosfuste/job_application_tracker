import { Router, Request, Response } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/stats
router.get('/', (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    let dateFilter = '';
    const params: string[] = [];

    if (from) {
      dateFilter += ' AND date_added >= ?';
      params.push(from as string);
    }
    if (to) {
      dateFilter += ' AND date_added <= ?';
      params.push(to as string);
    }

    // Total count
    const total = db.prepare(`SELECT COUNT(*) as count FROM applications WHERE 1=1 ${dateFilter}`).get(...params) as { count: number };

    // By status
    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM applications WHERE 1=1 ${dateFilter} GROUP BY status
    `).all(...params);

    // Response rate (moved past applied)
    const applied = db.prepare(`SELECT COUNT(*) as count FROM applications WHERE status != 'saved' ${dateFilter}`).get(...params) as { count: number };
    const responded = db.prepare(`
      SELECT COUNT(*) as count FROM applications
      WHERE status NOT IN ('saved', 'applied') ${dateFilter}
    `).get(...params) as { count: number };
    const responseRate = applied.count > 0 ? Math.round((responded.count / applied.count) * 100) : 0;

    // Avg salary of offers
    const avgSalary = db.prepare(`
      SELECT AVG((COALESCE(salary_min, 0) + COALESCE(salary_max, 0)) / 2.0) as avg_salary
      FROM applications WHERE status = 'offer' AND (salary_min IS NOT NULL OR salary_max IS NOT NULL) ${dateFilter}
    `).get(...params) as { avg_salary: number | null };

    // Active count (not rejected/withdrawn/accepted)
    const active = db.prepare(`
      SELECT COUNT(*) as count FROM applications
      WHERE status NOT IN ('rejected', 'withdrawn', 'accepted') ${dateFilter}
    `).get(...params) as { count: number };

    // Applications over time (by week)
    const timeline = db.prepare(`
      SELECT
        strftime('%Y-%W', date_added) as week,
        COUNT(*) as count
      FROM applications WHERE 1=1 ${dateFilter}
      GROUP BY week ORDER BY week ASC
    `).all(...params);

    // Salary distribution
    const salaryDist = db.prepare(`
      SELECT salary_min, salary_max FROM applications
      WHERE salary_min IS NOT NULL OR salary_max IS NOT NULL ${dateFilter}
    `).all(...params);

    // Avg days per stage
    const stageData = db.prepare(`
      SELECT
        sh1.to_status as stage,
        AVG(julianday(sh2.changed_at) - julianday(sh1.changed_at)) as avg_days
      FROM status_history sh1
      LEFT JOIN status_history sh2 ON sh1.application_id = sh2.application_id AND sh2.id > sh1.id
      WHERE sh2.id = (
        SELECT MIN(id) FROM status_history
        WHERE application_id = sh1.application_id AND id > sh1.id
      )
      GROUP BY sh1.to_status
    `).all();

    // Top tags
    const topTags = db.prepare(`
      SELECT t.name, COUNT(*) as count
      FROM tags t
      JOIN application_tags at2 ON t.id = at2.tag_id
      JOIN applications a ON at2.application_id = a.id
      WHERE 1=1 ${dateFilter.replace(/date_added/g, 'a.date_added')}
      GROUP BY t.id ORDER BY count DESC LIMIT 10
    `).all(...params);

    // Source effectiveness
    const sourceStats = db.prepare(`
      SELECT
        source,
        COUNT(*) as total,
        SUM(CASE WHEN status NOT IN ('saved', 'applied', 'rejected', 'withdrawn') THEN 1 ELSE 0 END) as interviews,
        SUM(CASE WHEN status IN ('offer', 'accepted') THEN 1 ELSE 0 END) as offers
      FROM applications WHERE source IS NOT NULL ${dateFilter}
      GROUP BY source
    `).all(...params);

    res.json({
      total: total.count,
      byStatus,
      responseRate,
      avgSalary: avgSalary.avg_salary ? Math.round(avgSalary.avg_salary) : null,
      activeCount: active.count,
      timeline,
      salaryDistribution: salaryDist,
      avgDaysPerStage: stageData,
      topTags,
      sourceStats,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
