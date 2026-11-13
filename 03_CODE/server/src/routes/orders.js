const express = require('express');
const router = express.Router();

const { pool } = require('../config/db');
const Order = require('../models/Order');

const auth = require('../middleware/auth');
const { allow } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');
const { generateNextCode } = require('../utils/codeGenerator');

// ============================================================
// CONSTANTS
// ============================================================

const ORDER_WRITE_ROLES = [
  'giam_doc',
  'ke_toan',
  'ctv'
];

const PAYMENT_ROLES = [
  'giam_doc',
  'ke_toan',
  'ctv'
];

const APPROVE_ROLES = [
  'giam_doc',
  'ke_toan'
];

const VALID_ORDER_TYPES = [
  'sale',
  'purchase'
];

// ============================================================
// RESPONSE / ERROR HELPERS
// ============================================================

function fail(res, message, status = 400) {
  return res.status(status).json({
    success: false,
    error: message
  });
}

function makeError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  err.statusCode = status;
  return err;
}

function errorStatus(err, fallback = 400) {
  const status = Number(
    err?.statusCode || err?.status
  );

  if (
    Number.isInteger(status) &&
    status >= 400 &&
    status <= 599
  ) {
    return status;
  }

  return fallback;
}

function parseId(value, field = 'id') {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw makeError(
      `${field} pháº£i lÃ  sá»‘ nguyÃªn dÆ°Æ¡ng`,
      400
    );
  }

  return id;
}

function parsePositiveNumber(value, field) {
  const n = Number(value);

  if (
    value === undefined ||
    value === null ||
    value === '' ||
    !Number.isFinite(n) ||
    n <= 0
  ) {
    throw makeError(`${field} pháº£i > 0`);
  }

  return n;
}

function requireRole(req, roles, action) {
  if (!req.user || !roles.includes(req.user.role)) {
    throw makeError(
      `Vai trÃ² "${req.user?.role || 'unknown'}" khÃ´ng cÃ³ quyá»n ${action}`,
      403
    );
  }
}

// ============================================================
// SAFE AUDIT
// Audit cháº¡y sau COMMIT.
// Audit lá»—i khÃ´ng lÃ m rollback nghiá»‡p vá»¥ Ä‘Ã£ thÃ nh cÃ´ng.
// ============================================================

async function safeAudit(...args) {
  try {
    await logAudit(...args);
  } catch (err) {
    console.error(
      '[ORDERS][AUDIT ERROR]',
      err.message
    );
  }
}

// ============================================================
// CTV ACCESS
// CTV chá»‰ Ä‘Æ°á»£c thao tÃ¡c order thuá»™c partner mÃ¬nh quáº£n lÃ½.
// ============================================================

async function canAccessPartner(
  userId,
  role,
  partnerId,
  conn
) {
  if (['giam_doc', 'ke_toan'].includes(role)) {
    return true;
  }

  if (role !== 'ctv') {
    return false;
  }

  const [rows] = await conn.query(
    `
      SELECT id
      FROM partners
      WHERE id = ?
        AND owner_id = ?
      LIMIT 1
    `,
    [partnerId, userId]
  );

  return rows.length > 0;
}

// ============================================================
// STOCK
// ============================================================

async function getStock(itemId, conn) {
  const [rows] = await conn.query(
    `
      SELECT COALESCE(SUM(signed_qty), 0) AS stock
      FROM stock_ledger
      WHERE item_id = ?
    `,
    [itemId]
  );

  return Number(rows[0]?.stock || 0);
}

async function checkStock(
  itemId,
  qtyNeeded,
  conn
) {
  const stock = await getStock(itemId, conn);

  return stock >= Number(qtyNeeded);
}

// ============================================================
// POST /orders
// Táº O ÄÆ N
// ============================================================

router.post(
  '/',
  auth,
  allow('orders'),
  async (req, res) => {
    let conn = null;

    try {
      requireRole(
        req,
        ORDER_WRITE_ROLES,
        'táº¡o Ä‘Æ¡n hÃ ng'
      );

      const body = req.body || {};

      if (!VALID_ORDER_TYPES.includes(body.type)) {
        throw makeError(
          'type pháº£i lÃ  "sale" hoáº·c "purchase"'
        );
      }

      const partnerId = parseId(
        body.partner_id,
        'partner_id'
      );

      if (
        !Array.isArray(body.items) ||
        body.items.length === 0
      ) {
        throw makeError(
          'ÄÆ¡n hÃ ng pháº£i cÃ³ Ã­t nháº¥t 1 dÃ²ng sáº£n pháº©m'
        );
      }

      // Validate sÆ¡ bá»™ trÆ°á»›c khi láº¥y connection.
      for (const item of body.items) {
        parseId(item.item_id, 'item_id');

        parsePositiveNumber(
          item.qty,
          `qty cá»§a item_id=${item.item_id}`
        );

        const price = Number(item.unit_price);

        if (
          item.unit_price === undefined ||
          item.unit_price === null ||
          item.unit_price === '' ||
          !Number.isFinite(price) ||
          price < 0
        ) {
          throw makeError(
            `unit_price khÃ´ng há»£p lá»‡ (item_id=${item.item_id})`
          );
        }
      }

      conn = await pool.getConnection();
      await conn.beginTransaction();

      // --------------------------------------------------------
      // PARTNER
      // --------------------------------------------------------

      const [partners] = await conn.query(
        `
          SELECT id, owner_id
          FROM partners
          WHERE id = ?
          LIMIT 1
        `,
        [partnerId]
      );

      if (!partners.length) {
        throw makeError(
          `KhÃ´ng tÃ¬m tháº¥y Ä‘á»‘i tÃ¡c id=${partnerId}`,
          404
        );
      }

      const partnerAllowed =
        await canAccessPartner(
          req.user.id,
          req.user.role,
          partnerId,
          conn
        );

      if (!partnerAllowed) {
        throw makeError(
          'Báº¡n khÃ´ng cÃ³ quyá»n táº¡o Ä‘Æ¡n cho Ä‘á»‘i tÃ¡c nÃ y',
          403
        );
      }

      // --------------------------------------------------------
      // CODE
      // --------------------------------------------------------

      let code =
        typeof body.code === 'string'
          ? body.code.trim()
          : '';

      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        attempts++;

        if (!code) {
          const prefix =
            body.type === 'purchase'
              ? 'PN'
              : 'DH';

          const where =
            `AND type = '${body.type}'`;

          code = await generateNextCode(
            'orders',
            'code',
            prefix,
            5,
            where
          );
        }

        try {
          // ----------------------------------------------------
          // CREATE ORDER
          // QUAN TRá»ŒNG: truyá»n conn
          // ----------------------------------------------------

          const orderId = await Order.create(
            {
              ...body,

              partner_id: partnerId,

              code,

              created_by: req.user.id
            },
            conn
          );

          // ----------------------------------------------------
          // ITEMS
          // QUAN TRá»ŒNG: truyá»n conn
          // ----------------------------------------------------

          for (const item of body.items) {
            await Order.addItem(
              orderId,
              {
                item_id: item.item_id,
                qty: item.qty,
                unit_price: item.unit_price
              },
              conn
            );
          }

          // TÃ­nh láº¡i láº§n cuá»‘i sau toÃ n bá»™ items.
          const totals =
            await Order.recalcTotal(
              orderId,
              conn
            );

          // Äá»c káº¿t quáº£ ngay trong transaction.
          const [createdRows] =
            await conn.query(
              `
                SELECT *
                FROM orders
                WHERE id = ?
              `,
              [orderId]
            );

          await conn.commit();

          await safeAudit(
            req.user.id,
            'CREATE',
            'orders',
            orderId,
            null,
            {
              type: body.type,
              code,
              partner_id: partnerId,
              items: body.items,
              total: totals.total
            },
            null,
            req.ip
          );

          return res.status(201).json({
            success: true,

            id: orderId,

            code,

            data: createdRows[0],

            totals
          });

        } catch (err) {
          // Chá»‰ retry lá»—i trÃ¹ng mÃ£ Ä‘Æ¡n.
          if (
            err.code === 'ER_DUP_ENTRY' &&
            /code/i.test(String(err.message))
          ) {
            console.warn(
              `[POST /orders] TrÃ¹ng mÃ£ "${code}" ` +
              `(${attempts}/${maxAttempts})`
            );

            code = '';

            continue;
          }

          throw err;
        }
      }

      throw makeError(
        `KhÃ´ng sinh Ä‘Æ°á»£c mÃ£ Ä‘Æ¡n duy nháº¥t sau ${maxAttempts} láº§n thá»­`,
        409
      );

    } catch (err) {
      if (conn) {
        try {
          await conn.rollback();
        } catch (rollbackErr) {
          console.error(
            '[POST /orders][ROLLBACK]',
            rollbackErr.message
          );
        }
      }

      console.error(
        '[POST /orders]',
        err
      );

      return fail(
        res,
        err.message ||
          'KhÃ´ng thá»ƒ táº¡o Ä‘Æ¡n hÃ ng',
        errorStatus(err)
      );

    } finally {
      if (conn) {
        conn.release();
      }
    }
  }
);

// ============================================================
// GET /orders
// ============================================================

router.get(
  '/',
  auth,
  allow('orders'),
  async (req, res) => {
    try {
      // CTV chá»‰ xem Ä‘Æ¡n cá»§a partner mÃ¬nh quáº£n lÃ½.
      if (req.user.role === 'ctv') {
        let sql = `
          SELECT
            o.*,
            p.name AS partner_name,
            u.full_name AS creator_name
          FROM orders o
          JOIN partners p
            ON p.id = o.partner_id
          LEFT JOIN users u
            ON u.id = o.created_by
          WHERE p.owner_id = ?
        `;

        const params = [
          req.user.id
        ];

        if (
          req.query.type &&
          VALID_ORDER_TYPES.includes(
            req.query.type
          )
        ) {
          sql += ' AND o.type = ?';
          params.push(req.query.type);
        }

        if (req.query.status) {
          sql += ' AND o.status = ?';
          params.push(req.query.status);
        }

        if (req.query.payment_status) {
          sql +=
            ' AND o.payment_status = ?';

          params.push(
            req.query.payment_status
          );
        }

        if (req.query.keyword) {
          sql += ' AND o.code LIKE ?';

          params.push(
            `%${req.query.keyword}%`
          );
        }

        sql += ' ORDER BY o.id DESC';

        const [data] =
          await pool.query(
            sql,
            params
          );

        return res.json({
          success: true,
          data,
          count: data.length
        });
      }

      // giam_doc / ke_toan / role Ä‘Æ°á»£c RBAC cho phÃ©p.
      const data = await Order.getAll(
        req.query
      );

      return res.json({
        success: true,
        data,
        count: data.length
      });

    } catch (err) {
      console.error(
        '[GET /orders]',
        err
      );

      return fail(
        res,
        err.message ||
          'KhÃ´ng thá»ƒ láº¥y danh sÃ¡ch Ä‘Æ¡n hÃ ng',
        errorStatus(err, 500)
      );
    }
  }
);

// ============================================================
// POST /orders/:id/payments
// GHI NHáº¬N THANH TOÃN
// ============================================================

router.get('/:id',auth,allow('orders'),async(req,res)=>{try{const id=parseId(req.params.id,'order_id');const [rows]=await pool.query(`SELECT o.*,p.code AS partner_code,p.name AS partner_name,p.phone AS partner_phone,p.address AS partner_address,u.full_name AS creator_name,au.full_name AS approver_name FROM orders o JOIN partners p ON p.id=o.partner_id LEFT JOIN users u ON u.id=o.created_by LEFT JOIN users au ON au.id=o.approved_by WHERE o.id=? LIMIT 1`,[id]);if(!rows.length)return fail(res,'Không tìm thấy đơn hàng',404);const order=rows[0];if(req.user.role==='ctv'){const ok=await canAccessPartner(req.user.id,req.user.role,order.partner_id,pool);if(!ok)return fail(res,'Bạn không có quyền xem đơn này',403);}const [items]=await pool.query(`SELECT oi.id,oi.item_id,oi.qty,oi.unit_price,oi.amount,i.code AS item_code,i.name AS item_name,i.unit FROM order_items oi JOIN items i ON i.id=oi.item_id WHERE oi.order_id=? ORDER BY oi.id`,[id]);const [payments]=await pool.query(`SELECT p.id,p.amount,p.method,p.paid_at,p.note,p.created_by,u.full_name AS creator_name FROM payments p LEFT JOIN users u ON u.id=p.created_by WHERE p.order_id=? ORDER BY p.id DESC`,[id]);return res.json({success:true,data:{...order,items,payments,remaining:Math.max(0,Number(order.total||0)-Number(order.paid_amount||0))}});}catch(err){console.error('[GET /orders/:id]',err);return fail(res,err.message||'Không thể lấy chi tiết đơn hàng',errorStatus(err,500));}});

router.post(
  '/:id/payments',
  auth,
  allow('orders'),
  async (req, res) => {
    let conn = null;

    try {
      requireRole(
        req,
        PAYMENT_ROLES,
        'ghi nháº­n thanh toÃ¡n'
      );

      const orderId = parseId(
        req.params.id,
        'order_id'
      );

      const amount = parsePositiveNumber(
        req.body?.amount,
        'Sá»‘ tiá»n thanh toÃ¡n'
      );

      const method =
        req.body?.method || 'transfer';

      const note =
        req.body?.note || null;

      conn = await pool.getConnection();
      await conn.beginTransaction();

      // --------------------------------------------------------
      // LOCK ORDER
      // TrÃ¡nh 2 request payment cÃ¹ng Ä‘á»c má»™t paid_amount.
      // --------------------------------------------------------

      const [rows] = await conn.query(
        `
          SELECT
            id,
            code,
            total,
            paid_amount,
            payment_status,
            type,
            partner_id,
            status
          FROM orders
          WHERE id = ?
          FOR UPDATE
        `,
        [orderId]
      );

      if (!rows.length) {
        throw makeError(
          'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng',
          404
        );
      }

      const order = rows[0];

      // --------------------------------------------------------
      // CTV OWNERSHIP
      // --------------------------------------------------------

      const allowed =
        await canAccessPartner(
          req.user.id,
          req.user.role,
          order.partner_id,
          conn
        );

      if (!allowed) {
        throw makeError(
          'CTV chá»‰ Ä‘Æ°á»£c thu tiá»n cho khÃ¡ch hÃ ng mÃ¬nh quáº£n lÃ½',
          403
        );
      }

      const total =
        Number(order.total || 0);

      const paid =
        Number(order.paid_amount || 0);

      if (
        !Number.isFinite(total) ||
        total <= 0
      ) {
        throw makeError(
          'Tá»•ng tiá»n Ä‘Æ¡n hÃ ng khÃ´ng há»£p lá»‡'
        );
      }

      if (
        !Number.isFinite(paid) ||
        paid < 0
      ) {
        throw makeError(
          'paid_amount cá»§a Ä‘Æ¡n hÃ ng khÃ´ng há»£p lá»‡',
          500
        );
      }

      const remaining =
        total - paid;

      if (remaining <= 0) {
        throw makeError(
          'ÄÆ¡n hÃ ng Ä‘Ã£ Ä‘Æ°á»£c thanh toÃ¡n Ä‘á»§',
          409
        );
      }

      if (amount > remaining) {
        throw makeError(
          `Sá»‘ tiá»n thu (${amount.toLocaleString('vi-VN')} Ä‘) ` +
          `vÆ°á»£t quÃ¡ sá»‘ ná»£ cÃ²n láº¡i ` +
          `(${remaining.toLocaleString('vi-VN')} Ä‘)`
        );
      }

      // --------------------------------------------------------
      // PAYMENT
      // --------------------------------------------------------

      const [paymentResult] =
        await conn.query(
          `
            INSERT INTO payments
              (
                order_id,
                amount,
                method,
                note,
                created_by
              )
            VALUES (?, ?, ?, ?, ?)
          `,
          [
            orderId,
            amount,
            method,
            note,
            req.user.id
          ]
        );

      const newPaid =
        paid + amount;

      const paymentStatus =
        newPaid >= total
          ? 'paid'
          : 'partial';

      await conn.query(
        `
          UPDATE orders
          SET
            paid_amount = ?,
            payment_status = ?
          WHERE id = ?
        `,
        [
          newPaid,
          paymentStatus,
          orderId
        ]
      );

      await conn.commit();

      await safeAudit(
        req.user.id,
        'PAYMENT',
        'orders',
        orderId,
        {
          paid_amount: paid,
          payment_status:
            order.payment_status
        },
        {
          payment_id:
            paymentResult.insertId,
          amount,
          paid_amount: newPaid,
          payment_status:
            paymentStatus
        },
        null,
        req.ip
      );

      return res.json({
        success: true,

        message:
          'ÄÃ£ ghi nháº­n thanh toÃ¡n',

        payment_id:
          paymentResult.insertId,

        total,

        paid_amount:
          newPaid,

        payment_status:
          paymentStatus,

        remaining:
          total - newPaid
      });

    } catch (err) {
      if (conn) {
        try {
          await conn.rollback();
        } catch (rollbackErr) {
          console.error(
            '[PAYMENT][ROLLBACK]',
            rollbackErr.message
          );
        }
      }

      console.error(
        '[POST /orders/:id/payments]',
        err
      );

      return fail(
        res,
        err.message ||
          'KhÃ´ng thá»ƒ ghi nháº­n thanh toÃ¡n',
        errorStatus(err)
      );

    } finally {
      if (conn) {
        conn.release();
      }
    }
  }
);

// ============================================================
// POST /orders/:id/approve
// DUYá»†T ÄÆ N + STOCK LEDGER
//
// Chá»‰:
// - giam_doc
// - ke_toan
// ============================================================

router.post(
  '/:id/approve',
  auth,
  allow('orders'),
  async (req, res) => {
    let conn = null;

    try {
      requireRole(
        req,
        APPROVE_ROLES,
        'duyá»‡t Ä‘Æ¡n hÃ ng'
      );

      const orderId = parseId(
        req.params.id,
        'order_id'
      );

      conn = await pool.getConnection();
      await conn.beginTransaction();

      // --------------------------------------------------------
      // LOCK ORDER
      // --------------------------------------------------------

      const [orderRows] =
        await conn.query(
          `
            SELECT *
            FROM orders
            WHERE id = ?
            FOR UPDATE
          `,
          [orderId]
        );

      if (!orderRows.length) {
        throw makeError(
          'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng',
          404
        );
      }

      const order =
        orderRows[0];

      if (order.status !== 'draft') {
        throw makeError(
          `ÄÆ¡n á»Ÿ tráº¡ng thÃ¡i "${order.status}", khÃ´ng thá»ƒ duyá»‡t`,
          409
        );
      }

      // --------------------------------------------------------
      // RECALCULATE
      // KhÃ´ng tin total cÅ©.
      // --------------------------------------------------------

      const totals =
        await Order.recalcTotal(
          orderId,
          conn
        );

      order.sub_total =
        totals.sub_total;

      order.tax_amount =
        totals.tax_amount;

      order.total =
        totals.total;

      // --------------------------------------------------------
      // FULL PAYMENT
      // --------------------------------------------------------

      const paidAmount =
        Number(order.paid_amount || 0);

      const total =
        Number(order.total || 0);

      const requireFullPayment =
        Boolean(
          Number(
            order.require_full_payment
          )
        );

      if (
        requireFullPayment &&
        paidAmount < total
      ) {
        throw makeError(
          `ÄÆ¡n nÃ y yÃªu cáº§u thanh toÃ¡n Ä‘á»§ trÆ°á»›c khi duyá»‡t. ` +
          `ÄÃ£ thu ${paidAmount.toLocaleString('vi-VN')} / ` +
          `${total.toLocaleString('vi-VN')} Ä‘.`,
          409
        );
      }

      // --------------------------------------------------------
      // CREDIT LIMIT
      // Chá»‰ SALE
      // --------------------------------------------------------

      if (order.type === 'sale') {
        const [partners] =
          await conn.query(
            `
              SELECT
                id,
                credit_limit
              FROM partners
              WHERE id = ?
              FOR UPDATE
            `,
            [order.partner_id]
          );

        if (!partners.length) {
          throw makeError(
            'KhÃ´ng tÃ¬m tháº¥y Ä‘á»‘i tÃ¡c',
            404
          );
        }

        const creditLimit =
          Number(
            partners[0].credit_limit || 0
          );

        if (creditLimit > 0) {
          const [debtRows] =
            await conn.query(
              `
                SELECT
                  COALESCE(
                    SUM(
                      GREATEST(
                        total - paid_amount,
                        0
                      )
                    ),
                    0
                  ) AS total_debt
                FROM orders
                WHERE partner_id = ?
                  AND type = 'sale'
                  AND status IN (
                    'approved',
                    'delivered',
                    'done'
                  )
                  AND payment_status <> 'paid'
              `,
              [order.partner_id]
            );

          const currentDebt =
            Number(
              debtRows[0]?.total_debt || 0
            );

          const thisDebt =
            Math.max(
              total - paidAmount,
              0
            );

          const newDebt =
            currentDebt + thisDebt;

          if (
            newDebt >
            creditLimit
          ) {
            throw makeError(
              `VÆ°á»£t háº¡n má»©c cÃ´ng ná»£. ` +
              `Ná»£ hiá»‡n táº¡i: ${currentDebt.toLocaleString('vi-VN')} Ä‘. ` +
              `ÄÆ¡n nÃ y: ${thisDebt.toLocaleString('vi-VN')} Ä‘. ` +
              `Háº¡n má»©c: ${creditLimit.toLocaleString('vi-VN')} Ä‘.`,
              409
            );
          }
        }
      }

      // --------------------------------------------------------
      // GET ITEMS
      // DÃ¹ng conn trá»±c tiáº¿p Ä‘á»ƒ transaction nháº¥t quÃ¡n.
      // --------------------------------------------------------

      const [items] =
        await conn.query(
          `
            SELECT
              oi.*,
              i.code AS item_code,
              i.name AS item_name,
              i.unit
            FROM order_items oi
            JOIN items i
              ON i.id = oi.item_id
            WHERE oi.order_id = ?
            ORDER BY oi.id
          `,
          [orderId]
        );

      if (!items.length) {
        throw makeError(
          'ÄÆ¡n khÃ´ng cÃ³ sáº£n pháº©m nÃ o',
          409
        );
      }

      // --------------------------------------------------------
      // STOCK
      // --------------------------------------------------------

      for (const item of items) {
        const qty =
          Number(item.qty);

        if (
          !Number.isFinite(qty) ||
          qty <= 0
        ) {
          throw makeError(
            `Sá»‘ lÆ°á»£ng khÃ´ng há»£p lá»‡ táº¡i item_id=${item.item_id}`
          );
        }

        if (order.type === 'sale') {
          const enough =
            await checkStock(
              item.item_id,
              qty,
              conn
            );

          if (!enough) {
            const stock =
              await getStock(
                item.item_id,
                conn
              );

            throw makeError(
              `KhÃ´ng Ä‘á»§ tá»“n kho cho "${item.item_name}". ` +
              `Cáº§n ${qty}, hiá»‡n cÃ²n ${stock}.`,
              409
            );
          }
        }

        const ledgerType =
          order.type === 'sale'
            ? 'out'
            : 'in';

        const signedQty =
          ledgerType === 'out'
            ? -Math.abs(qty)
            : Math.abs(qty);

        const stockNote =
          order.type === 'sale'
            ? `Xuáº¥t kho cho Ä‘Æ¡n ${order.code}`
            : `Nháº­p kho tá»« Ä‘Æ¡n ${order.code}`;

        await conn.query(
          `
            INSERT INTO stock_ledger
              (
                item_id,
                type,
                qty,
                signed_qty,
                ref_type,
                ref_id,
                note,
                created_by
              )
            VALUES (
              ?, ?, ?, ?,
              'order',
              ?, ?, ?
            )
          `,
          [
            item.item_id,
            ledgerType,
            qty,
            signedQty,
            orderId,
            stockNote,
            req.user.id
          ]
        );
      }

      // --------------------------------------------------------
      // APPROVE
      // --------------------------------------------------------

      const approved =
        await Order.approve(
          orderId,
          req.user.id,
          conn
        );

      if (!approved) {
        throw makeError(
          'KhÃ´ng thá»ƒ duyá»‡t Ä‘Æ¡n. ÄÆ¡n cÃ³ thá»ƒ Ä‘Ã£ Ä‘á»•i tráº¡ng thÃ¡i hoáº·c chÆ°a Ä‘á»§ Ä‘iá»u kiá»‡n thanh toÃ¡n.',
          409
        );
      }

      await conn.commit();

      await safeAudit(
        req.user.id,
        'APPROVE',
        'orders',
        orderId,
        {
          status:
            order.status
        },
        {
          status:
            'approved'
        },
        'Duyá»‡t Ä‘Æ¡n & cáº­p nháº­t kho',
        req.ip
      );

      return res.json({
        success: true,

        message:
          `ÄÃ£ duyá»‡t Ä‘Æ¡n ${order.code} vÃ  cáº­p nháº­t kho (${items.length} dÃ²ng)`,

        id:
          orderId,

        code:
          order.code,

        status:
          'approved',

        total:
          total,

        paid_amount:
          paidAmount
      });

    } catch (err) {
      if (conn) {
        try {
          await conn.rollback();
        } catch (rollbackErr) {
          console.error(
            '[APPROVE][ROLLBACK]',
            rollbackErr.message
          );
        }
      }

      console.error(
        '[POST /orders/:id/approve]',
        err
      );

      return fail(
        res,
        err.message ||
          'KhÃ´ng thá»ƒ duyá»‡t Ä‘Æ¡n hÃ ng',
        errorStatus(err)
      );

    } finally {
      if (conn) {
        conn.release();
      }
    }
  }
);

module.exports = router;
