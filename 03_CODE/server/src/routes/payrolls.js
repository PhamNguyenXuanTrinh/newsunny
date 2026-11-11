const express = require('express'); const router = express.Router();
const { Payroll } = require('../models/HrModels');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.post('/generate', auth, async (req, res) => {
  try {
    const { user_id, period } = req.body;
    const result = await Payroll.generate(user_id, period);
    await logAudit(req.user.id, 'GENERATE', 'payrolls', user_id, null, { period, result }, null, req.ip);
    res.json({ success: true, message: 'Tính lương thành công', data: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT p.*, u.full_name FROM payrolls p JOIN users u ON p.user_id = u.id ORDER BY p.period DESC');
  res.json({ success: true, data: rows });
});
module.exports = router;
