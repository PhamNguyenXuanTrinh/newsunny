const { pool } = require('../config/db');
module.exports = {
  getAll: async () => { const [r] = await pool.query('SELECT * FROM stock_ledger ORDER BY id DESC'); return r; },
  create: async (d) => {
    const [item] = await pool.query('SELECT stock_quantity FROM items WHERE id = ?', [d.item_id]); // Note: item table has no stock_quantity, we calculate from ledger
    const sql = `INSERT INTO stock_ledger (item_id, type, qty, signed_qty, unit_cost, ref_type, ref_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    await pool.query(sql, [d.item_id, d.type, d.qty, d.signed_qty, d.unit_cost||0, d.ref_type, d.ref_id, d.created_by]);
  }
};
