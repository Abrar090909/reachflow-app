import { google } from 'googleapis';
import CryptoJS from 'crypto-js';
import { getDb } from '../database.js';

const APP_SECRET = process.env.APP_SECRET || 'default-secret';

function getOAuth2Client() {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
}

export function getAuthUrl() {
  return getOAuth2Client().generateAuthUrl({
    access_type: 'offline', prompt: 'consent',
    scope: ['https://mail.google.com/', 'https://www.googleapis.com/auth/userinfo.email']
  });
}

export async function exchangeCode(code) {
  const oAuth2Client = getOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });
  const { data } = await oauth2.userinfo.get();
  const email = data.email;
  const encAccessToken = CryptoJS.AES.encrypt(tokens.access_token, APP_SECRET).toString();
  const encRefreshToken = tokens.refresh_token ? CryptoJS.AES.encrypt(tokens.refresh_token, APP_SECRET).toString() : null;
  const db = getDb();
  const existing = db.prepare('SELECT id FROM email_accounts WHERE email = ?').get(email);
  if (existing) {
    db.prepare('UPDATE email_accounts SET oauth_access_token = ?, oauth_refresh_token = COALESCE(?, oauth_refresh_token), is_active = 1 WHERE email = ?').run(encAccessToken, encRefreshToken, email);
    return { id: existing.id, email, updated: true };
  }
  const result = db.prepare("INSERT INTO email_accounts (email, provider, oauth_access_token, oauth_refresh_token) VALUES (?, 'gmail', ?, ?)").run(email, encAccessToken, encRefreshToken);
  return { id: result.lastInsertRowid, email, updated: false };
}

export async function refreshAccessToken(account) {
  const oAuth2Client = getOAuth2Client();
  const decryptedRefresh = CryptoJS.AES.decrypt(account.oauth_refresh_token, APP_SECRET).toString(CryptoJS.enc.Utf8);
  oAuth2Client.setCredentials({ refresh_token: decryptedRefresh });
  const { credentials } = await oAuth2Client.refreshAccessToken();
  const newAccessToken = CryptoJS.AES.encrypt(credentials.access_token, APP_SECRET).toString();
  const db = getDb();
  db.prepare('UPDATE email_accounts SET oauth_access_token = ? WHERE id = ?').run(newAccessToken, account.id);
  return credentials.access_token;
}

export async function createTransporter(account) {
  const nodemailer = (await import('nodemailer')).default;
  let accessToken;
  try {
    accessToken = CryptoJS.AES.decrypt(account.oauth_access_token, APP_SECRET).toString(CryptoJS.enc.Utf8);
  } catch { accessToken = await refreshAccessToken(account); }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2', user: account.email,
      clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: CryptoJS.AES.decrypt(account.oauth_refresh_token, APP_SECRET).toString(CryptoJS.enc.Utf8),
      accessToken
    }
  });
}
