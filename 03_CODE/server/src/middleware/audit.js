const { pool } = require('../config/db');

const logAudit = async (userId, action, resource, refId, beforeData, afterData, note = null, ip = null) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, resource, ref_id, before_data, after_data, note, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, action, resource, refId, beforeData ? JSON.stringify(beforeData) : null, afterData ? JSON.stringify(afterData) : null, note, ip]
    );
  } catch (err) {
    console.error('Lỗi ghi Audit Log:', err.message);
  }
};

module.exports = { logAudit };
