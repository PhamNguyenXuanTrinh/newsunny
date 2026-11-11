const { pool } = require('../config/db');

module.exports = {
  getAll: async (type = null) => {
    let sql = 'SELECT * FROM partners';
    let params = [];
    if (type) { sql += ' WHERE type = ?'; params.push(type); }
    const [rows] = await pool.query(sql + ' ORDER BY id DESC', params);
    return rows;
  },
  findById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM partners WHERE id = ?', [id]);
    return rows[0];
  },
  create: async (d) => {
    const sql = `INSERT INTO partners (type, code, name, company_name, contact_person, phone, email, tax_code, address, category, bank_account, bank_name, credit_limit, payment_term, owner_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const [res] = await pool.query(sql, [d.type, d.code, d.name, d.company_name||null, d.contact_person||null, d.phone||null, d.email||null, d.tax_code||null, d.address||null, d.category||null, d.bank_account||null, d.bank_name||null, d.credit_limit||0, d.payment_term||0, d.owner_id||null]);
    return res.insertId;
  },
  update: async (id, d) => {
    const sql = `UPDATE partners SET type=?, code=?, name=?, company_name=?, contact_person=?, phone=?, email=?, tax_code=?, address=?, category=?, bank_account=?, bank_name=?, credit_limit=?, payment_term=?, is_active=? WHERE id=?`;
    await pool.query(sql, [d.type, d.code, d.name, d.company_name||null, d.contact_person||null, d.phone||null, d.email||null, d.tax_code||null, d.address||null, d.category||null, d.bank_account||null, d.bank_name||null, d.credit_limit||0, d.payment_term||0, d.is_active, id]);
  },
  delete: async (id) => {
    await pool.query('UPDATE partners SET is_active = FALSE WHERE id = ?', [id]);
  }
};
