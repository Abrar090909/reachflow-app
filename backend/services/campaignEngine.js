import { getDb } from '../database.js';
import { sendEmail } from './emailSender.js';

// ── Fix #5: Random delay between sends (30–120 seconds) ──────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
function randomDelay() {
  const seconds = Math.floor(Math.random() * 90 + 30); // 30–120 s
  return sleep(seconds * 1000);
}

// ── Fix #6: Sending hours check ──────────────────────────────────────────────
function isWithinSendingHours(campaign) {
  const tz        = campaign.send_timezone  || 'America/New_York';
  const startHour = campaign.send_start_hour ?? 8;
  const endHour   = campaign.send_end_hour   ?? 18;
  const days      = (campaign.send_days || 'mon,tue,wed,thu,fri').split(',');

  const now      = new Date();
  const local    = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  const hour     = local.getHours();
  const dayName  = local.toLocaleString('en-US', { weekday: 'short', timeZone: tz }).toLowerCase().slice(0, 3);

  return days.includes(dayName) && hour >= startHour && hour < endHour;
}

// ── Fix #20: Domain throttle — 1 email/day per company domain ────────────────
async function domainSentToday(db, lead) {
  if (!lead.company) return false;
  const row = await db.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE company = ? AND campaign_id = ? AND status != 'pending' AND sent_at > datetime('now', '-1 day')"
  ).get(lead.company, lead.campaign_id);
  return row && row.count > 0;
}

// ── Follow-up helper ─────────────────────────────────────────────────────────
async function tryFollowUp(db, lead, campaign, accounts, fuNum) {
  const subjectKey = fuNum === 1 ? 'follow_up_1_subject' : fuNum === 2 ? 'follow_up_2_subject' : fuNum === 3 ? 'follow_up_3_subject' : fuNum === 4 ? 'follow_up_4_subject' : 'follow_up_5_subject';
  const bodyKey    = fuNum === 1 ? 'follow_up_1_body'    : fuNum === 2 ? 'follow_up_2_body'    : fuNum === 3 ? 'follow_up_3_body'    : fuNum === 4 ? 'follow_up_4_body'    : 'follow_up_5_body';
  const delayKey   = fuNum === 1 ? 'follow_up_1_delay_days' : fuNum === 2 ? 'follow_up_2_delay_days' : fuNum === 3 ? 'follow_up_3_delay_days' : fuNum === 4 ? 'follow_up_4_delay_days' : 'follow_up_5_delay_days';
  const sentAtKey  = `follow_up_${fuNum}_sent_at`;
  const prevSentAt = fuNum === 1 ? lead.sent_at : lead[`follow_up_${fuNum - 1}_sent_at`];

  if (!campaign[bodyKey]) return; // follow-up not configured
  if (lead[sentAtKey]) return;    // already sent
  if (lead.replied_at) return;    // Fix #9: stop if replied

  const prevDate   = prevSentAt ? new Date(prevSentAt) : null;
  if (!prevDate) return;
  const daysSince  = (Date.now() - prevDate.getTime()) / 86400000;
  if (daysSince < (campaign[delayKey] || 3)) return;

  try {
    await sendEmail({
      accountId: lead.assigned_account_id || accounts[0].id,
      to: lead.email,
      fromName: campaign.from_name,
      subject: campaign[subjectKey] || campaign.subject,
      body: campaign[bodyKey],
      lead,
      emailType: `follow_up_${fuNum}`,
    });
    await db.prepare(`UPDATE leads SET ${sentAtKey} = datetime('now') WHERE id = ?`).run(lead.id);
    console.log(`[Campaign] Follow-up ${fuNum} sent to ${lead.email}`);
  } catch (err) {
    console.error(`[Campaign] Follow-up ${fuNum} error for ${lead.email}:`, err.message);
  }
}

// ── Main campaign runner ──────────────────────────────────────────────────────
export async function runCampaigns() {
  console.log('[Campaign] Running...');
  const db        = getDb();
  const campaigns = await db.prepare("SELECT * FROM campaigns WHERE status = 'active'").all();
  const accounts  = await db.prepare('SELECT * FROM email_accounts WHERE is_active = 1').all();
  if (!accounts.length) { console.log('[Campaign] No active accounts.'); return; }

  for (const campaign of campaigns) {
    // Fix #6: Check sending hours before processing this campaign
    if (!isWithinSendingHours(campaign)) {
      console.log(`[Campaign] Outside sending hours for campaign "${campaign.name}" — skipping.`);
      continue;
    }

    // Fix #7: Count emails sent today for this campaign
    const sentTodayRow = await db.prepare(
      "SELECT COUNT(*) as count FROM sent_emails WHERE campaign_id = ? AND sent_at > datetime('now', 'start of day') AND email_type = 'initial'"
    ).get(campaign.id);
    const sentToday = sentTodayRow?.count || 0;
    const remainingToday = (campaign.daily_limit || 50) - sentToday;
    if (remainingToday <= 0) {
      console.log(`[Campaign] Daily limit reached for "${campaign.name}"`);
      continue;
    }

    const pendingLeads = await db.prepare(
      "SELECT * FROM leads WHERE campaign_id = ? AND status = 'pending' LIMIT ?"
    ).all(campaign.id, remainingToday);

    const sentLeads = await db.prepare(
      "SELECT * FROM leads WHERE campaign_id = ? AND status NOT IN ('pending','bounced','unsubscribed') AND replied_at IS NULL"
    ).all(campaign.id);

    let accountIndex = 0;

    // Send initial emails
    for (const lead of pendingLeads) {
      const account = accounts[accountIndex % accounts.length];
      if (account.sent_today >= account.daily_send_limit) { accountIndex++; continue; }

      // Fix #20: Domain throttle
      if (await domainSentToday(db, lead)) {
        console.log(`[Campaign] Skipping ${lead.email} — domain already emailed today.`);
        continue;
      }

      try {
        // Fix #5: Random delay before every send (not just between accounts)
        if (accountIndex > 0) await randomDelay();

        await sendEmail({
          accountId: account.id,
          to: lead.email,
          fromName: campaign.from_name,
          subject: campaign.subject,
          body: campaign.body,
          lead,
          emailType: 'initial',
        });

        await db.prepare(
          "UPDATE leads SET status = 'sent', sent_at = datetime('now'), assigned_account_id = ? WHERE id = ?"
        ).run(account.id, lead.id);
        await db.prepare('UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = ?').run(campaign.id);

      } catch (err) {
        console.error(`[Campaign] Error sending to ${lead.email}:`, err.message);

        // Fix #8: Bounce handling
        if (err.message.toLowerCase().includes('invalid') || err.message.toLowerCase().includes('bounce') || err.message.toLowerCase().includes('does not exist') || err.message.toLowerCase().includes('no such user')) {
          await db.prepare("UPDATE leads SET status = 'bounced' WHERE id = ?").run(lead.id);
          await db.prepare("INSERT INTO sent_emails (lead_id, campaign_id, account_id, subject, body, email_type, message_id) VALUES (?, ?, ?, ?, ?, 'bounced', NULL)").run(lead.id, campaign.id, account.id, campaign.subject, campaign.body);
          console.log(`[Campaign] Marked ${lead.email} as bounced.`);
        } else if (err.message.includes('auth')) {
          await db.prepare('UPDATE email_accounts SET is_active = 0 WHERE id = ?').run(account.id);
        }
      }
      accountIndex++;
    }

    // Fix #14: Process follow-ups 1–5 (stop if replied — Fix #9)
    for (const lead of sentLeads) {
      for (let n = 1; n <= 5; n++) {
        await tryFollowUp(db, lead, campaign, accounts, n);
      }
    }

    // Mark campaign completed if no pending leads remain
    const remaining = await db.prepare(
      "SELECT COUNT(*) as count FROM leads WHERE campaign_id = ? AND status = 'pending'"
    ).get(campaign.id);
    if (remaining.count === 0) {
      await db.prepare(
        "UPDATE campaigns SET status = 'completed', completed_at = datetime('now') WHERE id = ?"
      ).run(campaign.id);
    }
  }
  console.log('[Campaign] Done.');
}
