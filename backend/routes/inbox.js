import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = getDb();
  const messages = await db.prepare(`
    SELECT i.*, l.first_name, l.last_name, c.name as campaign_name
    FROM inbox i
    LEFT JOIN leads l ON i.lead_id = l.id
    LEFT JOIN campaigns c ON i.campaign_id = c.id
    ORDER BY i.is_read ASC, i.received_at DESC
  `).all();
  res.json(messages);
});

router.put('/:id/read', async (req, res) => {
  const db = getDb();
  await db.prepare('UPDATE inbox SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
