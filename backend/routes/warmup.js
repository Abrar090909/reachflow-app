import { Router } from 'express';
import { getDb } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

import { runWarmup } from '../services/warmupEngine.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const db = getDb();
  const accounts = await db.prepare('SELECT id, email, provider, warmup_enabled, warmup_stage, health_score, sent_today, daily_send_limit, last_warmup_at, is_active FROM email_accounts WHERE warmup_enabled = 1').all();
  const recentActivity = await db.prepare("SELECT se.*, ea.email as from_email FROM sent_emails se JOIN email_accounts ea ON se.account_id = ea.id WHERE se.email_type = 'warmup' ORDER BY se.sent_at DESC LIMIT 20").all();
  res.json({ accounts, total_warming: accounts.length, activity: recentActivity });
});

router.post('/run-now', async (req, res) => {
  try {
    await runWarmup();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/toggle', async (req, res) => {
  const db = getDb();
  const account = await db.prepare('SELECT * FROM email_accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const newVal = account.warmup_enabled ? 0 : 1;
  await db.prepare('UPDATE email_accounts SET warmup_enabled = ? WHERE id = ?').run(newVal, req.params.id);
  res.json({ warmup_enabled: newVal });
});

export default router;
