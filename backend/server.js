import dotenv from 'dotenv';
import express from 'express';
// API Version: 3.0.0 - Full Upgrade
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename_early = fileURLToPath(import.meta.url);
const __dirname_early  = path.dirname(__filename_early);
dotenv.config({ path: path.join(__dirname_early, '..', '.env') });

import cron from 'node-cron';
import { initDatabase, getDb } from './database.js';
import authRoutes      from './routes/auth.js';
import accountRoutes   from './routes/accounts.js';
import warmupRoutes    from './routes/warmup.js';
import campaignRoutes  from './routes/campaigns.js';
import leadRoutes      from './routes/leads.js';
import inboxRoutes     from './routes/inbox.js';
import statsRoutes     from './routes/stats.js';
import blocklistRoutes from './routes/blocklist.js';
import { exchangeCode } from './services/gmailOAuth.js';
import { resetDailyCounts } from './services/emailSender.js';
import { runWarmup }    from './services/warmupEngine.js';
import { runCampaigns } from './services/campaignEngine.js';
import { runReplyDetection } from './services/replyDetection.js';

const __filename = __filename_early;
const __dirname  = __dirname_early;

// 1×1 transparent GIF bytes
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

async function startServer() {
  const db  = await initDatabase();
  globalThis.__db = db;

  const app  = express();
  const PORT = process.env.PORT || 3001;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Fix #3: Open tracking pixel ─────────────────────────────────────────────
  app.get('/track/open/:leadId', async (req, res) => {
    const { leadId } = req.params;
    try {
      const lead = await db.prepare('SELECT id, status, campaign_id FROM leads WHERE id = ?').get(leadId);
      if (lead) {
        // Update lead
        if (lead.status === 'sent') {
          await db.prepare(
            "UPDATE leads SET status = 'opened', opened_at = datetime('now') WHERE id = ?"
          ).run(leadId);
        }
        // Increment campaign open count
        await db.prepare(
          'UPDATE campaigns SET open_count = open_count + 1 WHERE id = ?'
        ).run(lead.campaign_id);
      }
    } catch (err) {
      console.error('[Track] Open error:', err.message);
    }
    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': TRACKING_PIXEL.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    });
    res.end(TRACKING_PIXEL);
  });

  // ── Fix #4: Click tracking redirect ─────────────────────────────────────────
  app.get('/track/click/:leadId', async (req, res) => {
    const { leadId } = req.params;
    const { url }    = req.query;
    try {
      const lead = await db.prepare('SELECT id, campaign_id FROM leads WHERE id = ?').get(leadId);
      if (lead) {
        await db.prepare(
          "UPDATE leads SET status = 'clicked', clicked_at = datetime('now') WHERE id = ? AND status NOT IN ('replied','interested','not_interested')"
        ).run(leadId);
        await db.prepare(
          'UPDATE campaigns SET click_count = click_count + 1 WHERE id = ?'
        ).run(lead.campaign_id);
      }
    } catch (err) {
      console.error('[Track] Click error:', err.message);
    }
    const redirect = url ? decodeURIComponent(url) : '/';
    res.redirect(redirect);
  });

  // Gmail OAuth callback
  app.get('/api/accounts/gmail/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('No authorization code');
    try {
      const result = await exchangeCode(code);
      res.send(`
        <html><body><script>
          window.opener && window.opener.postMessage({ type: 'gmail-auth-success', email: '${result.email}' }, '*');
          window.close();
        </script><p>Account connected! You can close this window.</p></body></html>
      `);
    } catch (err) {
      res.status(500).send(`<html><body><p>Error: ${err.message}</p></body></html>`);
    }
  });

  // API Routes
  app.use('/api/auth',      authRoutes);
  app.use('/api/accounts',  accountRoutes);
  app.use('/api/warmup',    warmupRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/leads',     leadRoutes);
  app.use('/api/inbox',     inboxRoutes);
  app.use('/api/stats',     statsRoutes);
  app.use('/api/blocklist', blocklistRoutes);

  // Sent emails
  app.get('/api/sent', async (req, res) => {
    const page   = parseInt(req.query.page) || 1;
    const limit  = 50;
    const offset = (page - 1) * limit;
    const totalCount = await db.prepare("SELECT COUNT(*) as count FROM sent_emails WHERE email_type != 'warmup'").get();
    const total  = totalCount?.count || 0;
    const emails = await db.prepare(`
      SELECT se.*, ea.email as from_email, l.email as to_email, c.name as campaign_name
      FROM sent_emails se
      LEFT JOIN email_accounts ea ON se.account_id = ea.id
      LEFT JOIN leads l ON se.lead_id = l.id
      LEFT JOIN campaigns c ON se.campaign_id = c.id
      WHERE se.email_type != 'warmup'
      ORDER BY se.sent_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    res.json({ emails, total, page, pages: Math.ceil(total / limit) });
  });

  // Serve frontend in production
  const rootDist  = path.join(process.cwd(), 'dist');
  const localDist = path.resolve(__dirname, '..', 'dist');
  const frontendDist = fs.existsSync(rootDist) ? rootDist : localDist;
  console.log(`[Server] Checking for frontend at: ${frontendDist}`);

  if (fs.existsSync(frontendDist)) {
    console.log(`[Server] ✅ Frontend found! Serving from: ${frontendDist}`);
    app.use(express.static(frontendDist));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api') && !req.path.startsWith('/track')) {
        res.sendFile(path.join(frontendDist, 'index.html'));
      }
    });
  } else if (process.env.NODE_ENV === 'production') {
    console.error(`[Server] ❌ CRITICAL: Frontend dist folder NOT found!`);
    app.get('/', (req, res) => res.status(500).send('<h1>Frontend is missing</h1>'));
  } else {
    console.log('[Server] Running in Dev mode (Frontend handled by Vite)');
  }

  // Cron Jobs
  cron.schedule('30 18 * * *', () => { console.log('[Cron] Daily reset'); resetDailyCounts(); });
  cron.schedule('0 * * * *',   () => { console.log('[Cron] Hourly warmup'); runWarmup(); });
  cron.schedule('*/30 * * * *', () => runCampaigns());
  // Fix #9: Poll inboxes every 2 hours for replies
  cron.schedule('0 */2 * * *', () => { console.log('[Cron] Reply detection'); runReplyDetection(); });

  app.listen(PORT, () => {
    console.log(`\n🚀 ReachFlow server running on http://localhost:${PORT}\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
