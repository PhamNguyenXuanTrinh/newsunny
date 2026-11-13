const express = require('express');
const router = express.Router();

const { pool } = require('../config/db');
const OrderItem = require('../models/OrderItem');

const auth = require('../middleware/auth');
const { allow } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

router.use(auth);

// ============================================================
// CONSTANTS
// ============================================================

const READ_ROLES = [
  'giam_doc',
  'ke_toan',
  'ctv'
];

const WRITE_ROLES = [
  'giam_doc',
  'ke_toan',
  'ctv'
];

// ============================================================
// RESPONSE HELPERS
// ============================================================

function fail(res, message, status = 400) {
  return res.status(status).json({
    success: false,
    error: message
  });
}

function getErrorStatus(err, fallback = 400) {
  const status = Number(
    err?.statusCode || err?.status
  );

  if (Number.isInteger(status) && status >= 400 && status <= 599) {
    return status;
  }

  return fallback;
}

// ============================================================
// VALIDATION HELPERS
// ============================================================

function parseId(value, field = 'id') {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    const err = new Error(`${field} không hợp lệ`);
    err.status = 400;
    throw err;
  }

  return id;
}

function requireRole(req, allowedRoles) {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    const role = req.user?.role || 'unknown';

    const err = new Error(
      `Vai trò "${role}" không có quyền thực hiện thao tác này`
    );

    err.status = 403;
    throw err;
  }
}

// ============================================================
// KIỂM TRA QUYỀN TRUY CẬP ORDER
//
// giam_doc : toàn quyền
// ke_toan  : toàn quyền order
// ctv      : chỉ order của partner do mình quản lý
// to_truong/cong_nhan: không truy cập order_items ở route này
// ============================================================

async function canAccessOrder(userId, role, orderId, exec = pool) {
  const id = parseId(orderId, 'order_id');

  if (['giam_doc', 'ke_toan'].includes(role)) {
    const [rows] = await exec.query(
      'SELECT id FROM orders WHERE id = ?',
      [id]
    );

    return rows.length > 0;
  }

  if (role !== 'ctv') {
    return false;
  }

  const [rows] = await exec.query(`
    SELECT
      o.id,
      p.owner_id
    FROM orders o
    JOIN partners p
      ON p.id = o.partner_id
    WHERE o.id = ?
    LIMIT 1
  `, [id]);

  if (!rows.length) {
    return false;
  }

  return Number(rows[0].owner_id) === Number(userId);
}

// ============================================================
// AUDIT HELPER
//
// Audit không được làm request nghiệp vụ thất bại sau khi
// transaction đã COMMIT thành công.
// ============================================================

async function safeAudit(...args) {
  try {
    await logAudit(...args);
  } catch (err) {
    console.error(
      '[ORDER_ITEMS][AUDIT ERROR]',
      err.message
    );
  }
}

// ============================================================
// GET /order-items
// ============================================================

router.get(
  '/',
  allow('orders'),
  async (req, res) => {
    try {
      requireRole(req, READ_ROLES);

      const filters = {
        ...req.query
      };

      // --------------------------------------------------------
      // CTV
      // --------------------------------------------------------
      if (req.user.role === 'ctv') {
        // Nếu client yêu cầu cụ thể một order
        if (
          filters.order_id !== undefined &&
          filters.order_id !== ''
        ) {
          const orderId = parseId(
            filters.order_id,
            'order_id'
          );

          const allowed = await canAccessOrder(
            req.user.id,
            req.user.role,
            orderId,
            pool
          );

          if (!allowed) {
            return fail(
              res,
              'Bạn không có quyền xem chi tiết của đơn hàng này',
              403
            );
          }

          const data = await OrderItem.findAll({
            ...filters,
            order_id: orderId
          });

          return res.json({
            success: true,
            data,
            count: data.length
          });
        }

        // Không truyền order_id:
        // query trực tiếp để tránh N+1 query.
        let sql = `
          SELECT
            oi.*,
            i.code AS item_code,
            i.name AS item_name,
            i.unit,
            o.code AS order_code
          FROM order_items oi
          JOIN items i
            ON i.id = oi.item_id
          JOIN orders o
            ON o.id = oi.order_id
          JOIN partners p
            ON p.id = o.partner_id
          WHERE p.owner_id = ?
        `;

        const params = [req.user.id];

        if (
          filters.item_id !== undefined &&
          filters.item_id !== ''
        ) {
          sql += ' AND oi.item_id = ?';

          params.push(
            parseId(filters.item_id, 'item_id')
          );
        }

        let limit = Number(filters.limit ?? 200);
        let offset = Number(filters.offset ?? 0);

        if (
          !Number.isSafeInteger(limit) ||
          limit <= 0
        ) {
          limit = 200;
        }

        if (limit > 500) {
          limit = 500;
        }

        if (
          !Number.isSafeInteger(offset) ||
          offset < 0
        ) {
          offset = 0;
        }

        sql += `
          ORDER BY oi.id DESC
          LIMIT ? OFFSET ?
        `;

        params.push(limit, offset);

        const [data] = await pool.query(
          sql,
          params
        );

        return res.json({
          success: true,
          data,
          count: data.length
        });
      }

      // --------------------------------------------------------
      // GIAM_DOC / KE_TOAN
      // --------------------------------------------------------

      const data = await OrderItem.findAll(filters);

      return res.json({
        success: true,
        data,
        count: data.length
      });

    } catch (err) {
      console.error(
        '[GET /order-items]',
        err
      );

      return fail(
        res,
        err.message || 'Không thể lấy danh sách chi tiết đơn hàng',
        getErrorStatus(err, 500)
      );
    }
  }
);

// ============================================================
// GET /order-items/:id
// ============================================================

router.get(
  '/:id',
  allow('orders'),
  async (req, res) => {
    try {
      requireRole(req, READ_ROLES);

      const id = parseId(
        req.params.id,
        'id'
      );

      const data = await OrderItem.findById(id);

      if (!data) {
        return fail(
          res,
          'Không tìm thấy dòng chi tiết',
          404
        );
      }

      const allowed = await canAccessOrder(
        req.user.id,
        req.user.role,
        data.order_id,
        pool
      );

      if (!allowed) {
        return fail(
          res,
          'Bạn không có quyền xem dòng chi tiết này',
          403
        );
      }

      return res.json({
        success: true,
        data
      });

    } catch (err) {
      console.error(
        '[GET /order-items/:id]',
        err
      );

      return fail(
        res,
        err.message || 'Không thể lấy chi tiết đơn hàng',
        getErrorStatus(err, 500)
      );
    }
  }
);

// ============================================================
// POST /order-items
// ============================================================

router.post(
  '/',
  allow('orders'),
  async (req, res) => {
    let conn = null;

    try {
      requireRole(req, WRITE_ROLES);

      if (!req.body || typeof req.body !== 'object') {
        return fail(
          res,
          'Dữ liệu gửi lên không hợp lệ',
          400
        );
      }

      const orderId = parseId(
        req.body.order_id,
        'order_id'
      );

      conn = await pool.getConnection();
      await conn.beginTransaction();

      // --------------------------------------------------------
      // Kiểm tra quyền trong chính transaction
      // --------------------------------------------------------

      const allowed = await canAccessOrder(
        req.user.id,
        req.user.role,
        orderId,
        conn
      );

      if (!allowed) {
        const err = new Error(
          'Bạn không có quyền thêm sản phẩm vào đơn hàng này'
        );

        err.status = 403;
        throw err;
      }

      // --------------------------------------------------------
      // CREATE
      // OrderItem.create sử dụng conn hiện tại,
      // không tự commit.
      // --------------------------------------------------------

      const created = await OrderItem.create(
        {
          order_id: orderId,
          item_id: req.body.item_id,
          qty: req.body.qty,
          unit_price: req.body.unit_price
        },
        conn
      );

      await conn.commit();

      // Transaction đã thành công.
      // Audit lỗi không được rollback nghiệp vụ.
      await safeAudit(
        req.user.id,
        'CREATE',
        'order_items',
        created.id,
        null,
        {
          order_id: created.order_id,
          item_id: created.item_id,
          qty: created.qty,
          unit_price: created.unit_price,
          amount: created.amount
        },
        null,
        req.ip
      );

      return res.status(201).json({
        success: true,
        data: created
      });

    } catch (err) {
      if (conn) {
        try {
          await conn.rollback();
        } catch (rollbackErr) {
          console.error(
            '[POST /order-items][ROLLBACK]',
            rollbackErr
          );
        }
      }

      console.error(
        '[POST /order-items]',
        err
      );

      return fail(
        res,
        err.message || 'Không thể thêm chi tiết đơn hàng',
        getErrorStatus(err)
      );

    } finally {
      if (conn) {
        conn.release();
      }
    }
  }
);

// ============================================================
// PUT /order-items/:id
//
// Chỉ cho route này thay đổi:
// - qty
// - unit_price
//
// Không cho client đổi:
// - order_id
// - item_id
// ============================================================

router.put(
  '/:id',
  allow('orders'),
  async (req, res) => {
    let conn = null;

    try {
      requireRole(req, WRITE_ROLES);

      const id = parseId(
        req.params.id,
        'id'
      );

      if (!req.body || typeof req.body !== 'object') {
        return fail(
          res,
          'Dữ liệu gửi lên không hợp lệ',
          400
        );
      }

      if (
        req.body.qty === undefined &&
        req.body.unit_price === undefined
      ) {
        return fail(
          res,
          'Cần gửi qty hoặc unit_price để cập nhật',
          400
        );
      }

      // Route này cố ý không cho đổi item/order.
      if (
        req.body.order_id !== undefined ||
        req.body.item_id !== undefined
      ) {
        return fail(
          res,
          'Không được thay đổi order_id hoặc item_id tại API này',
          400
        );
      }

      conn = await pool.getConnection();
      await conn.beginTransaction();

      // QUAN TRỌNG:
      // dùng conn thay vì pool để dữ liệu đọc và ghi
      // nằm trong cùng transaction.
      const existing = await OrderItem.findById(
        id,
        conn
      );

      if (!existing) {
        const err = new Error(
          'Không tìm thấy dòng chi tiết'
        );

        err.status = 404;
        throw err;
      }

      const allowed = await canAccessOrder(
        req.user.id,
        req.user.role,
        existing.order_id,
        conn
      );

      if (!allowed) {
        const err = new Error(
          'Bạn không có quyền sửa dòng chi tiết này'
        );

        err.status = 403;
        throw err;
      }

      const updateData = {};

      if (req.body.qty !== undefined) {
        updateData.qty = req.body.qty;
      }

      if (req.body.unit_price !== undefined) {
        updateData.unit_price =
          req.body.unit_price;
      }

      const updated = await OrderItem.update(
        id,
        updateData,
        conn
      );

      if (!updated) {
        const err = new Error(
          'Cập nhật dòng chi tiết thất bại'
        );

        err.status = 409;
        throw err;
      }

      // Đọc kết quả mới trước commit bằng cùng connection.
      const finalData = await OrderItem.findById(
        id,
        conn
      );

      await conn.commit();

      await safeAudit(
        req.user.id,
        'UPDATE',
        'order_items',
        id,
        {
          order_id: existing.order_id,
          item_id: existing.item_id,
          qty: existing.qty,
          unit_price: existing.unit_price,
          amount: existing.amount
        },
        {
          order_id: finalData.order_id,
          item_id: finalData.item_id,
          qty: finalData.qty,
          unit_price: finalData.unit_price,
          amount: finalData.amount
        },
        null,
        req.ip
      );

      return res.json({
        success: true,
        data: finalData
      });

    } catch (err) {
      if (conn) {
        try {
          await conn.rollback();
        } catch (rollbackErr) {
          console.error(
            '[PUT /order-items/:id][ROLLBACK]',
            rollbackErr
          );
        }
      }

      console.error(
        '[PUT /order-items/:id]',
        err
      );

      return fail(
        res,
        err.message || 'Không thể cập nhật chi tiết đơn hàng',
        getErrorStatus(err)
      );

    } finally {
      if (conn) {
        conn.release();
      }
    }
  }
);

// ============================================================
// DELETE /order-items/:id
// ============================================================

router.delete(
  '/:id',
  allow('orders'),
  async (req, res) => {
    let conn = null;

    try {
      requireRole(req, WRITE_ROLES);

      const id = parseId(
        req.params.id,
        'id'
      );

      conn = await pool.getConnection();
      await conn.beginTransaction();

      // Đọc bằng chính connection của transaction.
      const existing = await OrderItem.findById(
        id,
        conn
      );

      if (!existing) {
        const err = new Error(
          'Không tìm thấy dòng chi tiết'
        );

        err.status = 404;
        throw err;
      }

      const allowed = await canAccessOrder(
        req.user.id,
        req.user.role,
        existing.order_id,
        conn
      );

      if (!allowed) {
        const err = new Error(
          'Bạn không có quyền xóa dòng chi tiết này'
        );

        err.status = 403;
        throw err;
      }

      const removed = await OrderItem.remove(
        id,
        conn
      );

      if (!removed) {
        const err = new Error(
          'Xóa dòng chi tiết thất bại'
        );

        err.status = 409;
        throw err;
      }

      await conn.commit();

      await safeAudit(
        req.user.id,
        'DELETE',
        'order_items',
        id,
        {
          order_id: existing.order_id,
          item_id: existing.item_id,
          qty: existing.qty,
          unit_price: existing.unit_price,
          amount: existing.amount
        },
        null,
        'Xóa order_item',
        req.ip
      );

      return res.json({
        success: true,
        message: 'Đã xóa dòng chi tiết'
      });

    } catch (err) {
      if (conn) {
        try {
          await conn.rollback();
        } catch (rollbackErr) {
          console.error(
            '[DELETE /order-items/:id][ROLLBACK]',
            rollbackErr
          );
        }
      }

      console.error(
        '[DELETE /order-items/:id]',
        err
      );

      return fail(
        res,
        err.message || 'Không thể xóa chi tiết đơn hàng',
        getErrorStatus(err)
      );

    } finally {
      if (conn) {
        conn.release();
      }
    }
  }
);

module.exports = router;