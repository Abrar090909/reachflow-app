import nodemailer from 'nodemailer';
import CryptoJS from 'crypto-js';
import { getDb } from '../database.js';
import { createTransporter as createGmailTransporter } from './gmailOAuth.js';

const APP_SECRET = process.env.APP_SECRET || 'default-secret';

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

async function createZohoTransporter(account) {
  const decryptedPass = CryptoJS.AES.decrypt(account.smtp_pass, APP_SECRET).toString(CryptoJS.enc.Utf8);
  return nodemailer.createTransport({ host: account.smtp_host || 'smtp.zoho.com', port: account.smtp_port || 465, secure: true, auth: { user: account.smtp_user || account.email, pass: decryptedPass } });
}

export async function sendEmail({ accountId, to, fromName, subject, body, lead, messageId, emailType = 'initial' }) {
  const db = getDb();
  const account = db.prepare('SELECT * FROM email_accounts WHERE id = ? AND is_active = 1').get(accountId);
  if (!account) throw new Error(`Account ${accountId} not found or inactive`);
  if (account.sent_today >= account.daily_send_limit) throw new Error(`Account ${account.email} has reached daily send limit`);

  const finalSubject = lead ? replaceVariables(subject, lead) : subject;
  const finalBody = lead ? replaceVariables(body, lead) : body;
  let transporter;
  if (account.provider === 'gmail') transporter = await createGmailTransporter(account);
  else if (account.provider === 'zoho') transporter = await createZohoTransporter(account);
  else throw new Error(`Unknown provider: ${account.provider}`);

  const mailOptions = { from: `"${fromName || 'ReachFlow'}" <${account.email}>`, to, subject: finalSubject, html: finalBody };
  if (messageId) { mailOptions.inReplyTo = messageId; mailOptions.references = messageId; }

  const info = await transporter.sendMail(mailOptions);
  db.prepare('UPDATE email_accounts SET sent_today = sent_today + 1 WHERE id = ?').run(accountId);
  const sentResult = db.prepare('INSERT INTO sent_emails (lead_id, campaign_id, account_id, subject, body, email_type, message_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(lead?.id || null, lead?.campaign_id || null, accountId, finalSubject, finalBody, emailType, info.messageId);
  return { messageId: info.messageId, sentId: sentResult.lastInsertRowid };
}

export function resetDailyCounts() {
  const db = getDb();
  db.prepare('UPDATE email_accounts SET sent_today = 0').run();
  console.log('[EmailSender] Daily send counts reset.');
}

export { replaceVariables };
