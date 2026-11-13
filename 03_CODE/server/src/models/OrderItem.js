
const { pool } = require('../config/db');
const Order = require('./Order');

// ============================================================
// HELPERS
// ============================================================

function badRequest(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  err.statusCode = status;
  return err;
}

function validId(value, field = 'id') {
  const n = Number(value);

  if (
    value === null ||
    value === undefined ||
    value === '' ||
    !Number.isSafeInteger(n) ||
    n <= 0
  ) {
    throw badRequest(`${field} phải là số nguyên dương`);
  }

  return n;
}

function validQty(value) {
  const n = Number(value);

  if (
    value === null ||
    value === undefined ||
    value === '' ||
    !Number.isFinite(n) ||
    n <= 0 ||
    !Number.isInteger(n * 1000)
  ) {
    throw badRequest(
      'Số lượng phải > 0 và có tối đa 3 chữ số thập phân'
    );
  }

  return n;
}

function validPrice(value) {
  const n = Number(value);

  if (
    value === null ||
    value === undefined ||
    value === '' ||
    !Number.isSafeInteger(n) ||
    n < 0
  ) {
    throw badRequest(
      'Đơn giá phải là số nguyên không âm'
    );
  }

  return n;
}

function calculateAmount(qty, price) {
  const amount = Math.round(qty * price);

  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw badRequest('Thành tiền không hợp lệ');
  }

  return amount;
}

// ============================================================
// TRANSACTION HELPER
// Nếu route đã truyền conn: dùng transaction của route.
// Nếu không: tự mở transaction và commit/rollback.
// ============================================================

async function withTransaction(conn, callback) {
  if (conn) {
    return callback(conn);
  }

  const db = await pool.getConnection();

  try {
    await db.beginTransaction();

    const result = await callback(db);

    await db.commit();
    return result;
  } catch (err) {
    try {
      await db.rollback();
    } catch (rollbackErr) {
      console.error(
        '[OrderItem] Rollback error:',
        rollbackErr.message
      );
    }

    throw err;
  } finally {
    db.release();
  }
}

// ============================================================
// VALIDATE ITEM THEO LOẠI ĐƠN
// ============================================================

async function validateItemForOrder(itemId, orderType, db) {
  const id = validId(itemId, 'item_id');

  const [rows] = await db.query(
    'SELECT id, type, name FROM items WHERE id = ?',
    [id]
  );

  if (!rows.length) {
    throw badRequest(
      `Không tìm thấy hàng hóa id=${id}`,
      404
    );
  }

  const item = rows[0];

  if (orderType === 'sale' && item.type !== 'product') {
    throw badRequest(
      `Đơn bán chỉ được chọn thành phẩm. "${item.name}" không phải thành phẩm`
    );
  }

  if (orderType === 'purchase' && item.type !== 'material') {
    throw badRequest(
      `Đơn mua chỉ được chọn vật tư. "${item.name}" không phải vật tư`
    );
  }

  return item;
}

// ============================================================
// LOCK ORDER
// Khóa đơn trước khi thêm/sửa/xóa chi tiết.
// Giúp tuần tự hóa các thay đổi trên cùng một đơn.
// ============================================================

async function lockEditableOrder(orderId, db) {
  const id = validId(orderId, 'order_id');

  const [rows] = await db.query(
    'SELECT id, type, status FROM orders WHERE id = ? FOR UPDATE',
    [id]
  );

  if (!rows.length) {
    throw badRequest(
      `Không tìm thấy đơn hàng id=${id}`,
      404
    );
  }

  const order = rows[0];

  if (order.status !== 'draft') {
    throw badRequest(
      `Không thể sửa sản phẩm khi đơn ở trạng thái "${order.status}". Chỉ được sửa đơn draft`,
      409
    );
  }

  return order;
}

// ============================================================
// GET ITEM BY ID - HỖ TRỢ TRANSACTION
// ============================================================

async function getItemById(id, db = pool) {
  const itemId = validId(id, 'id');

  const [rows] = await db.query(`
    SELECT
      oi.*,
      i.code AS item_code,
      i.name AS item_name,
      i.unit
    FROM order_items oi
    LEFT JOIN items i ON i.id = oi.item_id
    WHERE oi.id = ?
  `, [itemId]);

  return rows[0] || null;
}

// ============================================================
// ORDER ITEM MODEL
// ============================================================

class OrderItem {

  // ==========================================================
  // GET ALL
  // ==========================================================

  static async findAll({
    order_id,
    item_id,
    limit = 200,
    offset = 0
  } = {}) {
    let sql = `
      SELECT
        oi.*,
        i.code AS item_code,
        i.name AS item_name,
        i.unit,
        o.code AS order_code
      FROM order_items oi
      LEFT JOIN items i ON i.id = oi.item_id
      JOIN orders o ON o.id = oi.order_id
      WHERE 1=1
    `;

    const params = [];

    if (order_id !== undefined && order_id !== '') {
      sql += ' AND oi.order_id = ?';
      params.push(validId(order_id, 'order_id'));
    }

    if (item_id !== undefined && item_id !== '') {
      sql += ' AND oi.item_id = ?';
      params.push(validId(item_id, 'item_id'));
    }

    const safeLimit = Math.min(
      500,
      Math.max(1, Number(limit) || 200)
    );

    const safeOffset = Math.max(
      0,
      Number(offset) || 0
    );

    if (
      !Number.isSafeInteger(safeLimit) ||
      !Number.isSafeInteger(safeOffset)
    ) {
      throw badRequest('limit hoặc offset không hợp lệ');
    }

    sql += ' ORDER BY oi.id DESC LIMIT ? OFFSET ?';

    params.push(safeLimit, safeOffset);

    const [rows] = await pool.query(sql, params);

    return rows;
  }

  // ==========================================================
  // FIND BY ID
  // ==========================================================

  static async findById(id, conn = null) {
    return getItemById(id, conn || pool);
  }

  // ==========================================================
  // CREATE
  // ==========================================================

  static async create(data, conn = null) {
    if (!data || typeof data !== 'object') {
      throw badRequest('Dữ liệu không hợp lệ');
    }

    const orderId = validId(data.order_id, 'order_id');
    const itemId = validId(data.item_id, 'item_id');
    const qty = validQty(data.qty);
    const unitPrice = validPrice(data.unit_price);

    return withTransaction(conn, async (db) => {
      // 1. Khóa đơn và kiểm tra trạng thái
      const order = await lockEditableOrder(orderId, db);

      // 2. Kiểm tra loại sản phẩm
      await validateItemForOrder(
        itemId,
        order.type,
        db
      );

      // 3. Delegate sang Order.addItem.
      // Hàm này INSERT + recalcTotal trong cùng conn.
      // Order.addItem phải trả về insertId.
      const insertedId = await Order.addItem(
        orderId,
        {
          item_id: itemId,
          qty,
          unit_price: unitPrice
        },
        db
      );

      // Không dùng ORDER BY id DESC để tìm dòng mới.
      // Dùng chính xác ID từ INSERT.
      const created = await getItemById(
        insertedId,
        db
      );

      if (!created) {
        throw new Error(
          'Đã INSERT nhưng không tìm thấy chi tiết đơn vừa tạo'
        );
      }

      return created;
    });
  }

  // ==========================================================
  // UPDATE
  // ==========================================================

  static async update(id, data, conn = null) {
    const rowId = validId(id, 'id');

    if (!data || typeof data !== 'object') {
      throw badRequest('Dữ liệu cập nhật không hợp lệ');
    }

    return withTransaction(conn, async (db) => {
      // Lấy order_id trước để khóa parent order.
      const [lookup] = await db.query(
        'SELECT order_id FROM order_items WHERE id = ?',
        [rowId]
      );

      if (!lookup.length) {
        return false;
      }

      const orderId = lookup[0].order_id;

      // Khóa parent trước, sau đó khóa item.
      const order = await lockEditableOrder(
        orderId,
        db
      );

      const [rows] = await db.query(
        'SELECT * FROM order_items WHERE id = ? FOR UPDATE',
        [rowId]
      );

      if (!rows.length) {
        return false;
      }

      const existing = rows[0];

      // Không cho chuyển item sang đơn khác.
      if (
        data.order_id !== undefined &&
        validId(data.order_id, 'order_id') !==
          Number(existing.order_id)
      ) {
        throw badRequest(
          'Không được chuyển chi tiết sang đơn khác'
        );
      }

      const itemId =
        data.item_id !== undefined
          ? validId(data.item_id, 'item_id')
          : existing.item_id;

      const qty =
        data.qty !== undefined
          ? validQty(data.qty)
          : validQty(existing.qty);

      const unitPrice =
        data.unit_price !== undefined
          ? validPrice(data.unit_price)
          : validPrice(existing.unit_price);

      await validateItemForOrder(
        itemId,
        order.type,
        db
      );

      const amount = calculateAmount(
        qty,
        unitPrice
      );

      const [result] = await db.query(`
        UPDATE order_items
        SET item_id = ?,
            qty = ?,
            unit_price = ?,
            amount = ?
        WHERE id = ?
      `, [
        itemId,
        qty,
        unitPrice,
        amount,
        rowId
      ]);

      await Order.recalcTotal(
        orderId,
        db
      );

      return result.affectedRows > 0;
    });
  }

  // ==========================================================
  // REMOVE
  // ==========================================================

  static async remove(id, conn = null) {
    const rowId = validId(id, 'id');

    return withTransaction(conn, async (db) => {
      const [lookup] = await db.query(
        'SELECT order_id FROM order_items WHERE id = ?',
        [rowId]
      );

      if (!lookup.length) {
        return false;
      }

      const orderId = lookup[0].order_id;

      // Chỉ cho phép xóa chi tiết của đơn draft.
      await lockEditableOrder(orderId, db);

      const [result] = await db.query(
        'DELETE FROM order_items WHERE id = ?',
        [rowId]
      );

      if (!result.affectedRows) {
        return false;
      }

      await Order.recalcTotal(
        orderId,
        db
      );

      return true;
    });
  }
}

module.exports = OrderItem;
