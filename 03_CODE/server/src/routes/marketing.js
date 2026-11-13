const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const ALLOWED_ROLES = ['giam_doc'];

const canManage = (req, res) => {
  if (!ALLOWED_ROLES.includes(req.user.role)) {
    res.status(403).json({ success: false, error: 'Bạn không có quyền quản lý chiến dịch Marketing.' });
    return false;
  }
  return true;
};

const safeAudit = async (...args) => {
  try { await logAudit(...args); }
  catch (err) { console.error('[MARKETING AUDIT]', err.message); }
};

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM marketing ORDER BY id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[GET /marketing]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (!canManage(req, res)) return;

    const {
      title, channel, budget = 0, spent = 0,
      start_date = null, end_date = null,
      kpi_target = 0, result = 0
    } = req.body;

    if (!title || !String(title).trim())
      return res.status(400).json({ success: false, error: 'Tên chiến dịch không được để trống.' });

    if (!channel || !String(channel).trim())
      return res.status(400).json({ success: false, error: 'Kênh Marketing không được để trống.' });

    if (Number(budget) < 0 || Number(spent) < 0 || Number(kpi_target) < 0 || Number(result) < 0)
      return res.status(400).json({ success: false, error: 'Ngân sách, chi phí, KPI và kết quả không được âm.' });

    if (start_date && end_date && new Date(end_date) < new Date(start_date))
      return res.status(400).json({ success: false, error: 'Ngày kết thúc không được trước ngày bắt đầu.' });

    const [insert] = await pool.query(
      `INSERT INTO marketing
      (title, channel, budget, spent, start_date, end_date, kpi_target, result)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(title).trim(),
        String(channel).trim(),
        Number(budget) || 0,
        Number(spent) || 0,
        start_date || null,
        end_date || null,
        Number(kpi_target) || 0,
        Number(result) || 0
      ]
    );

    const [rows] = await pool.query('SELECT * FROM marketing WHERE id = ?', [insert.insertId]);
    const created = rows[0];

    await safeAudit(
      req.user.id, 'CREATE', 'marketing', insert.insertId,
      null, created, null, req.ip
    );

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('[POST /marketing]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    if (!canManage(req, res)) return;

    const [rows] = await pool.query(
      'SELECT * FROM marketing WHERE id = ? LIMIT 1',
      [req.params.id]
    );

    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Không tìm thấy chiến dịch.' });

    const old = rows[0];

    const title = req.body.title ?? old.title;
    const channel = req.body.channel ?? old.channel;
    const budget = req.body.budget ?? old.budget;
    const spent = req.body.spent ?? old.spent;
    const start_date = req.body.start_date !== undefined ? req.body.start_date : old.start_date;
    const end_date = req.body.end_date !== undefined ? req.body.end_date : old.end_date;
    const kpi_target = req.body.kpi_target ?? old.kpi_target;
    const result = req.body.result ?? old.result;

    if (!title || !String(title).trim())
      return res.status(400).json({ success: false, error: 'Tên chiến dịch không được để trống.' });

    if (!channel || !String(channel).trim())
      return res.status(400).json({ success: false, error: 'Kênh Marketing không được để trống.' });

    if (Number(budget) < 0 || Number(spent) < 0 || Number(kpi_target) < 0 || Number(result) < 0)
      return res.status(400).json({ success: false, error: 'Ngân sách, chi phí, KPI và kết quả không được âm.' });

    if (start_date && end_date && new Date(end_date) < new Date(start_date))
      return res.status(400).json({ success: false, error: 'Ngày kết thúc không được trước ngày bắt đầu.' });

    await pool.query(
      `UPDATE marketing
       SET title = ?, channel = ?, budget = ?, spent = ?,
           start_date = ?, end_date = ?, kpi_target = ?, result = ?
       WHERE id = ?`,
      [
        String(title).trim(),
        String(channel).trim(),
        Number(budget) || 0,
        Number(spent) || 0,
        start_date || null,
        end_date || null,
        Number(kpi_target) || 0,
        Number(result) || 0,
        req.params.id
      ]
    );

    const [updatedRows] = await pool.query(
      'SELECT * FROM marketing WHERE id = ?',
      [req.params.id]
    );

    const updated = updatedRows[0];

    await safeAudit(
      req.user.id, 'UPDATE', 'marketing', req.params.id,
      old, updated, null, req.ip
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[PATCH /marketing/:id]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!canManage(req, res)) return;

    const [rows] = await pool.query(
      'SELECT * FROM marketing WHERE id = ? LIMIT 1',
      [req.params.id]
    );

    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Không tìm thấy chiến dịch.' });

    const old = rows[0];

    await pool.query('DELETE FROM marketing WHERE id = ?', [req.params.id]);

    await safeAudit(
      req.user.id, 'DELETE', 'marketing', req.params.id,
      old, null, null, req.ip
    );

    res.json({
      success: true,
      message: 'Đã xóa chiến dịch Marketing.'
    });
  } catch (err) {
    console.error('[DELETE /marketing/:id]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
