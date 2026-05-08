import { Router } from 'express';
import { getDb } from '../database.js';
import CryptoJS from 'crypto-js';
import { getAuthUrl, exchangeCode } from '../services/gmailOAuth.js';
import { sendEmail } from '../services/emailSender.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const APP_SECRET = process.env.APP_SECRET || 'default-secret';

router.use(authMiddleware);

router.get('/', (req, res) => {
  const db = getDb();
  const accounts = db.prepare('SELECT id, email, provider, daily_send_limit, sent_today, warmup_enabled, warmup_stage, health_score, last_warmup_at, is_active, created_at FROM email_accounts').all();
  res.json(accounts);
});

router.post('/gmail/auth-url', (req, res) => {
  try { res.json({ url: getAuthUrl() }); }
  catch (err) { res.status(500).json({ error: 'Failed to generate auth URL.' }); }
});

router.post('/zoho', (req, res) => {
  const { email, smtp_pass, smtp_host, smtp_port } = req.body;
  if (!email || !smtp_pass) return res.status(400).json({ error: 'Email and password required' });
  const db = getDb();
  const encrypted = CryptoJS.AES.encrypt(smtp_pass, APP_SECRET).toString();
  try {
    const result = db.prepare('INSERT INTO email_accounts (email, provider, smtp_host, smtp_port, smtp_user, smtp_pass) VALUES (?, ?, ?, ?, ?, ?)').run(email, 'zoho', smtp_host || 'smtp.zoho.com', smtp_port || 465, email, encrypted);
    res.json({ id: result.lastInsertRowid, email });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Account already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/warmup', (req, res) => {
  const db = getDb();
  const account = db.prepare('SELECT * FROM email_accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const newVal = account.warmup_enabled ? 0 : 1;
  db.prepare('UPDATE email_accounts SET warmup_enabled = ? WHERE id = ?').run(newVal, req.params.id);
  res.json({ warmup_enabled: newVal });
});

router.put('/:id/limit', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE email_accounts SET daily_send_limit = ? WHERE id = ?').run(req.body.daily_send_limit, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM email_accounts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/:id/test', async (req, res) => {
  const db = getDb();
  const account = db.prepare('SELECT * FROM email_accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  try {
    await sendEmail({ accountId: account.id, to: process.env.TEST_EMAIL || account.email, fromName: 'ReachFlow Test', subject: 'ReachFlow Test Email', body: '<p>This is a test email from ReachFlow.</p>', emailType: 'test' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
