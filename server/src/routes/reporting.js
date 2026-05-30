const express = require('express');
const ExcelJS = require('exceljs');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { rows } = await req.app.locals.pool.query(
    'SELECT r.*, p.name as project_name FROM saved_results r JOIN projects p ON r.project_id = p.id ORDER BY r.created_at DESC'
  );
  res.json(rows);
});

router.get('/project/:pid', async (req, res) => {
  const { rows } = await req.app.locals.pool.query(
    'SELECT * FROM saved_results WHERE project_id=$1 ORDER BY created_at DESC',
    [req.params.pid]
  );
  res.json(rows);
});

router.get('/download/:rid', async (req, res) => {
  const { rows } = await req.app.locals.pool.query(
    'SELECT r.*, p.name as project_name FROM saved_results r JOIN projects p ON r.project_id = p.id WHERE r.id=$1',
    [req.params.rid]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Data tidak ditemukan' });

  const result = rows[0];
  const winners = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hasil Pengundian');

  // Build columns from first winner data
  const cols = [{ header: 'No', key: 'no', width: 5 }];
  cols.push({ header: 'Hadiah', key: 'prize_name', width: 25 });
  cols.push({ header: 'Kategori', key: 'prize_category', width: 20 });

  if (winners.length > 0) {
    const data = typeof winners[0].participant_data === 'string' ? JSON.parse(winners[0].participant_data) : winners[0].participant_data;
    Object.keys(data || {}).forEach(k => {
      cols.push({ header: k, key: k, width: 20 });
    });
  }
  cols.push({ header: 'Waktu', key: 'drawn_at', width: 22 });
  ws.columns = cols;

  // Style header
  ws.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '7F8C8D' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  winners.forEach((w, i) => {
    const pData = typeof w.participant_data === 'string' ? JSON.parse(w.participant_data) : w.participant_data;
    const row = { no: i + 1, prize_name: w.prize_name, prize_category: w.prize_category, drawn_at: w.drawn_at, ...pData };
    ws.addRow(row);
  });

  // Borders for all data cells
  ws.eachRow((row, rn) => {
    if (rn > 1) row.eachCell(cell => {
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { vertical: 'middle' };
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${result.file_name}.xlsx`);
  await wb.xlsx.write(res);
  res.end();
});

router.delete('/:rid', async (req, res) => {
  await req.app.locals.pool.query('DELETE FROM saved_results WHERE id=$1', [req.params.rid]);
  res.json({ message: 'OK' });
});

module.exports = router;
