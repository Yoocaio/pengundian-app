const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      `SELECT p.*, u.name as created_by_name
       FROM projects p
       LEFT JOIN users u ON p.created_by = u.id
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects
router.post('/', async (req, res) => {
  const { name, url_path, status } = req.body;
  if (!name || !url_path) return res.status(400).json({ error: 'Nama dan URL path wajib diisi' });
  try {
    const { rows } = await req.app.locals.pool.query(
      'INSERT INTO projects (name, url_path, status, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, url_path, status || 'active', req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'URL path sudah digunakan' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Proyek tidak ditemukan' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  const { name, url_path, status } = req.body;
  try {
    const { rows } = await req.app.locals.pool.query(
      'UPDATE projects SET name=$1, url_path=$2, status=$3, updated_at=NOW() WHERE id=$4 RETURNING *',
      [name, url_path, status, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    await req.app.locals.pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Proyek dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/by-url/:urlPath (public)
router.get('/by-url/:urlPath', async (req, res) => {
  try {
    const { rows } = await req.app.locals.pool.query(
      'SELECT id, name, url_path FROM projects WHERE url_path = $1 AND status = $2',
      [req.params.urlPath, 'active']
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Proyek tidak ditemukan atau tidak aktif' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
