import { Router } from 'express';
import { getDb } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
  const result = campaigns.map(c => {
    const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads WHERE campaign_id = ?').get(c.id).count;
    return { ...c, total_leads: totalLeads };
  });
  res.json(result);
});

router.post('/', (req, res) => {
  const { name, from_name, subject, body, follow_up_1_subject, follow_up_1_body, follow_up_1_delay_days, follow_up_2_subject, follow_up_2_body, follow_up_2_delay_days, daily_limit } = req.body;
  if (!name || !from_name || !subject || !body) return res.status(400).json({ error: 'Name, from_name, subject, and body are required' });
  const db = getDb();
  const result = db.prepare('INSERT INTO campaigns (name, from_name, subject, body, follow_up_1_subject, follow_up_1_body, follow_up_1_delay_days, follow_up_2_subject, follow_up_2_body, follow_up_2_delay_days, daily_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, from_name, subject, body, follow_up_1_subject || null, follow_up_1_body || null, follow_up_1_delay_days || 3, follow_up_2_subject || null, follow_up_2_body || null, follow_up_2_delay_days || 5, daily_limit || 50);
  res.json({ id: result.lastInsertRowid });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const leads = db.prepare('SELECT * FROM leads WHERE campaign_id = ?').all(campaign.id);
  res.json({ ...campaign, total_leads: leads.length, actual_sent: leads.filter(l => l.status !== 'pending').length, actual_replies: leads.filter(l => l.replied_at).length });
});

router.put('/:id', (req, res) => {
  const { name, from_name, subject, body, follow_up_1_subject, follow_up_1_body, follow_up_1_delay_days, follow_up_2_subject, follow_up_2_body, follow_up_2_delay_days, daily_limit } = req.body;
  const db = getDb();
  db.prepare('UPDATE campaigns SET name=?, from_name=?, subject=?, body=?, follow_up_1_subject=?, follow_up_1_body=?, follow_up_1_delay_days=?, follow_up_2_subject=?, follow_up_2_body=?, follow_up_2_delay_days=?, daily_limit=? WHERE id=?').run(name, from_name, subject, body, follow_up_1_subject, follow_up_1_body, follow_up_1_delay_days, follow_up_2_subject, follow_up_2_body, follow_up_2_delay_days, daily_limit, req.params.id);
  res.json({ success: true });
});

router.post('/:id/launch', (req, res) => {
  const db = getDb();
  db.prepare("UPDATE campaigns SET status = 'active', started_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ success: true, status: 'active' });
});

router.post('/:id/pause', (req, res) => {
  const db = getDb();
  db.prepare("UPDATE campaigns SET status = 'paused' WHERE id = ?").run(req.params.id);
  res.json({ success: true, status: 'paused' });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM leads WHERE campaign_id = ?').run(req.params.id);
  db.prepare('DELETE FROM sent_emails WHERE campaign_id = ?').run(req.params.id);
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
