import nodemailer from 'nodemailer';
import CryptoJS from 'crypto-js';
import { getDb } from '../database.js';
import { createTransporter as createGmailTransporter } from './gmailOAuth.js';
import axios from 'axios';

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

async function sendViaBrevoAPI({ to, fromEmail, fromName, subject, html, replyTo, messageId }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is missing in .env');

  const data = {
    sender: { name: fromName || 'ReachFlow', email: fromEmail },
    to: [{ email: to }],
    subject: subject,
    htmlContent: html,
  };

  if (messageId) {
    data.headers = {
      'In-Reply-To': messageId,
      'References': messageId
    };
  }

  const response = await axios.post('https://api.brevo.com/v3/smtp/email', data, {
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  return { messageId: response.data.messageId };
}

async function createZohoTransporter(account) {
  const decryptedPass = CryptoJS.AES.decrypt(account.smtp_pass, APP_SECRET).toString(CryptoJS.enc.Utf8);
  const port = account.smtp_port || 465;
  return nodemailer.createTransport({ 
    host: account.smtp_host || 'smtp.zoho.com', 
    port, 
    secure: port === 465, 
    auth: { user: account.smtp_user || account.email, pass: decryptedPass } 
  });
}

export async function sendEmail({ accountId, to, fromName, subject, body, lead, messageId, emailType = 'initial' }) {
  const db = getDb();
  const account = await db.prepare('SELECT * FROM email_accounts WHERE id = ? AND is_active = 1').get(accountId);
  if (!account) throw new Error(`Account ${accountId} not found or inactive`);
  if (account.sent_today >= account.daily_send_limit) throw new Error(`Account ${account.email} has reached daily send limit`);

  const finalSubject = lead ? replaceVariables(subject, lead) : subject;
  const finalBody = lead ? replaceVariables(body, lead) : body;

  let resultMessageId;

  // Use Brevo API Bypass if configured and provider is zoho (Custom SMTP)
  if (account.provider === 'zoho' && process.env.BREVO_API_KEY && account.smtp_host?.includes('brevo')) {
    console.log(`[EmailSender] Using Brevo API Bypass for ${account.email}`);
    const res = await sendViaBrevoAPI({
      to,
      fromEmail: account.email,
      fromName: fromName || 'ReachFlow',
      subject: finalSubject,
      html: finalBody,
      messageId
    });
    resultMessageId = res.messageId;
  } else {
    // Normal Nodemailer flow
    let transporter;
    if (account.provider === 'gmail') transporter = await createGmailTransporter(account);
    else if (account.provider === 'zoho') transporter = await createZohoTransporter(account);
    else throw new Error(`Unknown provider: ${account.provider}`);

    const mailOptions = { from: `"${fromName || 'ReachFlow'}" <${account.email}>`, to, subject: finalSubject, html: finalBody };
    if (messageId) { mailOptions.inReplyTo = messageId; mailOptions.references = messageId; }

    const info = await transporter.sendMail(mailOptions);
    resultMessageId = info.messageId;
  }

  await db.prepare('UPDATE email_accounts SET sent_today = sent_today + 1 WHERE id = ?').run(accountId);
  const sentResult = await db.prepare('INSERT INTO sent_emails (lead_id, campaign_id, account_id, subject, body, email_type, message_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(lead?.id || null, lead?.campaign_id || null, accountId, finalSubject, finalBody, emailType, resultMessageId);
  
  return { messageId: resultMessageId, sentId: sentResult.lastInsertRowid };
}

export async function resetDailyCounts() {
  const db = getDb();
  await db.prepare('UPDATE email_accounts SET sent_today = 0').run();
  console.log('[EmailSender] Daily send counts reset.');
}

export { replaceVariables };
