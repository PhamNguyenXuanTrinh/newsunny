const express = require('express'); const router = express.Router();
const { pool } = require('../config/db'); const StockLedger = require('../models/StockLedger');
const auth = require('../middleware/auth'); const { logAudit } = require('../middleware/audit');

// Lấy danh sách lịch sử kho (Có JOIN với bảng items để lấy tên)
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, i.code as item_code, i.name as item_name 
      FROM stock_ledger s 
      JOIN items i ON s.item_id = i.id 
      ORDER BY s.id DESC 
      LIMIT 500
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/balance', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.id, i.code, i.name, i.min_stock, COALESCE(SUM(s.signed_qty), 0) as stock 
      FROM items i 
      LEFT JOIN stock_ledger s ON i.id = s.item_id 
      GROUP BY i.id
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { item_id, type, qty } = req.body;
    if (Number(qty) <= 0) throw new Error('Số lượng phải > 0');

    if (type === 'out') {
      const [stock] = await conn.query('SELECT COALESCE(SUM(signed_qty), 0) as stock FROM stock_ledger WHERE item_id = ?', [item_id]);
      if (Number(stock[0].stock) < Number(qty)) throw new Error(`Không đủ tồn kho để xuất (Hiện có: ${stock[0].stock})`);
    }

    const signed = type === 'out' ? -Math.abs(qty) : Math.abs(qty);
    await StockLedger.create({ ...req.body, signed_qty: signed, created_by: req.user.id });
    await logAudit(req.user.id, 'CREATE', 'stock_ledger', null, null, req.body, null, req.ip);
    await conn.commit();
    res.status(201).json({ success: true });
  } catch (err) { await conn.rollback(); res.status(400).json({ error: err.message }); } finally { conn.release(); }
});
module.exports = router;
