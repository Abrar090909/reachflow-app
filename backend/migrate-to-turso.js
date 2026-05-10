import { createClient } from '@libsql/client';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbPath = path.join(__dirname, 'data', 'reachflow.db');
const tursoUrl = process.env.TURSO_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!fs.existsSync(dbPath)) {
  console.error('Local database not found at:', dbPath);
  process.exit(1);
}

if (!tursoUrl || !tursoToken) {
  console.error('Turso credentials missing in .env');
  process.exit(1);
}

async function migrate() {
  console.log('🚀 Starting Data Migration to Turso...');

  // 1. Load Local DB
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(dbPath);
  const localDb = new SQL.Database(fileBuffer);

  // 2. Connect to Turso
  const turso = createClient({ url: tursoUrl, authToken: tursoToken });

  const tables = ['users', 'email_accounts', 'campaigns', 'leads', 'sent_emails', 'inbox'];

  for (const table of tables) {
    console.log(`\n📦 Migrating table: ${table}...`);
    
    // Get local data
    const res = localDb.exec(`SELECT * FROM ${table}`);
    if (!res.length) {
      console.log(`   (No data in ${table})`);
      continue;
    }

    const columns = res[0].columns;
    const rows = res[0].values;

    for (const row of rows) {
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
      
      try {
        await turso.execute({ sql, args: row });
        process.stdout.write('.');
      } catch (err) {
        console.error(`\n❌ Error in ${table}:`, err.message);
      }
    }
    console.log(`\n✅ ${table} migrated.`);
  }

  console.log('\n\n🎉 MIGRATION COMPLETE! All your data is now in the Turso Cloud.');
  console.log('You can now run "npm run dev" and everything will be back!');
  process.exit(0);
}

migrate().catch(console.error);
