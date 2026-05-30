const express = require('express');
const bcrypt = require('bcryptjs');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { rows } = await req.app.locals.pool.query('SELECT id, email, name, role, created_at FROM users ORDER BY id');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const { rows } = await req.app.locals.pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, role, created_at',
      [email.toLowerCase().trim(), hash, name || email.split('@')[0]]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email sudah digunakan' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { email, password, name } = req.body;
  const user = await req.app.locals.pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (user.rows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });
  const newPass = password ? bcrypt.hashSync(password, 10) : user.rows[0].password;
  await req.app.locals.pool.query('UPDATE users SET email=$1, password=$2, name=$3 WHERE id=$4',
    [email || user.rows[0].email, newPass, name || user.rows[0].name, req.params.id]);
  res.json({ message: 'User diupdate' });
});

router.delete('/:id', async (req, res) => {
  const count = await req.app.locals.pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(count.rows[0].count) <= 1) return res.status(400).json({ error: 'Tidak dapat menghapus user terakhir' });
  await req.app.locals.pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ message: 'User dihapus' });
});

module.exports = router;
