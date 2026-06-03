const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const schema = `
  -- Users (CMS & Landing Page login)
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    reset_otp VARCHAR(10),
    reset_otp_expires TIMESTAMPTZ,
    logged_out_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Projects
  CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url_path VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Data Columns (per project)
  CREATE TABLE IF NOT EXISTS data_columns (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    show_on_web BOOLEAN DEFAULT false,
    masking_6digit BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0
  );

  -- Prize Categories (per project)
  CREATE TABLE IF NOT EXISTS prize_categories (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0
  );

  -- Prizes (per project)
  CREATE TABLE IF NOT EXISTS prizes (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    qty INTEGER DEFAULT 1,
    image_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0
  );

  -- Participants (per project)
  CREATE TABLE IF NOT EXISTS participants (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    data JSONB NOT NULL
  );

  -- Participant Settings (per project)
  CREATE TABLE IF NOT EXISTS participant_settings (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
    limit_type VARCHAR(20) DEFAULT 'unlimited' CHECK (limit_type IN ('unlimited','one_only','limited')),
    limit_qty INTEGER DEFAULT 3,
    unique_column VARCHAR(255)
  );

  -- Logics (per project)
  CREATE TABLE IF NOT EXISTS logics (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    logic_type VARCHAR(20) NOT NULL CHECK (logic_type IN ('product','category')),
    target_id VARCHAR(255) NOT NULL,
    target_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    qty INTEGER DEFAULT 1,
    draw_method VARCHAR(20) DEFAULT 'manual' CHECK (draw_method IN ('manual','auto')),
    stop_after_seconds INTEGER,
    auto_rounds INTEGER DEFAULT 1,
    tiered JSONB DEFAULT '{}',
    filter_method VARCHAR(20) DEFAULT 'all' CHECK (filter_method IN ('all','direct','multiple')),
    filter_direct_col VARCHAR(255),
    filter_direct_val VARCHAR(255),
    filter_cat_col VARCHAR(255),
    filter_cat_vals JSONB DEFAULT '[]',
    filter_nominal_enabled BOOLEAN DEFAULT false,
    filter_nominal_col VARCHAR(255),
    filter_nominal_type VARCHAR(20),
    filter_nominal_lower VARCHAR(100),
    filter_nominal_upper VARCHAR(100),
    sort_order INTEGER DEFAULT 0
  );

  -- Landing Page Config (per project)
  CREATE TABLE IF NOT EXISTS landing_config (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
    title VARCHAR(255) DEFAULT 'LIVE DRAWING',
    subtitle VARCHAR(255),
    banner_url TEXT,
    banner_fit VARCHAR(20) DEFAULT 'cover',
    logo_url TEXT,
    bg_color VARCHAR(20) DEFAULT '#1a1a2e',
    text_color VARCHAR(20) DEFAULT '#ffffff',
    draw_by_column VARCHAR(255),
    show_prizes BOOLEAN DEFAULT true,
    music_url VARCHAR(500)
  );

  -- Winners
  CREATE TABLE IF NOT EXISTS winners (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    logic_id INTEGER REFERENCES logics(id) ON DELETE SET NULL,
    prize_name VARCHAR(255),
    prize_category VARCHAR(255),
    participant_data JSONB,
    drawn_at TIMESTAMPTZ DEFAULT NOW(),
    batch_id VARCHAR(100)
  );

  -- Saved Results (for Reporting)
  CREATE TABLE IF NOT EXISTS saved_results (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    data JSONB,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Add logged_out_at to existing users table (for real-time token revocation)
  ALTER TABLE users ADD COLUMN IF NOT EXISTS logged_out_at TIMESTAMPTZ;

  -- Widen banner/logo/music columns for base64 data
  ALTER TABLE landing_config ALTER COLUMN banner_url TYPE TEXT;
  ALTER TABLE landing_config ALTER COLUMN logo_url TYPE TEXT;
  ALTER TABLE landing_config ALTER COLUMN music_url TYPE TEXT;

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_participants_project ON participants(project_id);
  CREATE INDEX IF NOT EXISTS idx_winners_project ON winners(project_id);
  CREATE INDEX IF NOT EXISTS idx_winners_batch ON winners(batch_id);
  CREATE INDEX IF NOT EXISTS idx_saved_results_project ON saved_results(project_id);
  CREATE INDEX IF NOT EXISTS idx_logics_project ON logics(project_id);
`;

async function migrate() {
  try {
    console.log('Running migration...');
    await pool.query(schema);
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
