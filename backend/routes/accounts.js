import { Router } from 'express';
import { getDb } from '../database.js';
import { getAuthUrl } from '../services/gmailOAuth.js';
import { sendEmail } from '../services/emailSender.js';

const router = Router();

// GET all accounts (never return tokens/passwords)
router.get('/', async (req, res) => {
  const db = getDb();
  const accounts = await db.prepare(
    'SELECT id, email, provider, daily_send_limit, sent_today, warmup_enabled, warmup_stage, health_score, last_warmup_at, is_active, created_at FROM email_accounts'
  ).all();
  res.json(accounts);
});

// Step 1: Generate Gmail OAuth URL
router.post('/gmail/auth-url', (req, res) => {
  try {
    res.json({ url: getAuthUrl() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate auth URL. Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env' });
  }
});

// Toggle warmup
router.put('/:id/warmup', async (req, res) => {
  const db = getDb();
  const account = await db.prepare('SELECT * FROM email_accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const newVal = account.warmup_enabled ? 0 : 1;
  await db.prepare('UPDATE email_accounts SET warmup_enabled = ? WHERE id = ?').run(newVal, req.params.id);
  res.json({ warmup_enabled: newVal });
});

// Update daily limit
router.put('/:id/limit', async (req, res) => {
  const db = getDb();
  await db.prepare('UPDATE email_accounts SET daily_send_limit = ? WHERE id = ?').run(req.body.daily_send_limit, req.params.id);
  res.json({ success: true });
});

// Delete account
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    // Remove dependent warmup logs to avoid foreign key constraints
    await db.prepare('DELETE FROM warmup_logs WHERE from_account_id = ? OR to_account_id = ?').run(id, id);
    // Unassign leads
    await db.prepare('UPDATE leads SET assigned_account_id = NULL WHERE assigned_account_id = ?').run(id);
    
    await db.prepare('DELETE FROM email_accounts WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test send
router.get('/:id/test', async (req, res) => {
  const db = getDb();
  const account = await db.prepare('SELECT * FROM email_accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  try {
    await sendEmail({
      accountId: account.id,
      to: process.env.TEST_EMAIL || account.email,
      fromName: 'ReachFlow Test',
      subject: 'ReachFlow Test Email ✓',
      body: 'This is a test email from ReachFlow. If you received this, your Gmail OAuth is working correctly.',
      lead: null,
      emailType: 'test',
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
