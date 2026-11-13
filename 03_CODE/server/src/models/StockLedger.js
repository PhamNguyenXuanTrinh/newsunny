const { pool } = require('../config/db');

module.exports = {
  // Lấy toàn bộ lịch sử kho
  getAll: async () => {
    const [r] = await pool.query('SELECT * FROM stock_ledger ORDER BY id DESC');
    return r;
  },

  // Lấy tồn kho hiện tại của 1 item (tính động từ SUM(signed_qty))
  getBalance: async (itemId) => {
    const [rows] = await pool.query(
      'SELECT COALESCE(SUM(signed_qty), 0) AS stock FROM stock_ledger WHERE item_id = ?',
      [itemId]
    );
    return Number(rows[0].stock);
  },

  // Lịch sử kho của 1 item (dùng khi cần xem chi tiết)
  findByItem: async (itemId, limit = 100) => {
    const [rows] = await pool.query(
      'SELECT * FROM stock_ledger WHERE item_id = ? ORDER BY id DESC LIMIT ?',
      [itemId, Number(limit)]
    );
    return rows;
  },

  // Lấy 1 dòng stock_ledger
  findById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM stock_ledger WHERE id = ?', [id]);
    return rows[0] || null;
  },

  // Tạo bút toán kho
  // ✅ ĐÃ SỬA: Bỏ hoàn toàn query SELECT stock_quantity (cột không tồn tại)
  // ✅ ĐÃ THÊM: Validate + ghi đủ các cột batch_no, note
  // ✅ ĐÃ THÊM: Tham số conn để có thể truyền transaction từ route
  create: async (d, conn = null) => {
    const exec = conn || pool;

    // Validate bắt buộc
    if (!d.item_id) throw new Error('Thiếu item_id');
    if (!['in', 'out', 'adjust'].includes(d.type)) {
      throw new Error("type phải là 'in', 'out' hoặc 'adjust'");
    }
    if (Number(d.qty) <= 0) throw new Error('Số lượng (qty) phải > 0');

    // Kiểm tra item có tồn tại (chỉ SELECT id, không query cột stock_quantity)
    const [item] = await exec.query('SELECT id FROM items WHERE id = ?', [d.item_id]);
    if (item.length === 0) throw new Error(`Không tìm thấy mặt hàng id=${d.item_id}`);

    // Tự tính signed_qty nếu chưa truyền
    let signed = d.signed_qty;
    if (signed === undefined || signed === null) {
      signed = d.type === 'out' ? -Math.abs(d.qty) : Math.abs(d.qty);
    }

    const sql = `
      INSERT INTO stock_ledger 
        (item_id, type, qty, signed_qty, unit_cost, batch_no, ref_type, ref_id, note, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await exec.query(sql, [
      d.item_id,
      d.type,
      d.qty,
      signed,
      d.unit_cost || 0,
      d.batch_no || null,
      d.ref_type || 'manual',
      d.ref_id || null,
      d.note || null,
      d.created_by || null
    ]);
  }
};