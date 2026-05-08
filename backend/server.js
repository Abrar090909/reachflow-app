import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename_early = fileURLToPath(import.meta.url);
const __dirname_early = path.dirname(__filename_early);
dotenv.config({ path: path.join(__dirname_early, '..', '.env') });
import cron from 'node-cron';

import { initDatabase } from './database.js';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/accounts.js';
import warmupRoutes from './routes/warmup.js';
import campaignRoutes from './routes/campaigns.js';
import leadRoutes from './routes/leads.js';
import inboxRoutes from './routes/inbox.js';
import statsRoutes from './routes/stats.js';
import { exchangeCode } from './services/gmailOAuth.js';
import { resetDailyCounts } from './services/emailSender.js';
import { runWarmup } from './services/warmupEngine.js';
import { runCampaigns } from './services/campaignEngine.js';

const __filename = __filename_early;
const __dirname = __dirname_early;

async function startServer() {
  // Initialize database first
  const db = await initDatabase();
  
  // Store db on global for route access
  globalThis.__db = db;

  const app = express();
  const PORT = process.env.PORT || 3001;

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Gmail OAuth callback — MUST be before accounts router (no auth needed)
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
  app.use('/api/auth', authRoutes);
  app.use('/api/accounts', accountRoutes);
  app.use('/api/warmup', warmupRoutes);
  app.use('/api/campaigns', campaignRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api/inbox', inboxRoutes);
  app.use('/api/stats', statsRoutes);



  // Sent emails route
  app.get('/api/sent', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    const total = db.prepare("SELECT COUNT(*) as count FROM sent_emails WHERE email_type != 'warmup'").get().count;
    const emails = db.prepare(`
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
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });

  // Cron Jobs
  cron.schedule('0 0 * * *', resetDailyCounts);
  cron.schedule('0 * * * *', runWarmup);
  cron.schedule('*/30 * * * *', runCampaigns);

  app.listen(PORT, () => {
    console.log(`\n🚀 ReachFlow server running on http://localhost:${PORT}\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
