# ReachFlow — Cold Email Outreach Platform

Self-hosted alternative to Instantly.ai. Manage email accounts, warm them up automatically, create multi-step outreach campaigns, and track replies — all from a premium dashboard.

## Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Run in development mode
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Login**: admin / changeme123

## Features

- 📧 **Multi-account support** — Gmail OAuth + Zoho SMTP
- 🔥 **Auto warmup engine** — Sends between your accounts to build reputation
- 📊 **Campaign management** — Multi-step follow-ups with variable personalization
- 📋 **CSV lead import** — Flexible column mapping with dedup
- 📬 **Inbox tracking** — See all replies in one place
- 🛡️ **Rate limiting** — Built-in daily limits and send delays
- 🔒 **Encrypted credentials** — AES-encrypted passwords and tokens

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS v4
- **Backend**: Node.js + Express (ESM)
- **Database**: SQLite (better-sqlite3)
- **Email**: Nodemailer + Gmail OAuth2 + Zoho SMTP
- **Scheduling**: node-cron

## Gmail OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Gmail API
4. Create OAuth 2.0 credentials (Web application)
5. Add `http://localhost:3001/api/accounts/gmail/callback` as authorized redirect URI
6. Copy Client ID and Client Secret to `.env`

## Zoho Setup

1. Log in to Zoho Mail
2. Go to Settings → App Passwords
3. Generate a new app password
4. Use the app password (not your login password) when adding the account

## Deployment

### Railway
```bash
# Build frontend
npm run build
# Deploy — the Procfile handles the rest
```

### Render
- Build command: `npm run install:all && npm run build`
- Start command: `node backend/server.js`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Backend server port (default: 3001) |
| `APP_SECRET` | Encryption key for stored credentials |
| `JWT_SECRET` | Secret for JWT token signing |
| `ADMIN_USERNAME` | Login username |
| `ADMIN_PASSWORD` | Login password |
| `GOOGLE_CLIENT_ID` | Gmail OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | Gmail OAuth Redirect URI |
| `TEST_EMAIL` | Email for test sends |
