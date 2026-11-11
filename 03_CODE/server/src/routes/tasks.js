const express = require('express'); const router = express.Router();
const { pool } = require('../config/db');
const { Task } = require('../models/HrModels');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.get('/', auth, async (req, res) => {
  try {
    const { period, filterType } = req.query;
    const userId = req.user.id;
    const role = req.user.role;
    
    let sql = `
      SELECT t.*, u.full_name as assignee_name, a.full_name as assigner_name 
      FROM tasks t 
      LEFT JOIN users u ON t.assignee_id = u.id 
      LEFT JOIN users a ON t.assigned_by = a.id
      WHERE 1=1
    `;
    let params = [];

    // 1. XỬ LÝ LỌC CHÍNH XÁC THEO FILTERTYPE
    if (filterType === 'assigned_to_me') {
      // Chỉ lấy việc mình LÀM (assignee_id)
      sql += ' AND t.assignee_id = ?';
      params.push(userId);
    } 
    else if (filterType === 'assigned_by_me') {
      // Chỉ lấy việc mình GIAO (assigned_by)
      sql += ' AND t.assigned_by = ?';
      params.push(userId);
    } 
    else {
      // Nếu không truyền filterType (VD: trang Tasks gọi mặc định)
      if (role === 'giam_doc') {
        // Giám đốc thấy tất cả
      } else if (role === 'to_truong') {
        sql += ' AND (t.team_id = ? OR t.assignee_id = ? OR t.assigned_by = ?)';
        params.push(req.user.team_id, userId, userId);
      } else {
        sql += ' AND t.assignee_id = ?';
        params.push(userId);
      }
    }

    // 2. Lọc theo thời gian
    if (period) {
      const now = new Date();
      let startStr, endStr;
      if (period === 'day') { startStr = new Date(now.setHours(0,0,0,0)).toISOString().slice(0, 19).replace('T', ' '); endStr = new Date(now.setHours(23,59,59,999)).toISOString().slice(0, 19).replace('T', ' '); } 
      else if (period === 'week') { const day = now.getDay() || 7; const start = new Date(now.setDate(now.getDate() - day + 1)); startStr = start.toISOString().slice(0, 19).replace('T', ' '); const end = new Date(start); end.setDate(end.getDate() + 6); endStr = end.toISOString().slice(0, 19).replace('T', ' '); } 
      else if (period === 'month') { const start = new Date(now.getFullYear(), now.getMonth(), 1); startStr = start.toISOString().slice(0, 19).replace('T', ' '); const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); endStr = end.toISOString().slice(0, 19).replace('T', ' '); } 
      else if (period === 'quarter') { const q = Math.floor(now.getMonth()/3); const start = new Date(now.getFullYear(), q*3, 1); startStr = start.toISOString().slice(0, 19).replace('T', ' '); const end = new Date(now.getFullYear(), q*3 + 3, 0); endStr = end.toISOString().slice(0, 19).replace('T', ' '); } 
      else { const start = new Date(now.getFullYear(), 0, 1); startStr = start.toISOString().slice(0, 19).replace('T', ' '); const end = new Date(now.getFullYear(), 11, 31); endStr = end.toISOString().slice(0, 19).replace('T', ' '); }
      
      sql += ' AND (t.start_date <= ? OR t.start_date IS NULL) AND t.due >= ?';
      params.push(endStr, startStr);
    }
    
    sql += ' ORDER BY t.id DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tạo task mới (giữ nguyên)
router.post('/', auth, async (req, res) => {
  try {
    const { title, assignee_id, due, start_date, kpi_weight, task_type, revenue_value, description } = req.body;
    const [assignee] = await pool.query('SELECT role, team_id FROM users WHERE id = ?', [assignee_id]);
    if (assignee.length === 0) throw new Error('Người nhận không tồn tại');

    if (req.user.role === 'to_truong') {
      if (assignee[0].role !== 'cong_nhan' || assignee[0].team_id !== req.user.team_id) throw new Error('Tổ trưởng chỉ được giao việc cho công nhân trong tổ!');
    }
    if (req.user.role === 'ke_toan' && assignee[0].role === 'giam_doc') throw new Error('Kế toán không thể giao việc cho Giám đốc!');

    const [result] = await pool.query(
      `INSERT INTO tasks (code, title, description, assignee_id, assigned_by, team_id, due, start_date, kpi_weight, task_type, revenue_value) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['T'+Date.now(), title, description||null, assignee_id, req.user.id, assignee[0].team_id, due, start_date||null, kpi_weight||1, task_type||'kpi', revenue_value||0]
    );

    await logAudit(req.user.id, 'CREATE', 'tasks', result.insertId, null, req.body, null, req.ip);
    res.status(201).json({ success: true, id: result.insertId });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Cập nhật trạng thái (giữ nguyên)
router.patch('/:id', auth, async (req, res) => {
  try {
    const { status, evidence } = req.body;
    await Task.updateStatus(req.params.id, status, evidence);
    await logAudit(req.user.id, 'UPDATE', 'tasks', req.params.id, null, req.body, null, req.ip);
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
