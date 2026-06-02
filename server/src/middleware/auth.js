const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'pengundian-app-jatis-production-2026';

async function authMiddleware(req, res, next) {
  let token = null;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  }
  if (!token && req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Check if user logged out after token was issued
    if (decoded.email && req.app && req.app.locals && req.app.locals.pool) {
      const { rows } = await req.app.locals.pool.query(
        'SELECT logged_out_at FROM users WHERE email = $1',
        [decoded.email]
      );
      if (rows.length > 0 && rows[0].logged_out_at) {
        const tokenTime = new Date(decoded.iat * 1000);
        if (tokenTime < new Date(rows[0].logged_out_at)) {
          return res.status(401).json({ error: 'Token revoked, please login again' });
        }
      }
    }

    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
