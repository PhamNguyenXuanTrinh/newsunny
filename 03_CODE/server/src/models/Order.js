
const { pool } = require('../config/db');

const DEFAULT_TAX_RATE = 0.10;
const VALID_ORDER_TYPES = ['sale', 'purchase'];
const VALID_STATUSES = [
  'draft', 'pending', 'approved',
  'delivered', 'done', 'cancelled'
];

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  err.statusCode = 400;
  return err;
}

function positiveId(value, field) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw badRequest(`${field} phải là số nguyên dương`);
  }
  return n;
}

function money(value, field, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) {
    throw badRequest(`${field} phải là số nguyên không âm`);
  }
  return n;
}

function quantity(value) {
  const n = Number(value);
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    !Number.isFinite(n) ||
    n <= 0 ||
    Math.round(n * 1000) !== n * 1000
  ) {
    throw badRequest('qty phải > 0 và có tối đa 3 chữ số thập phân');
  }
  return n;
}

function executor(conn) {
  return conn || pool;
}

async function findById(id, conn = null) {
  const [rows] = await executor(conn).query(
    'SELECT * FROM orders WHERE id = ?',
    [positiveId(id, 'orderId')]
  );
  return rows[0] || null;
}

async function getItems(orderId, conn = null) {
  const [rows] = await executor(conn).query(`
    SELECT oi.*, i.code AS item_code,
           i.name AS item_name, i.unit
    FROM order_items oi
    JOIN items i ON i.id = oi.item_id
    WHERE oi.order_id = ?
    ORDER BY oi.id
  `, [positiveId(orderId, 'orderId')]);

  return rows;
}

async function recalcTotal(orderId, conn = null) {
  const id = positiveId(orderId, 'orderId');
  const exec = executor(conn);

  // Khi không có transaction bên ngoài,
  // tự tạo transaction để tránh cập nhật nửa chừng.
  const ownConn = !conn;
  const db = ownConn ? await pool.getConnection() : exec;

  try {
    if (ownConn) await db.beginTransaction();

    const [orders] = await db.query(`
      SELECT discount, tax_amount, shipping_fee,
             sub_total, paid_amount
      FROM orders
      WHERE id = ?
      FOR UPDATE
    `, [id]);

    if (!orders.length) {
      throw badRequest(`Không tìm thấy đơn id=${id}`);
    }

    const order = orders[0];

    const [sums] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS subtotal
      FROM order_items
      WHERE order_id = ?
    `, [id]);

    const subTotal = money(sums[0].subtotal, 'sub_total');
    const discount = money(order.discount, 'discount');
    const shipping = money(order.shipping_fee, 'shipping_fee');
    const previousTax = money(order.tax_amount, 'tax_amount');
    const previousSubTotal = money(order.sub_total, 'sub_total');

    // Schema chưa có tax_mode/tax_rate.
    // Quy ước tương thích tạm thời:
    // - Thuế 0: tự tính VAT mặc định.
    // - Thuế cũ bằng VAT mặc định của subtotal cũ:
    //   tiếp tục tính tự động.
    // - Thuế khác: giữ nguyên như giá trị nhập tay.
    //
    // Lưu ý: quy ước này không phân biệt được
    // VAT 0% chủ động với VAT chưa được nhập.
    const oldAutoTax = Math.round(
      previousSubTotal * DEFAULT_TAX_RATE
    );

    let taxAmount = previousTax;

    if (previousTax === 0 || previousTax === oldAutoTax) {
      taxAmount = Math.round(
        subTotal * DEFAULT_TAX_RATE
      );
    }

    if (discount > subTotal) {
      throw badRequest(
        'Giảm giá không được lớn hơn tiền hàng'
      );
    }

    const total =
      subTotal - discount + taxAmount + shipping;

    if (!Number.isSafeInteger(total) || total < 0) {
      throw badRequest('Tổng tiền không hợp lệ');
    }

    const paidAmount = money(
      order.paid_amount, 'paid_amount'
    );

    // Không tự giảm tiền đã thu.
    // Nếu sửa đơn khiến tiền đã thu vượt tổng,
    // phải xử lý hoàn tiền riêng.
    if (paidAmount > total) {
      throw badRequest(
        'Tổng tiền mới nhỏ hơn số tiền đã thanh toán'
      );
    }

    const paymentStatus =
      paidAmount === 0 ? 'unpaid' :
      paidAmount >= total ? 'paid' : 'partial';

    await db.query(`
      UPDATE orders
      SET sub_total = ?,
          tax_amount = ?,
          total = ?,
          payment_status = ?
      WHERE id = ?
    `, [
      subTotal,
      taxAmount,
      total,
      paymentStatus,
      id
    ]);

    if (ownConn) await db.commit();

    return {
      sub_total: subTotal,
      discount,
      tax_amount: taxAmount,
      shipping_fee: shipping,
      total,
      paid_amount: paidAmount,
      payment_status: paymentStatus
    };
  } catch (err) {
    if (ownConn) await db.rollback();
    throw err;
  } finally {
    if (ownConn) db.release();
  }
}

async function create(d, conn = null) {
  if (!d || typeof d !== 'object') {
    throw badRequest('Dữ liệu đơn hàng không hợp lệ');
  }

  if (!VALID_ORDER_TYPES.includes(d.type)) {
    throw badRequest('type phải là sale hoặc purchase');
  }

  if (typeof d.code !== 'string' || !d.code.trim()) {
    throw badRequest('Thiếu mã đơn hàng');
  }

  if (d.code.trim().length > 50) {
    throw badRequest('Mã đơn hàng tối đa 50 ký tự');
  }

  const partnerId = positiveId(d.partner_id, 'partner_id');
  const discount = money(d.discount, 'discount');
  const taxAmount = money(d.tax_amount, 'tax_amount');
  const shippingFee = money(d.shipping_fee, 'shipping_fee');

  if (
    d.require_full_payment !== undefined &&
    typeof d.require_full_payment !== 'boolean'
  ) {
    throw badRequest('require_full_payment phải là boolean');
  }

  const createdBy =
    d.created_by == null
      ? null
      : positiveId(d.created_by, 'created_by');

  const [result] = await executor(conn).query(`
    INSERT INTO orders (
      type, code, partner_id,
      sub_total, discount, tax_amount,
      shipping_fee, total,
      require_full_payment,
      delivery_address, due_date,
      note, created_by
    )
    VALUES (?, ?, ?, 0, ?, ?, ?, 0, ?, ?, ?, ?, ?)
  `, [
    d.type,
    d.code.trim(),
    partnerId,
    discount,
    taxAmount,
    shippingFee,
    d.require_full_payment === undefined
      ? true
      : d.require_full_payment,
    d.delivery_address || null,
    d.due_date || null,
    d.note || null,
    createdBy
  ]);

  return result.insertId;
}

async function addItem(orderId, item, conn = null) {
  const id = positiveId(orderId, 'orderId');

  if (!item || typeof item !== 'object') {
    throw badRequest('Thiếu dữ liệu sản phẩm');
  }

  const itemId = positiveId(item.item_id, 'item_id');
  const qty = quantity(item.qty);
  const price = money(item.unit_price, 'unit_price');

  const amount = Math.round(qty * price);

  if (!Number.isSafeInteger(amount)) {
    throw badRequest('Thành tiền vượt giới hạn');
  }

  // Nếu không truyền conn, tạo transaction riêng.
  const ownConn = !conn;
  const db = ownConn ? await pool.getConnection() : conn;

  try {
    if (ownConn) await db.beginTransaction();

    const [orders] = await db.query(
      'SELECT id, status FROM orders WHERE id = ? FOR UPDATE',
      [id]
    );

    if (!orders.length) {
      throw badRequest('Không tìm thấy đơn hàng');
    }

    if (orders[0].status !== 'draft') {
      throw badRequest(
        'Chỉ được thêm sản phẩm khi đơn ở trạng thái draft'
      );
    }

    const [items] = await db.query(
      'SELECT id FROM items WHERE id = ?',
      [itemId]
    );

    if (!items.length) {
      throw badRequest('Sản phẩm không tồn tại');
    }

    const [result] = await db.query(`
      INSERT INTO order_items
        (order_id, item_id, qty, unit_price, amount)
      VALUES (?, ?, ?, ?, ?)
    `, [id, itemId, qty, price, amount]);

    await recalcTotal(id, db);

    if (ownConn) await db.commit();

    return result.insertId;
  } catch (err) {
    if (ownConn) await db.rollback();
    throw err;
  } finally {
    if (ownConn) db.release();
  }
}

async function approve(id, approvedBy, conn = null) {
  const orderId = positiveId(id, 'orderId');
  const userId = positiveId(approvedBy, 'approvedBy');
  const exec = executor(conn);

  const [result] = await exec.query(`
    UPDATE orders
    SET status = 'approved',
        approved_by = ?
    WHERE id = ?
      AND status = 'draft'
      AND total > 0
      AND (
        require_full_payment = 0
        OR paid_amount >= total
      )
  `, [userId, orderId]);

  // Trả về kết quả để route phân biệt duyệt
  // thành công với đơn không đủ điều kiện.
  return result.affectedRows > 0;
}

async function updateStatus(id, status, conn = null) {
  if (!VALID_STATUSES.includes(status)) {
    throw badRequest(`status không hợp lệ: ${status}`);
  }

  const [result] = await executor(conn).query(
    'UPDATE orders SET status = ? WHERE id = ?',
    [status, positiveId(id, 'orderId')]
  );

  return result.affectedRows > 0;
}

async function cancel(id, note = null, conn = null) {
  const orderId = positiveId(id, 'orderId');
  const exec = executor(conn);

  const [result] = await exec.query(`
    UPDATE orders
    SET status = 'cancelled',
        note = COALESCE(?, note)
    WHERE id = ?
      AND status IN ('draft', 'pending')
  `, [note, orderId]);

  return result.affectedRows > 0;
}

async function getAll(filters = {}) {
  let sql = `
    SELECT o.*, p.name AS partner_name,
           u.full_name AS creator_name
    FROM orders o
    LEFT JOIN partners p ON p.id = o.partner_id
    LEFT JOIN users u ON u.id = o.created_by
    WHERE 1=1
  `;

  const params = [];

  if (filters.type) {
    if (!VALID_ORDER_TYPES.includes(filters.type)) {
      throw badRequest('Loại đơn không hợp lệ');
    }
    sql += ' AND o.type = ?';
    params.push(filters.type);
  }

  if (filters.status) {
    sql += ' AND o.status = ?';
    params.push(filters.status);
  }

  if (filters.partner_id) {
    sql += ' AND o.partner_id = ?';
    params.push(
      positiveId(filters.partner_id, 'partner_id')
    );
  }

  if (filters.payment_status) {
    sql += ' AND o.payment_status = ?';
    params.push(filters.payment_status);
  }

  if (filters.keyword) {
    sql += ' AND o.code LIKE ?';
    params.push(`%${filters.keyword}%`);
  }

  sql += ' ORDER BY o.id DESC';

  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = {
  getAll,
  findById,
  getItems,
  create,
  addItem,
  recalcTotal,
  approve,
  updateStatus,
  cancel
};
