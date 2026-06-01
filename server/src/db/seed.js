const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seed() {
  try {
    console.log('Seeding database...');

    // Create default admin user
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', ['adminpengundian@gmail.com']);

    if (rows.length === 0) {
      const hash = bcrypt.hashSync('Admin2026!@', 10);
      await pool.query(
        'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4)',
        ['adminpengundian@gmail.com', hash, 'Admin Pengundian', 'admin']
      );
      console.log('Default admin user created: adminpengundian@gmail.com / Admin2026!@');
    } else {
      console.log('Admin user already exists');
    }

    console.log('Seed completed!');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
