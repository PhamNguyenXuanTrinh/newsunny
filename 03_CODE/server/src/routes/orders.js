const express = require('express'); const router = express.Router();
const { pool } = require('../config/db'); const Order = require('../models/Order'); const StockLedger = require('../models/StockLedger');
const auth = require('../middleware/auth'); const { logAudit } = require('../middleware/audit');

router.post('/', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const code = req.body.code || `DH${Date.now()}`;
    const orderId = await Order.create({ ...req.body, code, created_by: req.user.id });
    for (let item of req.body.items) { await Order.addItem(orderId, item); }
    await logAudit(req.user.id, 'CREATE', 'orders', orderId, null, req.body, null, req.ip);
    await conn.commit();
    res.status(201).json({ success: true, id: orderId, code });
  } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); } finally { conn.release(); }
});

router.get('/', auth, async (req, res) => {
  const data = await Order.getAll(); res.json({ success: true, data });
});

router.post('/:id/approve', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const order = await Order.findById(req.params.id);
    if (!order) throw new Error('Không tìm thấy đơn');
    if (order.status !== 'draft') throw new Error('Đơn đã duyệt rồi');
    const items = await Order.getItems(order.id);
    
    // Duyệt đơn -> Tự động xuất/nhập kho
    for (let it of items) {
      const type = order.type === 'sale' ? 'out' : 'in';
      const signed = type === 'out' ? -Math.abs(it.qty) : Math.abs(it.qty);
      await conn.query(`INSERT INTO stock_ledger (item_id, type, qty, signed_qty, ref_type, ref_id, created_by) VALUES (?, ?, ?, ?, 'order', ?, ?)`, 
        [it.item_id, type, it.qty, signed, order.id, req.user.id]);
    }
    await Order.approve(order.id, req.user.id);
    await logAudit(req.user.id, 'APPROVE', 'orders', order.id, order, null, 'Duyệt & Xuất kho', req.ip);
    await conn.commit();
    res.json({ success: true, message: 'Duyệt đơn và cập nhật kho thành công' });
  } catch (err) { await conn.rollback(); res.status(500).json({ error: err.message }); } finally { conn.release(); }
});

module.exports = router;
