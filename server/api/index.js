const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

// Routes
const authRoutes = require('../src/routes/auth');
const projectRoutes = require('../src/routes/projects');
const configRoutes = require('../src/routes/config');
const drawingRoutes = require('../src/routes/drawing');
const reportingRoutes = require('../src/routes/reporting');
const userRoutes = require('../src/routes/users');

const app = express();

// Database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
app.locals.pool = pool;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/config', configRoutes);
app.use('/api/drawing', drawingRoutes);
app.use('/api/reporting', reportingRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
