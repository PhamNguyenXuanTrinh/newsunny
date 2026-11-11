const { pool } = require("../config/db");
const Order = require("./Order");

class OrderItem {
  static async findAll({ order_id, item_id, limit = 200, offset = 0 } = {}) {
    let sql = `SELECT oi.*, i.item_code, i.item_name, i.unit, o.order_code
               FROM order_items oi
               JOIN items i ON i.id = oi.item_id
               JOIN orders o ON o.id = oi.order_id
               WHERE 1=1`;
    const params = [];
    if (order_id) { sql += " AND oi.order_id = ?"; params.push(order_id); }
    if (item_id)  { sql += " AND oi.item_id = ?";  params.push(item_id); }
    sql += " ORDER BY oi.id DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT oi.*, i.item_code, i.item_name
       FROM order_items oi
       JOIN items i ON i.id = oi.item_id
       WHERE oi.id = ?`, [id]
    );
    return rows[0] || null;
  }

  static async create(data) {
    const total = Number(data.quantity) * Number(data.unit_price);
    const [result] = await pool.query(
      `INSERT INTO order_items (order_id, item_id, quantity, unit_price, total_price, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.order_id, data.item_id, data.quantity, data.unit_price, total, data.notes || null]
    );
    await Order.recalcTotal(data.order_id);
    return result.insertId;
  }

  static async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) return false;
    const q = data.quantity !== undefined ? data.quantity : existing.quantity;
    const p = data.unit_price !== undefined ? data.unit_price : existing.unit_price;
    const total = Number(q) * Number(p);

    const fields = [];
    const params = [];
    if (data.quantity !== undefined)   { fields.push("quantity = ?");   params.push(data.quantity); }
    if (data.unit_price !== undefined) { fields.push("unit_price = ?"); params.push(data.unit_price); }
    if (data.notes !== undefined)      { fields.push("notes = ?");      params.push(data.notes); }
    fields.push("total_price = ?");    params.push(total);
    params.push(id);
    await pool.query(`UPDATE order_items SET ${fields.join(", ")} WHERE id = ?`, params);
    await Order.recalcTotal(existing.order_id);
    return true;
  }

  static async remove(id) {
    const existing = await this.findById(id);
    if (!existing) return false;
    await pool.query("DELETE FROM order_items WHERE id = ?", [id]);
    await Order.recalcTotal(existing.order_id);
    return true;
  }
}

module.exports = OrderItem;
