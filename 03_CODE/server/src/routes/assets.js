const express = require('express'); const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.get('/', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM assets ORDER BY id DESC');
  res.json({ success: true, data: rows });
});
router.post('/', auth, async (req, res) => {
  const { code, serial_no, name, brand, purchase_date, price, warranty_until, depreciation, location, last_maintenance, next_maintenance } = req.body;
  const [result] = await pool.query(
    'INSERT INTO assets (code, serial_no, name, brand, purchase_date, price, warranty_until, depreciation, location, last_maintenance, next_maintenance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [code, serial_no, name, brand, purchase_date, price, warranty_until, depreciation, location, last_maintenance, next_maintenance]
  );
  await logAudit(req.user.id, 'CREATE', 'assets', result.insertId, null, req.body, null, req.ip);
  res.status(201).json({ success: true, id: result.insertId });
});
router.patch('/:id', auth, async (req, res) => {
  const { name, status, last_maintenance, next_maintenance } = req.body;
  await pool.query('UPDATE assets SET name = ?, status = ?, last_maintenance = ?, next_maintenance = ? WHERE id = ?', [name, status, last_maintenance, next_maintenance, req.params.id]);
  await logAudit(req.user.id, 'UPDATE', 'assets', req.params.id, null, req.body, null, req.ip);
  res.json({ success: true });
});
module.exports = router;
