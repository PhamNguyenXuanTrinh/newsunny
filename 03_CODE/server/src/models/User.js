const { pool } = require('../config/db');

module.exports = {
  findByUsername: async (username) => {
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ? AND status = 'active'", [username]);
    return rows[0];
  },
  findById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  },
  getAll: async () => {
    const [rows] = await pool.query('SELECT id, username, full_name, role, status, team_id, phone, salary_base FROM users');
    return rows;
  },
  create: async (d) => {
    const sql = `
      INSERT INTO users (
        username, password_hash, role, status, full_name, dob, gender, cccd, cccd_date, cccd_place, 
        phone, email, permanent_address, current_address, emergency_contact, team_id, position, 
        join_date, contract_type, salary_base, bank_account, bank_name, tax_code, bhxh_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      d.username, d.password_hash, d.role, d.status || 'active', d.full_name, d.dob || null, d.gender || null, 
      d.cccd || null, d.cccd_date || null, d.cccd_place || null, d.phone || null, d.email || null, 
      d.permanent_address || null, d.current_address || null, d.emergency_contact || null, 
      d.team_id || null, d.position || null, d.join_date || null, d.contract_type || null, 
      d.salary_base || 0, d.bank_account || null, d.bank_name || null, d.tax_code || null, d.bxh_code || null
    ];
    const [result] = await pool.query(sql, values);
    return result.insertId;
  },
  countAll: async () => {
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM users');
    return rows[0].count;
  },
  update: async (id, d) => {
    const sql = `
      UPDATE users SET 
        role = ?, status = ?, full_name = ?, dob = ?, gender = ?, cccd = ?, cccd_date = ?, cccd_place = ?, 
        phone = ?, email = ?, permanent_address = ?, current_address = ?, emergency_contact = ?, 
        team_id = ?, position = ?, join_date = ?, contract_type = ?, salary_base = ?, 
        bank_account = ?, bank_name = ?, tax_code = ?, bhxh_code = ?
      WHERE id = ?
    `;
    const values = [
      d.role, d.status, d.full_name, d.dob || null, d.gender || null, d.cccd || null, d.cccd_date || null, d.cccd_place || null, 
      d.phone || null, d.email || null, d.permanent_address || null, d.current_address || null, d.emergency_contact || null, 
      d.team_id || null, d.position || null, d.join_date || null, d.contract_type || null, d.salary_base || 0, 
      d.bank_account || null, d.bank_name || null, d.tax_code || null, d.bhxh_code || null, id
    ];
    await pool.query(sql, values);
  },
  // Hàm xóa mềm (Đổi trạng thái)
  changeStatus: async (id, status) => {
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
  },
  // Hàm đổi mật khẩu
  updatePassword: async (id, hash) => {
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
  }
};
