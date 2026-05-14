import { Router } from 'express';
import { getDb } from '../database.js';

const router = Router();

// GET all blocklist entries
router.get('/', async (req, res) => {
  const db = getDb();
  const entries = await db.prepare('SELECT * FROM blocklist ORDER BY added_at DESC').all();
  res.json(entries);
});

// POST add entry
router.post('/', async (req, res) => {
  const { email, domain, reason } = req.body;
  if (!email && !domain) return res.status(400).json({ error: 'Provide email or domain' });
  const db = getDb();
  const result = await db.prepare(
    'INSERT INTO blocklist (email, domain, reason) VALUES (?, ?, ?)'
  ).run(email || null, domain || null, reason || null);
  res.json({ id: result.lastInsertRowid });
});

// DELETE entry
router.delete('/:id', async (req, res) => {
  const db = getDb();
  await db.prepare('DELETE FROM blocklist WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Check if an email is blocked
router.get('/check', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ blocked: false });
  const db = getDb();
  const domain = email.split('@')[1];
  const row = await db.prepare(
    'SELECT id FROM blocklist WHERE email = ? OR domain = ?'
  ).get(email, domain);
  res.json({ blocked: !!row });
});

export default router;
