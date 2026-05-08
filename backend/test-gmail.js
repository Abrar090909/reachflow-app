import { initDatabase } from './database.js';
import { createTransporter } from './services/gmailOAuth.js';
import { getDb } from './database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function test() {
  await initDatabase();
  const db = getDb();
  const account = db.prepare('SELECT * FROM email_accounts WHERE email = ?').get('itsabrarahmed2000@gmail.com');
  console.log('Account found:', !!account);
  
  try {
    const transporter = await createTransporter(account);
    console.log('Transporter created, verifying...');
    await transporter.verify();
    console.log('Verify successful!');
  } catch (err) {
    console.error('Verify failed:', err);
  }
  process.exit(0);
}

test();
