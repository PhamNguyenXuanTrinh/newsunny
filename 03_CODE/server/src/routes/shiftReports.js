const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.get('/', auth, async (req, res) => {
  try {
    const { period } = req.query;
    let sql = `SELECT sr.*, u.full_name as creator_name FROM shift_reports sr LEFT JOIN users u ON sr.created_by = u.id WHERE 1=1`;
    const params = [];

    if (['to_truong', 'cong_nhan'].includes(req.user.role) && req.user.team_id) {
      sql += ` AND sr.team_id = ?`;
      params.push(req.user.team_id);
    }

    if (period) {
      sql += ` AND DATE_FORMAT(sr.day, '%Y-%m') = ?`;
      params.push(period);
    }

    sql += ` ORDER BY sr.day DESC, sr.id DESC LIMIT 100`;
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { day, shift, good_qty, scrap_qty, downtime_min, qc_result } = req.body;
    const [result] = await pool.query(
      `INSERT INTO shift_reports (team_id, day, shift, good_qty, scrap_qty, downtime_min, qc_result, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.team_id || 'N/A', day, shift, good_qty, scrap_qty, downtime_min, qc_result || 'pass', req.user.id]
    );
    await logAudit(req.user.id, 'CREATE', 'shift_reports', result.insertId, null, req.body, null, req.ip);
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;