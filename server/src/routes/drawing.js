const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

// Public: get drawing data for landing page
router.get('/:pid/data', async (req, res) => {
  try {
    const [cols, prizes, logics, landing, participants] = await Promise.all([
      req.app.locals.pool.query('SELECT * FROM data_columns WHERE project_id=$1 ORDER BY sort_order', [req.params.pid]),
      req.app.locals.pool.query('SELECT * FROM prizes WHERE project_id=$1 ORDER BY sort_order', [req.params.pid]),
      req.app.locals.pool.query('SELECT * FROM logics WHERE project_id=$1 ORDER BY sort_order', [req.params.pid]),
      req.app.locals.pool.query('SELECT * FROM landing_config WHERE project_id=$1', [req.params.pid]),
      req.app.locals.pool.query('SELECT data FROM participants WHERE project_id=$1', [req.params.pid])
    ]);
    res.json({
      columns: cols.rows,
      prizes: prizes.rows,
      logics: logics.rows.map(l => ({ ...l, tiered: typeof l.tiered === 'string' ? JSON.parse(l.tiered) : l.tiered, filter_cat_vals: typeof l.filter_cat_vals === 'string' ? JSON.parse(l.filter_cat_vals) : l.filter_cat_vals })),
      landingConfig: landing.rows[0] || {},
      participants: participants.rows.map(r => r.data)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST: execute draw
router.post('/:pid/draw/:logicId', async (req, res) => {
  try {
    const { rows: [logic] } = await req.app.locals.pool.query('SELECT * FROM logics WHERE id=$1', [req.params.logicId]);
    if (!logic) return res.status(404).json({ error: 'Logic tidak ditemukan' });

    // Get participants
    const { rows: participants } = await req.app.locals.pool.query('SELECT data FROM participants WHERE project_id=$1', [req.params.pid]);
    let pool = participants.map(p => (typeof p.data === 'string' ? JSON.parse(p.data) : p.data));

    // Apply filter
    if (logic.filter_method === 'direct' && logic.filter_direct_col && logic.filter_direct_val) {
      pool = pool.filter(p => String(p[logic.filter_direct_col] || '').toLowerCase() === logic.filter_direct_val.toLowerCase());
    } else if (logic.filter_method === 'multiple') {
      if (logic.filter_cat_col && logic.filter_cat_vals?.length > 0) {
        const vals = logic.filter_cat_vals.map(v => v.toLowerCase());
        pool = pool.filter(p => vals.includes(String(p[logic.filter_cat_col] || '').toLowerCase()));
      }
      if (logic.filter_nominal_enabled && logic.filter_nominal_col) {
        pool = pool.filter(p => {
          const val = parseFloat(String(p[logic.filter_nominal_col] || '').replace(/[^0-9.]/g, ''));
          if (isNaN(val)) return false;
          if (logic.filter_nominal_type === 'range') return val >= parseFloat(logic.filter_nominal_lower || 0) && val <= parseFloat(logic.filter_nominal_upper || Infinity);
          if (logic.filter_nominal_type === 'less_than') return val < parseFloat(logic.filter_nominal_lower || 0);
          if (logic.filter_nominal_type === 'more_than') return val > parseFloat(logic.filter_nominal_lower || 0);
          return true;
        });
      }
    }

    // Shuffle & pick winners
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const winners = pool.slice(0, logic.qty);

    // Save winners
    const batchId = Date.now().toString();
    const prize = await req.app.locals.pool.query('SELECT * FROM prizes WHERE id=$1', [logic.target_id]);
    const prizeName = prize.rows[0]?.name || logic.target_name;
    const prizeCat = prize.rows[0]?.category || '';

    for (const w of winners) {
      await req.app.locals.pool.query(
        'INSERT INTO winners (project_id, logic_id, prize_name, prize_category, participant_data, batch_id) VALUES ($1,$2,$3,$4,$5,$6)',
        [req.params.pid, logic.id, prizeName, prizeCat, JSON.stringify(w), batchId]
      );
    }

    res.json({ winners, batchId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET winners
router.get('/:pid/winners', async (req, res) => {
  const { rows } = await req.app.locals.pool.query(
    'SELECT * FROM winners WHERE project_id=$1 ORDER BY drawn_at DESC',
    [req.params.pid]
  );
  res.json(rows);
});

// DELETE winner
router.delete('/:pid/winners/:wid', async (req, res) => {
  await req.app.locals.pool.query('DELETE FROM winners WHERE id=$1 AND project_id=$2', [req.params.wid, req.params.pid]);
  res.json({ message: 'OK' });
});

// POST save winners to CMS
router.post('/:pid/winners/save', authMiddleware, async (req, res) => {
  const { file_name } = req.body;
  if (!file_name) return res.status(400).json({ error: 'Nama file wajib diisi' });
  const { rows: winners } = await req.app.locals.pool.query(
    'SELECT * FROM winners WHERE project_id=$1 ORDER BY drawn_at',
    [req.params.pid]
  );
  if (winners.length === 0) return res.status(400).json({ error: 'Belum ada pemenang' });
  await req.app.locals.pool.query(
    'INSERT INTO saved_results (project_id, file_name, data, created_by) VALUES ($1,$2,$3,$4)',
    [req.params.pid, file_name, JSON.stringify(winners), req.user.id]
  );
  await req.app.locals.pool.query('DELETE FROM winners WHERE project_id=$1', [req.params.pid]);
  res.json({ message: 'Data berhasil disimpan ke CMS' });
});

module.exports = router;
