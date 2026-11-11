const express = require('express'); const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.get('/', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM marketing ORDER BY id DESC');
  res.json({ success: true, data: rows });
});
router.post('/', auth, async (req, res) => {
  const { title, channel, budget, start_date, end_date, kpi_target } = req.body;
  const [result] = await pool.query(
    'INSERT INTO marketing (title, channel, budget, start_date, end_date, kpi_target) VALUES (?, ?, ?, ?, ?, ?)',
    [title, channel, budget, start_date, end_date, kpi_target]
  );
  await logAudit(req.user.id, 'CREATE', 'marketing', result.insertId, null, req.body, null, req.ip);
  res.status(201).json({ success: true, id: result.insertId });
});
router.patch('/:id', auth, async (req, res) => {
  const { spent, result } = req.body;
  await pool.query('UPDATE marketing SET spent = ?, result = ? WHERE id = ?', [spent, result, req.params.id]);
  await logAudit(req.user.id, 'UPDATE', 'marketing', req.params.id, null, req.body, null, req.ip);
  res.json({ success: true });
});
module.exports = router;
