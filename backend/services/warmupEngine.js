import { getDb } from '../database.js';
import { sendEmail } from './emailSender.js';

const WARMUP_SUBJECTS = ['Re: Quick question', 'Following up', 'Hey there', 'Quick check-in', 'Re: Our conversation', 'Just wanted to touch base', 'Re: Update', 'Checking in', 'A quick thought', 'Re: Last week', 'Hello again', 'Re: Regarding our discussion', 'Just a note', 'Re: Quick update', 'Re: Catching up', 'Touching base', 'Re: A quick favor', 'Hi again', 'Re: Following through', 'Quick note'];
const WARMUP_BODIES = ['<p>Hey, just wanted to check in. Let me know if you need anything!</p>', '<p>Hi! Was thinking about our discussion. Would love to catch up soon.</p>', '<p>Hope you\'re having a great week!</p>', '<p>Thanks for the update! I\'ll review and get back to you.</p>', '<p>Sounds good. Let\'s connect again soon.</p>', '<p>Circling back on this. Let me know your thoughts.</p>', '<p>Great to hear from you! Talk soon!</p>', '<p>Thanks for sharing that. Really helpful.</p>', '<p>Wanted to follow up. Any updates?</p>', '<p>Just a friendly reminder. Looking forward to hearing back.</p>'];
function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function warmupCount(stage) { return stage <= 3 ? 2 : stage <= 7 ? 3 : 5; }

export async function runWarmup() {
  console.log('[Warmup] Running...');
  const db = getDb();
  const accounts = await db.prepare('SELECT * FROM email_accounts WHERE warmup_enabled = 1 AND is_active = 1').all();
  if (accounts.length < 2) { console.log('[Warmup] Need 2+ accounts.'); return; }

  // Run all accounts in parallel
  await Promise.all(accounts.map(async (account) => {
    const count = warmupCount(account.warmup_stage);
    // Shuffle recipients for this account
    const recipients = accounts
      .filter(a => a.id !== account.id)
      .sort(() => 0.5 - Math.random());

    for (let i = 0; i < count && i < recipients.length; i++) {
      try {
        // Random delay between 10s and 60s between emails
        if (i > 0) await new Promise(r => setTimeout(r, 10000 + Math.random() * 50000));
        
        await sendEmail({ 
          accountId: account.id, 
          to: recipients[i].email, 
          fromName: 'Warmup', 
          subject: getRandom(WARMUP_SUBJECTS), 
          body: getRandom(WARMUP_BODIES), 
          emailType: 'warmup' 
        });
      } catch (err) {
        console.error(`[Warmup] Error from ${account.email}:`, err.message);
        if (err.message.includes('auth')) {
          await db.prepare('UPDATE email_accounts SET is_active = 0 WHERE id = ?').run(account.id);
        }
      }
    }

    await db.prepare("UPDATE email_accounts SET last_warmup_at = datetime('now') WHERE id = ?").run(account.id);
    
    // Auto-advance stage every 3 days if health is good
    if (account.warmup_stage < 10 && account.health_score > 80) {
      const last = account.last_warmup_at ? new Date(account.last_warmup_at) : new Date(0);
      if ((Date.now() - last.getTime()) / 86400000 >= 3) {
        await db.prepare('UPDATE email_accounts SET warmup_stage = warmup_stage + 1 WHERE id = ?').run(account.id);
      }
    }
  }));
  
  console.log('[Warmup] Done.');
}
