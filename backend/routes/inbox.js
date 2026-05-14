import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = getDb();
  const messages = await db.prepare(`
    SELECT i.*, l.first_name, l.last_name, l.email as lead_email, c.name as campaign_name
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

// Fix #19: Mark lead as interested / not_interested
router.put('/:id/mark', async (req, res) => {
  const { status } = req.body; // 'interested' | 'not_interested'
  if (!['interested', 'not_interested'].includes(status))
    return res.status(400).json({ error: 'Invalid status' });
  const db = getDb();
  const msg = await db.prepare('SELECT lead_id FROM inbox WHERE id = ?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  await db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, msg.lead_id);
  res.json({ success: true });
});

// Fix #19: One-click reply — save draft to inbox outbox (logged)
router.post('/:id/reply', async (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'body required' });
  const db  = getDb();
  const msg = await db.prepare('SELECT * FROM inbox WHERE id = ?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  // Import sendEmail dynamically to avoid circular
  const { sendEmail } = await import('../services/emailSender.js');
  try {
    await sendEmail({
      accountId: msg.account_id,
      to: msg.from_email,
      fromName: null,
      subject: `Re: ${msg.subject}`,
      body,
      lead: null,
      emailType: 'reply',
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
