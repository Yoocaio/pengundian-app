const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi' });
  }

  try {
    const { rows } = await req.app.locals.pool.query(
      'SELECT id, email, password, name, role FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0 || !bcrypt.compareSync(password, rows[0].password)) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const user = rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password (request OTP)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email wajib diisi' });

  try {
    const { rows } = await req.app.locals.pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Email tidak ditemukan' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await req.app.locals.pool.query(
      'UPDATE users SET reset_otp = $1, reset_otp_expires = $2 WHERE id = $3',
      [otp, expires, rows[0].id]
    );

    // TODO: Send OTP via email in production
    console.log(`[OTP] ${email}: ${otp}`);

    res.json({ message: 'Kode OTP telah dikirim ke email Anda', otp }); // Remove otp field in production
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, otp, new_password } = req.body;
  if (!email || !otp || !new_password) {
    return res.status(400).json({ error: 'Email, OTP, dan password baru wajib diisi' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Password minimal 8 karakter' });
  }

  try {
    const { rows } = await req.app.locals.pool.query(
      'SELECT id, reset_otp, reset_otp_expires FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Email tidak ditemukan' });
    if (rows[0].reset_otp !== otp) return res.status(400).json({ error: 'Kode OTP tidak valid' });
    if (new Date(rows[0].reset_otp_expires) < new Date()) return res.status(400).json({ error: 'Kode OTP sudah kadaluarsa' });

    const hash = bcrypt.hashSync(new_password, 10);
    await req.app.locals.pool.query(
      'UPDATE users SET password = $1, reset_otp = NULL, reset_otp_expires = NULL WHERE id = $2',
      [hash, rows[0].id]
    );

    res.json({ message: 'Password berhasil direset' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout — blacklist all tokens for user
router.post('/logout', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email wajib diisi' });
  try {
    await req.app.locals.pool.query(
      'UPDATE users SET logged_out_at = NOW() WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    res.json({ message: 'Logout berhasil' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
