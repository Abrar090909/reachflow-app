import { google } from 'googleapis';
import CryptoJS from 'crypto-js';
import nodemailer from 'nodemailer';
import { getDb } from '../database.js';

const APP_SECRET = process.env.APP_SECRET || 'default-secret';

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl() {
  return getOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });
}

export async function exchangeCode(code) {
  const oAuth2Client = getOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  // Get user email
  const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
  const { data } = await oauth2.userinfo.get();
  const email = data.email;

  // Encrypt tokens before storing
  const encAccess  = CryptoJS.AES.encrypt(tokens.access_token,  APP_SECRET).toString();
  const encRefresh = tokens.refresh_token
    ? CryptoJS.AES.encrypt(tokens.refresh_token, APP_SECRET).toString()
    : null;

  const db = getDb();
  const existing = await db.prepare('SELECT id FROM email_accounts WHERE email = ?').get(email);
  if (existing) {
    await db.prepare(
      'UPDATE email_accounts SET oauth_access_token = ?, oauth_refresh_token = COALESCE(?, oauth_refresh_token), is_active = 1, provider = ? WHERE email = ?'
    ).run(encAccess, encRefresh, 'gmail', email);
    return { id: existing.id, email, updated: true };
  }

  const result = await db.prepare(
    "INSERT INTO email_accounts (email, provider, oauth_access_token, oauth_refresh_token, daily_send_limit) VALUES (?, 'gmail', ?, ?, 40)"
  ).run(email, encAccess, encRefresh);
  return { id: result.lastInsertRowid, email, updated: false };
}

export async function refreshAccessToken(account) {
  const oAuth2Client = getOAuth2Client();
  const decryptedRefresh = CryptoJS.AES.decrypt(account.oauth_refresh_token, APP_SECRET).toString(CryptoJS.enc.Utf8);
  oAuth2Client.setCredentials({ refresh_token: decryptedRefresh });

  const { credentials } = await oAuth2Client.refreshAccessToken();
  const newEncAccess = CryptoJS.AES.encrypt(credentials.access_token, APP_SECRET).toString();

  const db = getDb();
  await db.prepare('UPDATE email_accounts SET oauth_access_token = ? WHERE id = ?').run(newEncAccess, account.id);

  return credentials.access_token;
}

export async function createTransporter(account) {
  // Decrypt tokens
  let accessToken;
  try {
    accessToken = CryptoJS.AES.decrypt(account.oauth_access_token, APP_SECRET).toString(CryptoJS.enc.Utf8);
    if (!accessToken) throw new Error('Empty access token');
  } catch {
    // Auto-refresh if decryption fails or token missing
    accessToken = await refreshAccessToken(account);
  }

  const refreshToken = CryptoJS.AES.decrypt(account.oauth_refresh_token || '', APP_SECRET).toString(CryptoJS.enc.Utf8);

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: account.email,
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken,
      accessToken,
    },
  });
}
