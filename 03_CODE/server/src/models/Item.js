const { pool } = require('../config/db');

module.exports = {
  getAll: async (type = null) => {
    let sql = 'SELECT * FROM items';
    let params = [];
    if (type) { sql += ' WHERE type = ?'; params.push(type); }
    const [rows] = await pool.query(sql + ' ORDER BY id DESC', params);
    return rows;
  },
  findById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM items WHERE id = ?', [id]);
    return rows[0];
  },
  create: async (d) => {
    const sql = `INSERT INTO items (type, code, barcode, name, unit, price_in, price_out, price_floor, min_stock, max_stock, spec_thickness, spec_width, spec_length, weight, location) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const [res] = await pool.query(sql, [d.type, d.code, d.barcode||null, d.name, d.unit, d.price_in||0, d.price_out||0, d.price_floor||0, d.min_stock||0, d.max_stock||0, d.spec_thickness||null, d.spec_width||null, d.spec_length||null, d.weight||null, d.location||null]);
    return res.insertId;
  },
  update: async (id, d) => {
    const sql = `UPDATE items SET type=?, code=?, barcode=?, name=?, unit=?, price_in=?, price_out=?, price_floor=?, min_stock=?, max_stock=?, spec_thickness=?, spec_width=?, spec_length=?, weight=?, location=?, is_active=? WHERE id=?`;
    await pool.query(sql, [d.type, d.code, d.barcode||null, d.name, d.unit, d.price_in||0, d.price_out||0, d.price_floor||0, d.min_stock||0, d.max_stock||0, d.spec_thickness||null, d.spec_width||null, d.spec_length||null, d.weight||null, d.location||null, d.is_active, id]);
  },
  delete: async (id) => {
    await pool.query('UPDATE items SET is_active = FALSE WHERE id = ?', [id]);
  }
};
