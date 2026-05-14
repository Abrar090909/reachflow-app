import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

const ALL_FIELDS = [
  'name', 'from_name', 'subject', 'body',
  'follow_up_1_subject', 'follow_up_1_body', 'follow_up_1_delay_days',
  'follow_up_2_subject', 'follow_up_2_body', 'follow_up_2_delay_days',
  'follow_up_3_subject', 'follow_up_3_body', 'follow_up_3_delay_days',
  'follow_up_4_subject', 'follow_up_4_body', 'follow_up_4_delay_days',
  'follow_up_5_subject', 'follow_up_5_body', 'follow_up_5_delay_days',
  'subject_b', 'body_b', 'ab_split_percent',
  'daily_limit', 'send_start_hour', 'send_end_hour', 'send_timezone', 'send_days',
];

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
  const { name, from_name, subject, body } = req.body;
  if (!name || !from_name || !subject || !body)
    return res.status(400).json({ error: 'name, from_name, subject, and body are required' });

  const db   = getDb();
  const cols = ALL_FIELDS.join(', ');
  const vals = ALL_FIELDS.map(f => req.body[f] ?? null);
  const placeholders = ALL_FIELDS.map(() => '?').join(', ');

  const result = await db.prepare(
    `INSERT INTO campaigns (${cols}) VALUES (${placeholders})`
  ).run(...vals);
  res.json({ id: result.lastInsertRowid });
});

router.get('/:id', async (req, res) => {
  const db = getDb();
  const campaign = await db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const leads = await db.prepare('SELECT * FROM leads WHERE campaign_id = ?').all(campaign.id);
  res.json({
    ...campaign,
    total_leads:    leads.length,
    actual_sent:    leads.filter(l => l.status !== 'pending').length,
    actual_replies: leads.filter(l => l.replied_at).length,
  });
});

router.put('/:id', async (req, res) => {
  const db   = getDb();
  const sets = ALL_FIELDS.map(f => `${f} = ?`).join(', ');
  const vals = ALL_FIELDS.map(f => req.body[f] ?? null);
  await db.prepare(`UPDATE campaigns SET ${sets} WHERE id = ?`).run(...vals, req.params.id);
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

// Fix #22: Duplicate campaign
router.post('/:id/duplicate', async (req, res) => {
  const db       = getDb();
  const original = await db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!original) return res.status(404).json({ error: 'Campaign not found' });

  const newName = `${original.name} (Copy)`;
  const cols    = ALL_FIELDS.join(', ');
  const vals    = ALL_FIELDS.map(f => f === 'name' ? newName : (original[f] ?? null));
  const placeholders = ALL_FIELDS.map(() => '?').join(', ');

  const result = await db.prepare(
    `INSERT INTO campaigns (${cols}, status) VALUES (${placeholders}, 'draft')`
  ).run(...vals);
  res.json({ id: result.lastInsertRowid });
});

router.delete('/:id', async (req, res) => {
  const db = getDb();
  await db.prepare('DELETE FROM leads WHERE campaign_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM sent_emails WHERE campaign_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
