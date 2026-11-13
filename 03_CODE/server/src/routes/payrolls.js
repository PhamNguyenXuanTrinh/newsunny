const express = require('express'); const router = express.Router();
const { Payroll } = require('../models/HrModels');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.post('/generate', auth, async (req, res) => {
  try {
    const { user_id, period } = req.body;
    let usersToCalculate = [];

    if (user_id) {
      const [u] = await pool.query(`SELECT id FROM users WHERE id = ? AND status = 'active'`, [user_id]);
      if (u.length === 0) throw new Error('User không tồn tại hoặc đã nghỉ việc');
      usersToCalculate = u;
    } else {
      const [allUsers] = await pool.query(`SELECT id FROM users WHERE status = 'active'`);
      usersToCalculate = allUsers;
    }

    const results = [];
    for (let u of usersToCalculate) {
      const result = await Payroll.generate(u.id, period);
      results.push({ user_id: u.id, ...result });
    }

    await logAudit(req.user.id, 'GENERATE_PAYROLL', 'payrolls', null, null, { period, count: usersToCalculate.length }, null, req.ip);
    res.json({ success: true, message: `Đã tính lương thành công cho ${usersToCalculate.length} nhân viên!`, data: results });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const period = req.query.period;
    let sql = 'SELECT p.*, u.full_name FROM payrolls p JOIN users u ON p.user_id = u.id';
    let params = [];
    if (period) { sql += ' WHERE p.period = ?'; params.push(period); }
    if (req.user.role === 'cong_nhan' || req.user.role === 'ctv') {
      sql += period ? ` AND p.user_id = ?` : ` WHERE p.user_id = ?`;
      params.push(req.user.id);
    }
    sql += ' ORDER BY p.period DESC, u.full_name ASC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/approve', auth, async (req, res) => {
  try {
    if (req.user.role !== 'giam_doc') throw new Error('Chỉ Giám đốc mới có quyền duyệt lương!');
    await pool.query(`UPDATE payrolls SET status = 'approved', approved_by = ? WHERE id = ?`, [req.user.id, req.params.id]);
    await logAudit(req.user.id, 'APPROVE', 'payrolls', req.params.id, null, null, 'Duyệt lương', req.ip);
    res.json({ success: true, message: 'Đã duyệt bảng lương' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;

