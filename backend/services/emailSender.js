import nodemailer from 'nodemailer';
import CryptoJS from 'crypto-js';
import { getDb } from '../database.js';
import { createTransporter as createGmailTransporter } from './gmailOAuth.js';
import axios from 'axios';

const APP_SECRET = process.env.APP_SECRET || 'default-secret';

// ── Fix #13: Spintax support ─────────────────────────────────────────────────
export function spinText(text) {
  if (!text) return text;
  return text.replace(/\{([^}]+)\}/g, (_, group) => {
    const options = group.split('|');
    return options[Math.floor(Math.random() * options.length)];
  });
}

// ── Variable substitution ────────────────────────────────────────────────────
function replaceVariables(template, lead) {
  if (!template) return template;
  return template
    .replace(/\{\{first_name\}\}/g, lead.first_name || '')
    .replace(/\{\{last_name\}\}/g, lead.last_name || '')
    .replace(/\{\{company\}\}/g, lead.company || '')
    .replace(/\{\{website\}\}/g, lead.website || '')
    .replace(/\{\{custom_1\}\}/g, lead.custom_1 || '')
    .replace(/\{\{custom_2\}\}/g, lead.custom_2 || '');
}

// ── Fix #2: Strip HTML → plain text ─────────────────────────────────────────
function toPlainText(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Fix #3: Build tracking pixel HTML wrapper ────────────────────────────────
function buildTrackingHtml(plainBody, leadId) {
  const baseUrl = process.env.APP_BASE_URL || 'https://reachflow-4kh6.onrender.com';
  const pixelUrl = `${baseUrl}/track/open/${leadId}`;
  // Send as plain-looking HTML (no styling) with invisible tracking pixel
  const htmlLines = plainBody
    .split('\n')
    .map(line => line.trim() ? `<p style="margin:0 0 12px 0;font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.6">${line}</p>` : '')
    .join('');
  return `<!DOCTYPE html><html><body>${htmlLines}<img src="${pixelUrl}" width="1" height="1" style="display:none;border:0" alt="" /></body></html>`;
}

// ── Brevo API sender ─────────────────────────────────────────────────────────
async function sendViaBrevoAPI({ to, fromEmail, fromName, subject, text, html, messageId }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is missing in .env');

  const data = {
    sender: { name: fromName || 'ReachFlow', email: fromEmail },
    to: [{ email: to }],
    subject,
    textContent: text,
    htmlContent: html,
  };

  if (messageId) {
    data.headers = {
      'In-Reply-To': messageId,
      'References': messageId,
    };
  }

  const response = await axios.post('https://api.brevo.com/v3/smtp/email', data, {
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
  });

  return { messageId: response.data.messageId };
}

// ── Zoho transporter ─────────────────────────────────────────────────────────
async function createZohoTransporter(account) {
  const decryptedPass = CryptoJS.AES.decrypt(account.smtp_pass, APP_SECRET).toString(CryptoJS.enc.Utf8);
  const port = account.smtp_port || 465;
  return nodemailer.createTransport({
    host: account.smtp_host || 'smtp.zoho.com',
    port,
    secure: port === 465,
    auth: { user: account.smtp_user || account.email, pass: decryptedPass },
  });
}

// ── Main sendEmail ────────────────────────────────────────────────────────────
export async function sendEmail({ accountId, to, fromName, subject, body, lead, messageId, emailType = 'initial' }) {
  const db = getDb();
  const account = await db.prepare('SELECT * FROM email_accounts WHERE id = ? AND is_active = 1').get(accountId);
  if (!account) throw new Error(`Account ${accountId} not found or inactive`);
  if (account.sent_today >= account.daily_send_limit) throw new Error(`Account ${account.email} has reached daily send limit`);

  // Apply variable substitution then spintax
  let finalSubject = lead ? replaceVariables(subject, lead) : subject;
  let finalBody    = lead ? replaceVariables(body, lead)    : body;
  finalSubject = spinText(finalSubject);
  finalBody    = spinText(finalBody);

  // Fix #2: Always work with plain text; build HTML for tracking pixel
  const plainBody = toPlainText(finalBody);
  // Fix #3: Build HTML version with tracking pixel (only if we have a lead id)
  const htmlBody = lead?.id ? buildTrackingHtml(plainBody, lead.id) : `<pre style="font-family:Arial,sans-serif">${plainBody}</pre>`;

  let resultMessageId;

  if (account.provider === 'zoho' && process.env.BREVO_API_KEY && account.smtp_host?.includes('brevo')) {
    console.log(`[EmailSender] Using Brevo API for ${account.email}`);
    const res = await sendViaBrevoAPI({
      to,
      fromEmail: account.email,
      fromName: fromName || 'ReachFlow',
      subject: finalSubject,
      text: plainBody,
      html: htmlBody,
      messageId,
    });
    resultMessageId = res.messageId;
  } else {
    let transporter;
    if (account.provider === 'gmail') transporter = await createGmailTransporter(account);
    else if (account.provider === 'zoho') transporter = await createZohoTransporter(account);
    else throw new Error(`Unknown provider: ${account.provider}`);

    // Fix #2: Send multipart (text + html with pixel) — plain-looking but trackable
    const mailOptions = {
      from: `"${fromName || 'ReachFlow'}" <${account.email}>`,
      to,
      subject: finalSubject,
      text: plainBody,   // Fix #2: always plain text
      html: htmlBody,    // Fix #3: HTML version with tracking pixel only
    };
    if (messageId) { mailOptions.inReplyTo = messageId; mailOptions.references = messageId; }

    const info = await transporter.sendMail(mailOptions);
    resultMessageId = info.messageId;
  }

  await db.prepare('UPDATE email_accounts SET sent_today = sent_today + 1 WHERE id = ?').run(accountId);
  const sentResult = await db.prepare(
    'INSERT INTO sent_emails (lead_id, campaign_id, account_id, subject, body, email_type, message_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(lead?.id || null, lead?.campaign_id || null, accountId, finalSubject, plainBody, emailType, resultMessageId);

  return { messageId: resultMessageId, sentId: sentResult.lastInsertRowid };
}

export async function resetDailyCounts() {
  const db = getDb();
  await db.prepare('UPDATE email_accounts SET sent_today = 0').run();
  console.log('[EmailSender] Daily send counts reset.');
}

export { replaceVariables };
