import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = getDb();
  const campaigns = await db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
  const result = await Promise.all(campaigns.map(async (c) => {
    const leadCount = await db.prepare('SELECT COUNT(*) as count FROM leads WHERE campaign_id = ?').get(c.id);
    return { ...c, total_leads: leadCount?.count || 0 };
  }));
  res.json(result);
});

router.post('/', async (req, res) => {
  const { name, from_name, subject, body, follow_up_1_subject, follow_up_1_body, follow_up_1_delay_days, follow_up_2_subject, follow_up_2_body, follow_up_2_delay_days, daily_limit } = req.body;
  if (!name || !from_name || !subject || !body) return res.status(400).json({ error: 'Name, from_name, subject, and body are required' });
  const db = getDb();
  const result = await db.prepare('INSERT INTO campaigns (name, from_name, subject, body, follow_up_1_subject, follow_up_1_body, follow_up_1_delay_days, follow_up_2_subject, follow_up_2_body, follow_up_2_delay_days, daily_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, from_name, subject, body, follow_up_1_subject || null, follow_up_1_body || null, follow_up_1_delay_days || 3, follow_up_2_subject || null, follow_up_2_body || null, follow_up_2_delay_days || 5, daily_limit || 50);
  res.json({ id: result.lastInsertRowid });
});

router.get('/:id', async (req, res) => {
  const db = getDb();
  const campaign = await db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const leads = await db.prepare('SELECT * FROM leads WHERE campaign_id = ?').all(campaign.id);
  res.json({ 
    ...campaign, 
    total_leads: leads.length, 
    actual_sent: leads.filter(l => l.status !== 'pending').length, 
    actual_replies: leads.filter(l => l.replied_at).length 
  });
});

router.put('/:id', async (req, res) => {
  const { name, from_name, subject, body, follow_up_1_subject, follow_up_1_body, follow_up_1_delay_days, follow_up_2_subject, follow_up_2_body, follow_up_2_delay_days, daily_limit } = req.body;
  const db = getDb();
  await db.prepare('UPDATE campaigns SET name=?, from_name=?, subject=?, body=?, follow_up_1_subject=?, follow_up_1_body=?, follow_up_1_delay_days=?, follow_up_2_subject=?, follow_up_2_body=?, follow_up_2_delay_days=?, daily_limit=? WHERE id=?').run(name, from_name, subject, body, follow_up_1_subject, follow_up_1_body, follow_up_1_delay_days, follow_up_2_subject, follow_up_2_body, follow_up_2_delay_days, daily_limit, req.params.id);
  res.json({ success: true });
});

router.post('/:id/launch', async (req, res) => {
  const db = getDb();
  await db.prepare("UPDATE campaigns SET status = 'active', started_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ success: true, status: 'active' });
});

router.post('/:id/pause', async (req, res) => {
  const db = getDb();
  await db.prepare("UPDATE campaigns SET status = 'paused' WHERE id = ?").run(req.params.id);
  res.json({ success: true, status: 'paused' });
});

router.delete('/:id', async (req, res) => {
  const db = getDb();
  await db.prepare('DELETE FROM leads WHERE campaign_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM sent_emails WHERE campaign_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
