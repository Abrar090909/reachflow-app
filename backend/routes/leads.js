import { Router } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { getDb } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  const db = getDb();
  const { campaign_id, status } = req.query;
  let query = 'SELECT * FROM leads WHERE 1=1';
  const params = [];
  if (campaign_id) { query += ' AND campaign_id = ?'; params.push(campaign_id); }
  if (status && status !== 'all') { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY id DESC LIMIT 500';
  const leads = await db.prepare(query).all(...params);
  res.json(leads);
});

router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const campaignId = req.body.campaign_id;
  const db = getDb();
  try {
    const content = fs.readFileSync(req.file.path, 'utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    let imported = 0, skipped = 0, duplicates = 0;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const mapCol = (record, aliases) => {
      for (const alias of aliases) {
        const key = Object.keys(record).find(k => k.toLowerCase().replace(/[_\s]/g, '') === alias.toLowerCase().replace(/[_\s]/g, ''));
        if (key && record[key]) return record[key];
      }
      return '';
    };

    for (const record of records) {
      const email = mapCol(record, ['email', 'emailaddress', 'e-mail']);
      if (!email || !emailRegex.test(email)) { skipped++; continue; }
      const existing = await db.prepare('SELECT id FROM leads WHERE email = ? AND campaign_id = ?').get(email, campaignId);
      if (existing) { duplicates++; continue; }
      await db.prepare('INSERT INTO leads (campaign_id, first_name, last_name, email, company, website, custom_1, custom_2) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        campaignId || null,
        mapCol(record, ['firstname', 'first_name', 'first']),
        mapCol(record, ['lastname', 'last_name', 'last']),
        email,
        mapCol(record, ['company', 'companyname', 'company_name']),
        mapCol(record, ['website', 'url', 'site']),
        mapCol(record, ['custom1', 'custom_1']),
        mapCol(record, ['custom2', 'custom_2'])
      );
      imported++;
    }

    fs.unlinkSync(req.file.path);
    res.json({ imported, skipped, duplicates, total: records.length });
  } catch (err) {
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ error: err.message });
  }
});

router.post('/preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  try {
    const content = fs.readFileSync(req.file.path, 'utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    const columns = records.length > 0 ? Object.keys(records[0]) : [];
    fs.unlinkSync(req.file.path);
    res.json({ columns, preview: records.slice(0, 5), totalRows: records.length });
  } catch (err) {
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/status', async (req, res) => {
  const db = getDb();
  await db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const db = getDb();
  await db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
