const express = require('express'); const router = express.Router();
const { pool } = require('../config/db'); const Order = require('../models/Order'); const StockLedger = require('../models/StockLedger');
const auth = require('../middleware/auth'); const { logAudit } = require('../middleware/audit');

async function checkStock(itemId, qtyNeeded) {
  const [rows] = await pool.query('SELECT COALESCE(SUM(signed_qty), 0) as stock FROM stock_ledger WHERE item_id = ?', [itemId]);
  return Number(rows[0].stock) >= Number(qtyNeeded);
}

router.post('/', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let item of req.body.items) {
      if (Number(item.qty) <= 0 || Number(item.unit_price) < 0) throw new Error('Số lượng/Đơn giá không hợp lệ (Không được âm)');
    }
    const code = req.body.code || `DH${Date.now()}`;
    const orderId = await Order.create({ ...req.body, code, created_by: req.user.id });
    for (let item of req.body.items) { await Order.addItem(orderId, item); }
    await logAudit(req.user.id, 'CREATE', 'orders', orderId, null, req.body, null, req.ip);
    await conn.commit();
    res.status(201).json({ success: true, id: orderId, code });
  } catch (err) { await conn.rollback(); res.status(400).json({ error: err.message }); } finally { conn.release(); }
});

router.get('/', auth, async (req, res) => {
  const data = await Order.getAll(); res.json({ success: true, data });
});

router.post('/:id/payments', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { amount, method, note } = req.body;
    const orderId = req.params.id;

    if (Number(amount) <= 0) throw new Error('Số tiền thanh toán phải > 0');
    const [order] = await conn.query('SELECT total, paid_amount FROM orders WHERE id = ?', [orderId]);
    const remaining = Number(order[0].total) - Number(order[0].paid_amount);
    if (Number(amount) > remaining) throw new Error(`Số tiền thu (${Number(amount).toLocaleString()} đ) vượt quá số nợ còn lại (${remaining.toLocaleString()} đ)`);

    await conn.query('INSERT INTO payments (order_id, amount, method, note, created_by) VALUES (?, ?, ?, ?, ?)', [orderId, amount, method || 'transfer', note, req.user.id]);
    const newPaid = Number(order[0].paid_amount) + Number(amount);
    let newStatus = newPaid >= order[0].total ? 'paid' : (newPaid > 0 ? 'partial' : 'unpaid');

    await conn.query('UPDATE orders SET paid_amount = ?, payment_status = ? WHERE id = ?', [newPaid, newStatus, orderId]);
    await logAudit(req.user.id, 'PAYMENT', 'orders', orderId, order[0], { paid: newPaid }, null, req.ip);
    await conn.commit();
    res.json({ success: true, message: 'Đã ghi nhận thanh toán', paid_amount: newPaid, status: newStatus });
  } catch (err) { await conn.rollback(); res.status(400).json({ error: err.message }); } finally { conn.release(); }
});

router.post('/:id/approve', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const order = await Order.findById(req.params.id);
    if (!order) throw new Error('Không tìm thấy đơn');
    if (order.status !== 'draft') throw new Error('Đơn đã duyệt rồi');

    if (order.type === 'sale') {
      // Kiểm tra hạn mức công nợ
      const [partner] = await conn.query('SELECT credit_limit FROM partners WHERE id = ?', [order.partner_id]);
      const creditLimit = Number(partner[0]?.credit_limit || 0);
      
      if (creditLimit > 0) {
        const [debts] = await conn.query(`SELECT SUM(total - paid_amount) as total_debt FROM orders WHERE partner_id = ? AND type = 'sale' AND status IN ('approved', 'delivered', 'done') AND payment_status != 'paid'`, [order.partner_id]);
        const currentDebt = Number(debts[0].total_debt || 0);
        const newDebt = currentDebt + (Number(order.total) - Number(order.paid_amount));
        if (newDebt > creditLimit) {
          throw new Error(`Vượt hạn mức công nợ! Khách đang nợ ${currentDebt.toLocaleString()} đ. Đơn này ${(Number(order.total) - Number(order.paid_amount)).toLocaleString()} đ. Hạn mức: ${creditLimit.toLocaleString()} đ.`);
        }
      }
    }

    const items = await Order.getItems(order.id);
    for (let it of items) {
      if (order.type === 'sale') {
        const isEnough = await checkStock(it.item_id, it.qty);
        if (!isEnough) throw new Error(`Mặt hàng ID ${it.item_id} không đủ tồn kho để xuất!`);
      }
      const type = order.type === 'sale' ? 'out' : 'in';
      const signed = type === 'out' ? -Math.abs(it.qty) : Math.abs(it.qty);
      await conn.query(`INSERT INTO stock_ledger (item_id, type, qty, signed_qty, ref_type, ref_id, created_by) VALUES (?, ?, ?, ?, 'order', ?, ?)`, 
        [it.item_id, type, it.qty, signed, order.id, req.user.id]);
    }
    
    await Order.approve(order.id, req.user.id);
    await logAudit(req.user.id, 'APPROVE', 'orders', order.id, order, null, 'Duyệt & Xuất kho', req.ip);
    await conn.commit();
    res.json({ success: true, message: 'Duyệt đơn và cập nhật kho thành công' });
  } catch (err) { await conn.rollback(); res.status(400).json({ error: err.message }); } finally { conn.release(); }
});

module.exports = router;
