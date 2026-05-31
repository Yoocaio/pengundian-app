const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

const uploadDir = process.env.NODE_ENV === 'production' ? '/tmp' : path.join(__dirname, '..', '..', 'uploads');
try { if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) {}
const upload = multer({ dest: uploadDir });

// ===== COLUMNS =====
router.get('/:pid/columns', async (req, res) => {
  const { rows } = await req.app.locals.pool.query('SELECT * FROM data_columns WHERE project_id=$1 ORDER BY sort_order', [req.params.pid]);
  res.json(rows);
});

router.post('/:pid/columns', async (req, res) => {
  const { name, show_on_web, masking_6digit } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama kolom wajib diisi' });
  const { rows: c } = await req.app.locals.pool.query('SELECT COUNT(*) FROM data_columns WHERE project_id=$1', [req.params.pid]);
  if (parseInt(c[0].count) >= 10) return res.status(400).json({ error: 'Maksimum 10 kolom' });
  const { rows: p } = await req.app.locals.pool.query('SELECT COUNT(*) FROM participants WHERE project_id=$1', [req.params.pid]);
  const { rows: l } = await req.app.locals.pool.query('SELECT COUNT(*) FROM logics WHERE project_id=$1', [req.params.pid]);
  if (parseInt(p[0].count) > 0 || parseInt(l[0].count) > 0) return res.status(400).json({ error: 'Hapus data peserta dan logic terlebih dahulu' });
  const { rows } = await req.app.locals.pool.query('INSERT INTO data_columns (project_id, name, show_on_web, masking_6digit) VALUES ($1,$2,$3,$4) RETURNING *', [req.params.pid, name, !!show_on_web, !!masking_6digit]);
  res.json(rows[0]);
});

router.put('/:pid/columns/:cid', async (req, res) => {
  const { name, show_on_web, masking_6digit } = req.body;
  await req.app.locals.pool.query('UPDATE data_columns SET name=$1, show_on_web=$2, masking_6digit=$3 WHERE id=$4 AND project_id=$5', [name, !!show_on_web, !!masking_6digit, req.params.cid, req.params.pid]);
  res.json({ message: 'OK' });
});

router.delete('/:pid/columns/:cid', async (req, res) => {
  const { rows: p } = await req.app.locals.pool.query('SELECT COUNT(*) FROM participants WHERE project_id=$1', [req.params.pid]);
  const { rows: l } = await req.app.locals.pool.query('SELECT COUNT(*) FROM logics WHERE project_id=$1', [req.params.pid]);
  if (parseInt(p[0].count) > 0 || parseInt(l[0].count) > 0) return res.status(400).json({ error: 'Hapus data peserta dan logic terlebih dahulu' });
  await req.app.locals.pool.query('DELETE FROM data_columns WHERE id=$1 AND project_id=$2', [req.params.cid, req.params.pid]);
  res.json({ message: 'OK' });
});

// ===== CATEGORIES =====
router.get('/:pid/categories', async (req, res) => {
  const { rows } = await req.app.locals.pool.query('SELECT * FROM prize_categories WHERE project_id=$1 ORDER BY sort_order', [req.params.pid]);
  res.json(rows);
});

router.post('/:pid/categories', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama kategori wajib diisi' });
  const { rows } = await req.app.locals.pool.query('INSERT INTO prize_categories (project_id, name) VALUES ($1,$2) RETURNING *', [req.params.pid, name]);
  res.json(rows[0]);
});

router.delete('/:pid/categories/:cid', async (req, res) => {
  const { rows } = await req.app.locals.pool.query('SELECT is_default FROM prize_categories WHERE id=$1', [req.params.cid]);
  if (rows[0]?.is_default) return res.status(400).json({ error: 'Kategori default tidak dapat dihapus' });
  await req.app.locals.pool.query('DELETE FROM prize_categories WHERE id=$1 AND project_id=$2', [req.params.cid, req.params.pid]);
  res.json({ message: 'OK' });
});

// ===== PRIZES =====
router.get('/:pid/prizes', async (req, res) => {
  const { rows } = await req.app.locals.pool.query('SELECT * FROM prizes WHERE project_id=$1 ORDER BY sort_order', [req.params.pid]);
  res.json(rows);
});

router.post('/:pid/prizes', upload.single('image'), async (req, res) => {
  const { name, category, qty } = req.body;
  if (!name || !category) return res.status(400).json({ error: 'Nama dan kategori wajib diisi' });
  const img = req.file ? '/uploads/' + req.file.filename : null;
  const { rows } = await req.app.locals.pool.query('INSERT INTO prizes (project_id, name, category, qty, image_url) VALUES ($1,$2,$3,$4,$5) RETURNING *', [req.params.pid, name, category, parseInt(qty) || 1, img]);
  res.json(rows[0]);
});

router.put('/:pid/prizes/:prid', upload.single('image'), async (req, res) => {
  const { name, category, qty } = req.body;
  const p = await req.app.locals.pool.query('SELECT * FROM prizes WHERE id=$1', [req.params.prid]);
  const img = req.file ? '/uploads/' + req.file.filename : p.rows[0]?.image_url;
  await req.app.locals.pool.query('UPDATE prizes SET name=$1, category=$2, qty=$3, image_url=$4 WHERE id=$5', [name, category, parseInt(qty) || 1, img, req.params.prid]);
  res.json({ message: 'OK' });
});

router.delete('/:pid/prizes/:prid', async (req, res) => {
  await req.app.locals.pool.query('DELETE FROM prizes WHERE id=$1', [req.params.prid]);
  res.json({ message: 'OK' });
});

// ===== PARTICIPANTS =====
router.get('/:pid/participants', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const { rows: p } = await req.app.locals.pool.query('SELECT * FROM participants WHERE project_id=$1 LIMIT $2 OFFSET $3', [req.params.pid, limit, offset]);
  const { rows: c } = await req.app.locals.pool.query('SELECT COUNT(*) FROM participants WHERE project_id=$1', [req.params.pid]);
  const { rows: cols } = await req.app.locals.pool.query('SELECT * FROM data_columns WHERE project_id=$1 ORDER BY sort_order', [req.params.pid]);
  res.json({ participants: p, columns: cols, total: parseInt(c[0].count), page, limit });
});

router.post('/:pid/participants/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File CSV wajib diupload' });
  const { rows: cols } = await req.app.locals.pool.query('SELECT name FROM data_columns WHERE project_id=$1 ORDER BY sort_order', [req.params.pid]);
  const colNames = cols.map(c => c.name);
  const results = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(req.file.path).pipe(csv()).on('data', row => {
      const obj = {};
      colNames.forEach(c => { obj[c] = row[c] || ''; });
      results.push(obj);
    }).on('end', resolve).on('error', reject);
  });
  const client = await req.app.locals.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM participants WHERE project_id=$1', [req.params.pid]);
    for (const r of results) {
      await client.query('INSERT INTO participants (project_id, data) VALUES ($1,$2)', [req.params.pid, JSON.stringify(r)]);
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
  fs.unlinkSync(req.file.path);
  res.json({ message: results.length + ' peserta berhasil diupload', total: results.length });
});

router.delete('/:pid/participants', async (req, res) => {
  await req.app.locals.pool.query('DELETE FROM participants WHERE project_id=$1', [req.params.pid]);
  res.json({ message: 'OK' });
});

router.get('/:pid/participants/template', async (req, res) => {
  const { rows: cols } = await req.app.locals.pool.query('SELECT name FROM data_columns WHERE project_id=$1 ORDER BY sort_order', [req.params.pid]);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=template.csv');
  res.send(cols.map(c => c.name).join(',') + '\n');
});

router.get('/:pid/participants/values/:col', async (req, res) => {
  const { rows } = await req.app.locals.pool.query('SELECT data FROM participants WHERE project_id=$1', [req.params.pid]);
  const vals = new Set();
  rows.forEach(r => { const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data; if (d[req.params.col]) vals.add(d[req.params.col]); });
  res.json([...vals].sort());
});

// ===== PARTICIPANT SETTINGS =====
router.get('/:pid/participant-settings', async (req, res) => {
  const { rows } = await req.app.locals.pool.query('SELECT * FROM participant_settings WHERE project_id=$1', [req.params.pid]);
  res.json(rows[0] || { limit_type: 'unlimited', limit_qty: 3, unique_column: '' });
});

router.put('/:pid/participant-settings', async (req, res) => {
  const { limit_type, limit_qty, unique_column } = req.body;
  await req.app.locals.pool.query(
    'INSERT INTO participant_settings (project_id, limit_type, limit_qty, unique_column) VALUES ($1,$2,$3,$4) ON CONFLICT (project_id) DO UPDATE SET limit_type=$2, limit_qty=$3, unique_column=$4',
    [req.params.pid, limit_type, limit_qty, unique_column]
  );
  res.json({ message: 'OK' });
});

// ===== LOGICS =====
router.get('/:pid/logics', async (req, res) => {
  const { rows } = await req.app.locals.pool.query('SELECT * FROM logics WHERE project_id=$1 ORDER BY sort_order', [req.params.pid]);
  res.json(rows.map(l => ({ ...l, tiered: typeof l.tiered === 'string' ? JSON.parse(l.tiered) : l.tiered, filter_cat_vals: typeof l.filter_cat_vals === 'string' ? JSON.parse(l.filter_cat_vals) : l.filter_cat_vals })));
});

router.post('/:pid/logics', async (req, res) => {
  const b = req.body;
  if (!b.name) return res.status(400).json({ error: 'Nama logic wajib diisi' });
  await req.app.locals.pool.query(
    `INSERT INTO logics (project_id,logic_type,target_id,target_name,name,qty,draw_method,stop_after_seconds,auto_rounds,tiered,filter_method,filter_direct_col,filter_direct_val,filter_cat_col,filter_cat_vals,filter_nominal_enabled,filter_nominal_col,filter_nominal_type,filter_nominal_lower,filter_nominal_upper)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
    [req.params.pid, b.logic_type, b.target_id, b.target_name, b.name, b.qty || 1, b.draw_method || 'manual', b.stop_after_seconds, b.auto_rounds || 1, JSON.stringify(b.tiered || {}), b.filter_method || 'all', b.filter_direct_col, b.filter_direct_val, b.filter_cat_col, JSON.stringify(b.filter_cat_vals || []), b.filter_nominal_enabled, b.filter_nominal_col, b.filter_nominal_type, b.filter_nominal_lower, b.filter_nominal_upper]
  );
  res.json({ message: 'Logic berhasil disimpan' });
});

router.put('/:pid/logics/:lid', async (req, res) => {
  const b = req.body;
  await req.app.locals.pool.query(
    `UPDATE logics SET logic_type=$1,target_id=$2,target_name=$3,name=$4,qty=$5,draw_method=$6,stop_after_seconds=$7,auto_rounds=$8,tiered=$9,filter_method=$10,filter_direct_col=$11,filter_direct_val=$12,filter_cat_col=$13,filter_cat_vals=$14,filter_nominal_enabled=$15,filter_nominal_col=$16,filter_nominal_type=$17,filter_nominal_lower=$18,filter_nominal_upper=$19 WHERE id=$20 AND project_id=$21`,
    [b.logic_type, b.target_id, b.target_name, b.name, b.qty, b.draw_method, b.stop_after_seconds, b.auto_rounds, JSON.stringify(b.tiered || {}), b.filter_method, b.filter_direct_col, b.filter_direct_val, b.filter_cat_col, JSON.stringify(b.filter_cat_vals || []), b.filter_nominal_enabled, b.filter_nominal_col, b.filter_nominal_type, b.filter_nominal_lower, b.filter_nominal_upper, req.params.lid, req.params.pid]
  );
  res.json({ message: 'OK' });
});

router.delete('/:pid/logics/:lid', async (req, res) => {
  await req.app.locals.pool.query('DELETE FROM logics WHERE id=$1 AND project_id=$2', [req.params.lid, req.params.pid]);
  res.json({ message: 'OK' });
});

router.delete('/:pid/logics', async (req, res) => {
  await req.app.locals.pool.query('DELETE FROM logics WHERE project_id=$1', [req.params.pid]);
  res.json({ message: 'OK' });
});

// ===== LANDING CONFIG =====
router.get('/:pid/landing', async (req, res) => {
  const { rows } = await req.app.locals.pool.query('SELECT * FROM landing_config WHERE project_id=$1', [req.params.pid]);
  res.json(rows[0] || {});
});

router.post('/:pid/landing', upload.fields([{ name: 'banner' }, { name: 'logo' }, { name: 'music' }]), async (req, res) => {
  const b = req.body;
  const banner = req.files?.banner?.[0] ? '/uploads/' + req.files.banner[0].filename : undefined;
  const logo = req.files?.logo?.[0] ? '/uploads/' + req.files.logo[0].filename : undefined;
  const music = req.files?.music?.[0] ? '/uploads/' + req.files.music[0].filename : undefined;
  const existing = await req.app.locals.pool.query('SELECT * FROM landing_config WHERE project_id=$1', [req.params.pid]);
  if (existing.rows.length > 0) {
    await req.app.locals.pool.query(
      'UPDATE landing_config SET title=$1, subtitle=$2, banner_url=COALESCE($3,banner_url), banner_fit=$4, logo_url=COALESCE($5,logo_url), bg_color=$6, text_color=$7, draw_by_column=$8, show_prizes=$9, music_url=COALESCE($10,music_url) WHERE project_id=$11',
      [b.title, b.subtitle, banner, b.banner_fit, logo, b.bg_color, b.text_color, b.draw_by_column, b.show_prizes === 'true', music, req.params.pid]
    );
  } else {
    await req.app.locals.pool.query(
      'INSERT INTO landing_config (project_id,title,subtitle,banner_url,banner_fit,logo_url,bg_color,text_color,draw_by_column,show_prizes,music_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
      [req.params.pid, b.title, b.subtitle, banner, b.banner_fit, logo, b.bg_color, b.text_color, b.draw_by_column, b.show_prizes === 'true', music]
    );
  }
  res.json({ message: 'OK' });
});

module.exports = router;
