import { Router } from 'express';
import { getDb } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/overview', (req, res) => {
  const db = getDb();
  const totalAccounts = db.prepare('SELECT COUNT(*) as count FROM email_accounts').get().count;
  const warmedAccounts = db.prepare('SELECT COUNT(*) as count FROM email_accounts WHERE warmup_enabled = 1 AND is_active = 1').get().count;
  const activeCampaigns = db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE status = 'active'").get().count;
  const sentTodayResult = db.prepare('SELECT SUM(sent_today) as total FROM email_accounts').get();
  const sentToday = sentTodayResult?.total || 0;
  const totalSent = db.prepare("SELECT COUNT(*) as count FROM sent_emails WHERE email_type != 'warmup'").get().count;
  const totalReplies = db.prepare('SELECT COUNT(*) as count FROM inbox').get().count;
  const avgReplyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : 0;
  const recentCampaigns = db.prepare('SELECT c.*, (SELECT COUNT(*) FROM leads WHERE campaign_id = c.id) as total_leads FROM campaigns c ORDER BY c.created_at DESC LIMIT 5').all();
  const accountHealth = db.prepare('SELECT id, email, provider, health_score, is_active, warmup_stage, sent_today, daily_send_limit FROM email_accounts ORDER BY health_score ASC LIMIT 10').all();

  res.json({ total_accounts: totalAccounts, warmed_accounts: warmedAccounts, active_campaigns: activeCampaigns, sent_today: sentToday, total_sent: totalSent, total_replies: totalReplies, avg_reply_rate: avgReplyRate, recent_campaigns: recentCampaigns, account_health: accountHealth });
});

router.get('/campaign/:id', (req, res) => {
  const db = getDb();
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const leads = db.prepare('SELECT status, COUNT(*) as count FROM leads WHERE campaign_id = ? GROUP BY status').all(req.params.id);
  const timeline = db.prepare("SELECT DATE(sent_at) as date, COUNT(*) as count FROM sent_emails WHERE campaign_id = ? AND email_type != 'warmup' GROUP BY DATE(sent_at) ORDER BY date DESC LIMIT 30").all(req.params.id);
  res.json({ campaign, lead_stats: leads, send_timeline: timeline });
});

export default router;
