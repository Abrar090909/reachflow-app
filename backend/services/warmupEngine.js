import { getDb } from '../database.js';
import { sendEmail } from './emailSender.js';

// --- Warmup email content pools ---
const WARMUP_SUBJECTS = [
  'Re: Quick question', 'Following up', 'Hey there', 'Quick check-in',
  'Re: Our conversation', 'Just wanted to touch base', 'Re: Update',
  'Checking in', 'A quick thought', 'Re: Last week', 'Hello again',
  'Re: Regarding our discussion', 'Just a note', 'Re: Quick update',
  'Re: Catching up', 'Touching base', 'Re: A quick favor', 'Hi again',
  'Re: Following through', 'Quick note'
];

const WARMUP_BODIES = [
  '<p>Hey, just wanted to check in. Let me know if you need anything!</p>',
  '<p>Hi! Was thinking about our discussion. Would love to catch up soon.</p>',
  '<p>Hope you\'re having a great week!</p>',
  '<p>Thanks for the update! I\'ll review and get back to you.</p>',
  '<p>Sounds good. Let\'s connect again soon.</p>',
  '<p>Circling back on this. Let me know your thoughts.</p>',
  '<p>Great to hear from you! Talk soon!</p>',
  '<p>Thanks for sharing that. Really helpful.</p>',
  '<p>Wanted to follow up. Any updates?</p>',
  '<p>Just a friendly reminder. Looking forward to hearing back.</p>'
];

const REPLY_BODIES = [
  '<p>Got it, thanks for reaching out!</p>',
  '<p>Sure thing, sounds great. Talk soon!</p>',
  '<p>Thanks! I appreciate the update.</p>',
  '<p>Absolutely, let\'s circle back on this next week.</p>',
  '<p>Noted! I\'ll get back to you shortly.</p>',
  '<p>Great, thanks for the heads up!</p>',
  '<p>Perfect, looking forward to it.</p>',
  '<p>Thanks for following up. All good on my end!</p>'
];

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Stage → daily email count per account
// Stage 1: 3, Stage 5: 16, Stage 10: 40
const STAGE_DAILY_COUNT = [0, 3, 5, 8, 12, 16, 20, 25, 30, 35, 40];

function getDailyCountForStage(stage) {
  const s = Math.max(0, Math.min(10, stage));
  return STAGE_DAILY_COUNT[s] || 3;
}

// How many emails to send per hourly run (daily count / ~16 waking hours, minimum 1)
function getPerRunCount(stage) {
  const daily = getDailyCountForStage(stage);
  return Math.max(1, Math.ceil(daily / 12)); // spread across ~12 cron runs per day
}

/**
 * Build round-robin send pairs so every account sends and receives evenly.
 * Returns array of { sender, receiver } objects.
 */
function buildRoundRobinPairs(accounts) {
  const pairs = [];
  const n = accounts.length;
  if (n < 2) return pairs;

  // Each account gets paired with the next N accounts in a circular manner
  for (let i = 0; i < n; i++) {
    const sender = accounts[i];
    const perRun = getPerRunCount(sender.warmup_stage);
    
    for (let j = 0; j < perRun; j++) {
      // Pick receiver in round-robin: offset by (j+1) from sender position
      const receiverIndex = (i + j + 1) % n;
      if (receiverIndex !== i) {
        pairs.push({ sender, receiver: accounts[receiverIndex] });
      }
    }
  }

  return pairs;
}

/**
 * Main warmup function — called every hour by cron or /run-now
 */
export async function runWarmup() {
  const timestamp = new Date().toISOString();
  console.log(`\n[Warmup] ========== RUN STARTED at ${timestamp} ==========`);
  
  try {
    const db = getDb();
    const accounts = await db.prepare(
      'SELECT * FROM email_accounts WHERE warmup_enabled = 1 AND is_active = 1'
    ).all();

    if (accounts.length < 2) {
      console.log('[Warmup] Need 2+ active warmup accounts. Skipping.');
      return;
    }

    console.log(`[Warmup] Found ${accounts.length} active warmup accounts:`);
    accounts.forEach(a => console.log(`  - ${a.email} (Stage ${a.warmup_stage}, Sent today: ${a.sent_today}/${a.daily_send_limit})`));

    // Build balanced pairs
    const pairs = buildRoundRobinPairs(accounts);
    console.log(`[Warmup] Generated ${pairs.length} send pairs for this run`);

    let successCount = 0;
    let failCount = 0;

    // Process pairs sequentially to avoid rate limits
    for (const { sender, receiver } of pairs) {
      // Check daily limit before sending
      if (sender.sent_today >= sender.daily_send_limit) {
        console.log(`[Warmup] SKIP: ${sender.email} hit daily limit (${sender.sent_today}/${sender.daily_send_limit})`);
        continue;
      }

      try {
        // Random delay between sends (3-8 seconds)
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 5000));

        const subject = getRandom(WARMUP_SUBJECTS);
        const body = getRandom(WARMUP_BODIES);

        const result = await sendEmail({
          accountId: sender.id,
          to: receiver.email,
          fromName: sender.email.split('@')[0],
          subject,
          body,
          emailType: 'warmup'
        });

        // Log to warmup_logs table
        await db.prepare(
          `INSERT INTO warmup_logs (from_account_id, to_account_id, from_email, to_email, subject, message_id)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(sender.id, receiver.id, sender.email, receiver.email, subject, result.messageId || '');

        // Update sent_today in memory so subsequent checks are accurate
        sender.sent_today = (sender.sent_today || 0) + 1;

        console.log(`[Warmup] ✅ ${sender.email} → ${receiver.email} (${subject})`);
        successCount++;

        // Schedule auto-reply from receiver back to sender
        scheduleReply(db, receiver, sender, subject, result.messageId);

      } catch (err) {
        console.error(`[Warmup] ❌ ${sender.email} → ${receiver.email}: ${err.message}`);
        failCount++;
      }
    }

    // Update last_warmup_at for all accounts that participated
    for (const account of accounts) {
      await db.prepare("UPDATE email_accounts SET last_warmup_at = datetime('now') WHERE id = ?").run(account.id);
    }

    // Auto-advance stage (1 day minimum per stage)
    for (const account of accounts) {
      if (account.warmup_stage < 10 && (account.health_score || 100) > 80) {
        const stageStart = account.warmup_stage_started_at ? new Date(account.warmup_stage_started_at) : new Date(0);
        const daysInStage = (Date.now() - stageStart.getTime()) / 86400000;
        
        if (daysInStage >= 1) {
          const newStage = account.warmup_stage + 1;
          console.log(`[Warmup] 📈 ${account.email} advancing to Stage ${newStage}/10`);
          await db.prepare(
            "UPDATE email_accounts SET warmup_stage = ?, warmup_stage_started_at = datetime('now') WHERE id = ?"
          ).run(newStage, account.id);
        }
      }
    }

    console.log(`[Warmup] ========== RUN COMPLETE: ${successCount} sent, ${failCount} failed ==========\n`);

  } catch (err) {
    console.error(`[Warmup] ❌ CRITICAL ERROR: ${err.message}`);
    console.error(err.stack);
  }
}

/**
 * Schedule an auto-reply from receiver back to sender after a random delay (5-30 min).
 * This builds engagement signals that ISPs look for during warmup.
 */
function scheduleReply(db, replier, originalSender, originalSubject, originalMessageId) {
  const delayMs = (5 + Math.random() * 25) * 60 * 1000; // 5-30 minutes
  const delayMin = Math.round(delayMs / 60000);

  console.log(`[Warmup] 📩 Reply scheduled: ${replier.email} → ${originalSender.email} in ~${delayMin}min`);

  setTimeout(async () => {
    try {
      // Re-check daily limit before replying
      const freshAccount = await db.prepare('SELECT * FROM email_accounts WHERE id = ? AND is_active = 1').get(replier.id);
      if (!freshAccount || freshAccount.sent_today >= freshAccount.daily_send_limit) {
        console.log(`[Warmup] Reply skipped: ${replier.email} hit daily limit`);
        return;
      }

      const replySubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;

      await sendEmail({
        accountId: replier.id,
        to: originalSender.email,
        fromName: replier.email.split('@')[0],
        subject: replySubject,
        body: getRandom(REPLY_BODIES),
        messageId: originalMessageId,
        emailType: 'warmup'
      });

      // Update the warmup_log to mark reply sent
      await db.prepare(
        "UPDATE warmup_logs SET reply_sent = 1, reply_sent_at = datetime('now') WHERE from_email = ? AND to_email = ? AND message_id = ?"
      ).run(originalSender.email, replier.email, originalMessageId || '');

      console.log(`[Warmup] ✅ Reply sent: ${replier.email} → ${originalSender.email}`);

    } catch (err) {
      console.error(`[Warmup] ❌ Reply failed: ${replier.email} → ${originalSender.email}: ${err.message}`);
    }
  }, delayMs);
}
