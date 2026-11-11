const express = require('express'); const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.get('/', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM costs ORDER BY date DESC');
  res.json({ success: true, data: rows });
});
router.post('/', auth, async (req, res) => {
  const { date, category, amount, payment_method, invoice_no, description, source } = req.body;
  const [result] = await pool.query(
    'INSERT INTO costs (date, category, amount, payment_method, invoice_no, description, source, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [date, category, amount, payment_method, invoice_no, description, source, req.user.id]
  );
  await logAudit(req.user.id, 'CREATE', 'costs', result.insertId, null, req.body, null, req.ip);
  res.status(201).json({ success: true, id: result.insertId });
});
module.exports = router;
