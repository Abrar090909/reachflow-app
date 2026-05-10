import { getDb } from '../database.js';
import { sendEmail } from './emailSender.js';

export async function runCampaigns() {
  console.log('[Campaign] Running...');
  const db = getDb();
  const campaigns = await db.prepare("SELECT * FROM campaigns WHERE status = 'active'").all();
  const accounts = await db.prepare('SELECT * FROM email_accounts WHERE is_active = 1').all();
  if (!accounts.length) { console.log('[Campaign] No active accounts.'); return; }

  for (const campaign of campaigns) {
    const pendingLeads = await db.prepare("SELECT * FROM leads WHERE campaign_id = ? AND status = 'pending' LIMIT ?").all(campaign.id, campaign.daily_limit);
    const sentLeads = await db.prepare("SELECT * FROM leads WHERE campaign_id = ? AND status = 'sent' AND replied_at IS NULL").all(campaign.id);
    let accountIndex = 0;

    for (const lead of pendingLeads) {
      const account = accounts[accountIndex % accounts.length];
      if (account.sent_today >= account.daily_send_limit) { accountIndex++; continue; }
      try {
        if (accountIndex > 0) await new Promise(r => setTimeout(r, 30000 + Math.random() * 90000));
        await sendEmail({ accountId: account.id, to: lead.email, fromName: campaign.from_name, subject: campaign.subject, body: campaign.body, lead, emailType: 'initial' });
        await db.prepare("UPDATE leads SET status = 'sent', sent_at = datetime('now'), assigned_account_id = ? WHERE id = ?").run(account.id, lead.id);
        await db.prepare('UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = ?').run(campaign.id);
      } catch (err) {
        console.error(`[Campaign] Error sending to ${lead.email}:`, err.message);
        if (err.message.includes('auth')) await db.prepare('UPDATE email_accounts SET is_active = 0 WHERE id = ?').run(account.id);
      }
      accountIndex++;
    }

    for (const lead of sentLeads) {
      const daysSinceSent = lead.sent_at ? (Date.now() - new Date(lead.sent_at).getTime()) / 86400000 : 0;
      if (campaign.follow_up_1_body && !lead.follow_up_1_sent_at && daysSinceSent >= campaign.follow_up_1_delay_days) {
        try {
          await sendEmail({ accountId: lead.assigned_account_id || accounts[0].id, to: lead.email, fromName: campaign.from_name, subject: campaign.follow_up_1_subject || campaign.subject, body: campaign.follow_up_1_body, lead, emailType: 'follow_up_1' });
          await db.prepare("UPDATE leads SET follow_up_1_sent_at = datetime('now') WHERE id = ?").run(lead.id);
        } catch (err) { console.error(`[Campaign] Follow-up 1 error:`, err.message); }
      }
      const daysSinceF1 = lead.follow_up_1_sent_at ? (Date.now() - new Date(lead.follow_up_1_sent_at).getTime()) / 86400000 : 0;
      if (campaign.follow_up_2_body && lead.follow_up_1_sent_at && !lead.follow_up_2_sent_at && daysSinceF1 >= campaign.follow_up_2_delay_days) {
        try {
          await sendEmail({ accountId: lead.assigned_account_id || accounts[0].id, to: lead.email, fromName: campaign.from_name, subject: campaign.follow_up_2_subject || campaign.subject, body: campaign.follow_up_2_body, lead, emailType: 'follow_up_2' });
          await db.prepare("UPDATE leads SET follow_up_2_sent_at = datetime('now') WHERE id = ?").run(lead.id);
        } catch (err) { console.error(`[Campaign] Follow-up 2 error:`, err.message); }
      }
    }

    const remaining = await db.prepare("SELECT COUNT(*) as count FROM leads WHERE campaign_id = ? AND status = 'pending'").get(campaign.id);
    if (remaining.count === 0) {
      await db.prepare("UPDATE campaigns SET status = 'completed', completed_at = datetime('now') WHERE id = ?").run(campaign.id);
    }
  }
  console.log('[Campaign] Done.');
}
