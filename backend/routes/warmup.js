import { Router } from 'express';
import { getDb } from '../database.js';
import { runWarmup } from '../services/warmupEngine.js';

const router = Router();

// Trigger warmup manually (used by cron-job.org — no auth required)
router.get('/run-now', async (req, res) => {
  console.log('[Warmup] Manual trigger received via GET');
  runWarmup(); // Run in background
  res.json({ message: 'Warmup triggered' });
});

// Everything below requires auth

// Overview: accounts + recent activity
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const accounts = await db.prepare(
      'SELECT id, email, provider, warmup_enabled, warmup_stage, health_score, sent_today, daily_send_limit, last_warmup_at, is_active FROM email_accounts WHERE warmup_enabled = 1'
    ).all();
    const recentActivity = await db.prepare(
      "SELECT se.*, ea.email as from_email FROM sent_emails se JOIN email_accounts ea ON se.account_id = ea.id WHERE se.email_type = 'warmup' ORDER BY se.sent_at DESC LIMIT 20"
    ).all();
    res.json({ accounts, total_warming: accounts.length, activity: recentActivity });
  } catch (err) {
    console.error('[Warmup] Overview error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Warmup logs: detailed from→to with reply status
router.get('/logs', async (req, res) => {
  try {
    const db = getDb();
    const logs = await db.prepare(
      `SELECT id, from_email, to_email, subject, reply_sent, reply_sent_at, sent_at
       FROM warmup_logs
       ORDER BY sent_at DESC
       LIMIT 50`
    ).all();
    res.json({ logs });
  } catch (err) {
    console.error('[Warmup] Logs error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Trigger warmup manually (authenticated POST from dashboard)
router.post('/run-now', async (req, res) => {
  try {
    console.log('[Warmup] Manual trigger received via POST');
    await runWarmup();
    res.json({ success: true });
  } catch (err) {
    console.error('[Warmup] Run error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Toggle warmup on/off for an account
router.put('/:id/toggle', async (req, res) => {
  try {
    const db = getDb();
    const account = await db.prepare('SELECT * FROM email_accounts WHERE id = ?').get(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const newVal = account.warmup_enabled ? 0 : 1;
    await db.prepare('UPDATE email_accounts SET warmup_enabled = ? WHERE id = ?').run(newVal, req.params.id);
    res.json({ warmup_enabled: newVal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
