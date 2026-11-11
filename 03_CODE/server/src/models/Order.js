const { pool } = require('../config/db');
module.exports = {
  getAll: async () => { const [r] = await pool.query('SELECT * FROM orders ORDER BY id DESC'); return r; },
  findById: async (id) => { const [r] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]); return r[0]; },
  getItems: async (orderId) => { const [r] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]); return r; },
  create: async (d) => {
    const sql = `INSERT INTO orders (type, code, partner_id, sub_total, discount, tax_amount, shipping_fee, total, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const [res] = await pool.query(sql, [d.type, d.code, d.partner_id, d.sub_total||0, d.discount||0, d.tax_amount||0, d.shipping_fee||0, d.total||0, d.created_by]);
    return res.insertId;
  },
  addItem: async (orderId, item) => {
    const amount = item.qty * item.unit_price;
    await pool.query('INSERT INTO order_items (order_id, item_id, qty, unit_price, amount) VALUES (?, ?, ?, ?, ?)', [orderId, item.item_id, item.qty, item.unit_price, amount]);
    await pool.query('UPDATE orders SET sub_total = sub_total + ?, total = total + ? WHERE id = ?', [amount, amount, orderId]);
  },
  approve: async (id, approvedBy) => { await pool.query("UPDATE orders SET status = 'approved', approved_by = ? WHERE id = ?", [approvedBy, id]); }
};
