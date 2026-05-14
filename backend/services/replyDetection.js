import Imap from 'imap';
import { simpleParser } from 'mailparser';
import CryptoJS from 'crypto-js';
import { getDb } from '../database.js';

const APP_SECRET = process.env.APP_SECRET || 'default-secret';

const UNSUBSCRIBE_KEYWORDS = [
  'unsubscribe', 'remove me', 'remove from list', 'opt out', 'opt-out',
  'not interested', 'stop emailing', 'stop contacting', 'please remove',
  'take me off', 'don\'t email', 'do not email', 'do not contact',
];

const POSITIVE_KEYWORDS = [
  'interested', 'tell me more', 'let\'s chat', 'sounds good', 'let\'s talk',
  'would love to', 'please send', 'schedule a call', 'set up a meeting',
  'can we connect', 'sounds interesting', 'more info', 'sign me up',
];

function isUnsubscribeReply(body) {
  const lower = (body || '').toLowerCase();
  return UNSUBSCRIBE_KEYWORDS.some(kw => lower.includes(kw));
}

function isPositiveReply(body) {
  const lower = (body || '').toLowerCase();
  return POSITIVE_KEYWORDS.some(kw => lower.includes(kw));
}

async function checkAccountInbox(account, db) {
  return new Promise((resolve) => {
    let decryptedPass;
    try {
      decryptedPass = CryptoJS.AES.decrypt(account.smtp_pass || '', APP_SECRET).toString(CryptoJS.enc.Utf8);
    } catch {
      return resolve();
    }
    if (!decryptedPass || !account.smtp_host) return resolve();

    const imapHost = account.smtp_host
      .replace('smtp.', 'imap.')
      .replace('smtpout.', 'imap.')
      .replace(':587', '')
      .replace(':465', '');

    const imap = new Imap({
      user: account.smtp_user || account.email,
      password: decryptedPass,
      host: imapHost,
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 15000,
      authTimeout: 10000,
    });

    imap.once('error', (err) => {
      console.error(`[ReplyDetection] IMAP error for ${account.email}:`, err.message);
      resolve();
    });

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) { imap.end(); return resolve(); }

        // Search for unseen messages from the last 48 hours
        const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
        imap.search(['UNSEEN', ['SINCE', since]], async (err, results) => {
          if (err || !results?.length) { imap.end(); return resolve(); }

          const messages = [];
          const fetch = imap.fetch(results, { bodies: '' });

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              messages.push(
                simpleParser(stream).catch(() => null)
              );
            });
          });

          fetch.once('end', async () => {
            const parsed = (await Promise.all(messages)).filter(Boolean);

            for (const mail of parsed) {
              const inReplyTo = mail.inReplyTo;
              const subject   = mail.subject || '';
              const bodyText  = mail.text || mail.html || '';
              const fromEmail = mail.from?.value?.[0]?.address || '';
              const fromName  = mail.from?.value?.[0]?.name    || '';

              // Try to match lead by In-Reply-To header
              let lead = null;
              if (inReplyTo) {
                const sentRow = await db.prepare(
                  'SELECT lead_id, campaign_id FROM sent_emails WHERE message_id = ?'
                ).get(inReplyTo.replace(/[<>]/g, ''));
                if (sentRow) {
                  lead = await db.prepare('SELECT * FROM leads WHERE id = ?').get(sentRow.lead_id);
                }
              }

              // Fallback: match by subject (strip Re:) and sender email
              if (!lead) {
                const cleanSubject = subject.replace(/^(re:\s*)+/i, '').trim();
                lead = await db.prepare(
                  "SELECT * FROM leads WHERE email = ? AND status NOT IN ('pending')"
                ).get(fromEmail);
              }

              if (!lead) continue;

              // Already logged this reply? Skip.
              const existing = await db.prepare(
                'SELECT id FROM inbox WHERE from_email = ? AND lead_id = ?'
              ).get(fromEmail, lead.id);
              if (existing) continue;

              // Fix #10: Unsubscribe keyword detection
              if (isUnsubscribeReply(bodyText)) {
                await db.prepare(
                  "UPDATE leads SET status = 'unsubscribed', unsubscribed_at = datetime('now') WHERE id = ?"
                ).run(lead.id);
                console.log(`[ReplyDetection] Unsubscribed ${lead.email}`);
              } else {
                // Fix #9: Mark as replied, stop follow-ups
                await db.prepare(
                  "UPDATE leads SET status = 'replied', replied_at = datetime('now') WHERE id = ?"
                ).run(lead.id);
                await db.prepare(
                  'UPDATE campaigns SET reply_count = reply_count + 1 WHERE id = ?'
                ).run(lead.campaign_id);
              }

              // Determine sentiment
              const sentiment = isUnsubscribeReply(bodyText)
                ? 'negative'
                : isPositiveReply(bodyText)
                ? 'positive'
                : 'neutral';

              // Store in inbox
              await db.prepare(
                'INSERT INTO inbox (lead_id, campaign_id, account_id, from_email, from_name, subject, body, sentiment, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))'
              ).run(lead.id, lead.campaign_id, account.id, fromEmail, fromName, subject, bodyText, sentiment);

              console.log(`[ReplyDetection] Reply from ${fromEmail} — sentiment: ${sentiment}`);
            }

            imap.end();
            resolve();
          });

          fetch.once('error', () => { imap.end(); resolve(); });
        });
      });
    });

    imap.connect();
  });
}

export async function runReplyDetection() {
  console.log('[ReplyDetection] Checking inboxes...');
  const db = getDb();
  const accounts = await db.prepare(
    "SELECT * FROM email_accounts WHERE is_active = 1 AND provider = 'zoho'"
  ).all();

  for (const account of accounts) {
    await checkAccountInbox(account, db);
  }
  console.log('[ReplyDetection] Done.');
}
