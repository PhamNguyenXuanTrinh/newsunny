const express = require('express');
const router = express.Router();

const User = require('../models/User');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/rbac');
const { hashPassword } = require('../utils/password');
const { logAudit } = require('../middleware/audit');
const { pool } = require('../config/db');

// ============================================================
// CONSTANTS
// ============================================================

const VALID_ROLES = [
  'giam_doc',
  'ke_toan',
  'to_truong',
  'cong_nhan',
  'ctv'
];

const VALID_STATUSES = [
  'active',
  'resigned',
  'suspended'
];

const USERNAME_REGEX =
  /^[a-zA-Z0-9._-]{3,50}$/;

const PASSWORD_MIN_LENGTH = 6;

// ============================================================
// ERROR HELPERS
// ============================================================

function fail(res, message, status = 400, extra = {}) {
  return res.status(status).json({
    success: false,
    error: message,
    ...extra
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
      `${field} không hợp lệ`
    );
  }

  return id;
}

// ============================================================
// SANITIZE USER
// Tuyệt đối không trả password/password_hash
// ============================================================

function sanitizeUser(user) {
  if (!user) return null;

  const {
    password,
    password_hash,
    ...safe
  } = user;

  return safe;
}

// ============================================================
// VALIDATE USER INPUT
// ============================================================

function validateUserInput(
  data,
  {
    isUpdate = false,
    requireRole = true
  } = {}
) {
  const errors = [];

  // ----------------------------------------------------------
  // USERNAME
  // ----------------------------------------------------------

  if (!isUpdate || data.username !== undefined) {
    const username =
      String(data.username || '').trim();

    if (!username) {
      errors.push('Thiếu username');
    } else if (!USERNAME_REGEX.test(username)) {
      errors.push(
        'username chỉ được 3-50 ký tự gồm chữ, số, dấu chấm, gạch ngang hoặc gạch dưới'
      );
    }
  }

  // ----------------------------------------------------------
  // PASSWORD
  // ----------------------------------------------------------

  if (!isUpdate) {
    if (!data.password) {
      errors.push('Thiếu password');
    } else if (
      String(data.password).length <
      PASSWORD_MIN_LENGTH
    ) {
      errors.push(
        `password phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`
      );
    }
  } else if (
    data.password !== undefined &&
    String(data.password).length <
      PASSWORD_MIN_LENGTH
  ) {
    errors.push(
      `password phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`
    );
  }

  // ----------------------------------------------------------
  // FULL NAME
  // ----------------------------------------------------------

  if (!isUpdate || data.full_name !== undefined) {
    const fullName =
      String(data.full_name || '').trim();

    if (!fullName) {
      errors.push('Thiếu full_name');
    } else if (fullName.length > 100) {
      errors.push(
        'full_name tối đa 100 ký tự'
      );
    }
  }

  // ----------------------------------------------------------
  // ROLE
  // ----------------------------------------------------------

  if (
    requireRole &&
    (!isUpdate || data.role !== undefined)
  ) {
    if (!data.role) {
      errors.push('Thiếu role');
    } else if (
      !VALID_ROLES.includes(data.role)
    ) {
      errors.push(
        `role phải là một trong: ${VALID_ROLES.join(', ')}`
      );
    }
  } else if (
    data.role !== undefined &&
    !VALID_ROLES.includes(data.role)
  ) {
    errors.push(
      `role phải là một trong: ${VALID_ROLES.join(', ')}`
    );
  }

  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  if (
    data.status !== undefined &&
    !VALID_STATUSES.includes(data.status)
  ) {
    errors.push(
      `status phải là một trong: ${VALID_STATUSES.join(', ')}`
    );
  }

  // ----------------------------------------------------------
  // SALARY
  // ----------------------------------------------------------

  if (data.salary_base !== undefined) {
    const salary = Number(data.salary_base);

    if (
      !Number.isFinite(salary) ||
      salary < 0
    ) {
      errors.push(
        'salary_base phải là số không âm'
      );
    }
  }

  return errors;
}

// ============================================================
// SAFE AUDIT
// ============================================================

async function safeAudit(...args) {
  try {
    await logAudit(...args);
  } catch (err) {
    console.error(
      '[USERS][AUDIT ERROR]',
      err.message
    );
  }
}

// ============================================================
// GET /users
// ============================================================

router.get(
  '/',
  auth,
  async (req, res) => {
    try {
      if (
        ![
          'giam_doc',
          'ke_toan',
          'to_truong'
        ].includes(req.user.role)
      ) {
        return fail(
          res,
          'Không có quyền xem danh sách nhân sự',
          403
        );
      }

      const [users] = await pool.query(`
        SELECT
          id,
          username,
          full_name,
          role,
          status,
          team_id,
          position,
          phone,
          email,
          salary_base
        FROM users
        WHERE status <> 'resigned'
        ORDER BY id ASC
      `);

      return res.json({
        success: true,
        data: users,
        count: users.length
      });

    } catch (err) {
      console.error(
        '[GET /users]',
        err
      );

      return fail(
        res,
        err.message ||
          'Không thể lấy danh sách nhân sự',
        errorStatus(err, 500)
      );
    }
  }
);

// ============================================================
// POST /users
//
// TRƯỜNG HỢP 1:
// Database chưa có user:
// → Bootstrap
// → KHÔNG tin role từ client
// → SERVER ÉP role = giam_doc
//
// TRƯỜNG HỢP 2:
// Đã có user:
// → Bắt buộc đăng nhập
// → Chỉ giam_doc được tạo user
// ============================================================

router.post(
  '/',
  async (req, res) => {
    let conn = null;

    try {
      const body = req.body || {};

      conn = await pool.getConnection();

      // --------------------------------------------------------
      // LOCK bootstrap bằng transaction
      // --------------------------------------------------------

      await conn.beginTransaction();

      const [countRows] =
        await conn.query(
          `
            SELECT COUNT(*) AS total
            FROM users
            FOR UPDATE
          `
        );

      const count =
        Number(countRows[0]?.total || 0);

      const isBootstrap =
        count === 0;

      let actor = null;

      // --------------------------------------------------------
      // AUTH
      // --------------------------------------------------------

      if (!isBootstrap) {
        // Dùng middleware auth hiện tại.
        await new Promise(
          (resolve, reject) => {
            auth(
              req,
              res,
              err => {
                if (err) {
                  reject(err);
                  return;
                }

                // Nếu middleware đã tự gửi response
                // mà không set user.
                if (!req.user) {
                  reject(
                    makeError(
                      'Token không hợp lệ',
                      401
                    )
                  );
                  return;
                }

                resolve();
              }
            );
          }
        );

        actor = req.user;

        if (
          actor.role !== 'giam_doc'
        ) {
          throw makeError(
            'Chỉ Giám đốc mới được tạo nhân sự',
            403
          );
        }
      }

      // --------------------------------------------------------
      // DATA
      // --------------------------------------------------------

      const createData = {
        ...body
      };

      if (isBootstrap) {
        // QUAN TRỌNG:
        // Không quan tâm client gửi role gì.
        createData.role = 'giam_doc';

        // User đầu tiên phải active.
        createData.status = 'active';
      }

      // --------------------------------------------------------
      // VALIDATE
      // --------------------------------------------------------

      const errors =
        validateUserInput(
          createData,
          {
            isUpdate: false,
            requireRole: true
          }
        );

      if (errors.length) {
        throw makeError(
          errors.join('; '),
          400
        );
      }

      createData.username =
        String(
          createData.username
        ).trim();

      createData.full_name =
        String(
          createData.full_name
        ).trim();

      // --------------------------------------------------------
      // CHECK USERNAME
      // Dùng transaction connection.
      // --------------------------------------------------------

      const [existingRows] =
        await conn.query(
          `
            SELECT id
            FROM users
            WHERE username = ?
            LIMIT 1
          `,
          [createData.username]
        );

      if (existingRows.length) {
        throw makeError(
          'Username đã tồn tại',
          409
        );
      }

      // --------------------------------------------------------
      // HASH PASSWORD
      // --------------------------------------------------------

      createData.password_hash =
        await hashPassword(
          createData.password
        );

      delete createData.password;

      // --------------------------------------------------------
      // CREATE
      //
      // Không dùng User.create() ở đây để tránh việc model
      // tự dùng pool bên ngoài transaction nếu model chưa
      // hỗ trợ conn.
      // --------------------------------------------------------

      const [insertResult] =
        await conn.query(
          `
            INSERT INTO users
            (
              username,
              password_hash,
              full_name,
              role,
              status,
              team_id,
              position,
              phone,
              email,
              salary_base
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            createData.username,
            createData.password_hash,
            createData.full_name,
            createData.role,
            createData.status || 'active',
            createData.team_id || null,
            createData.position || null,
            createData.phone || null,
            createData.email || null,
            Number(
              createData.salary_base || 0
            )
          ]
        );

      const newId =
        insertResult.insertId;

      const [createdRows] =
        await conn.query(
          `
            SELECT *
            FROM users
            WHERE id = ?
          `,
          [newId]
        );

      const created =
        sanitizeUser(
          createdRows[0]
        );

      await conn.commit();

      // --------------------------------------------------------
      // AUDIT SAU COMMIT
      // --------------------------------------------------------

      await safeAudit(
        actor ? actor.id : newId,
        'CREATE',
        'users',
        newId,
        null,
        {
          username:
            created.username,

          full_name:
            created.full_name,

          role:
            created.role,

          status:
            created.status
        },
        isBootstrap
          ? 'Bootstrap Giám đốc đầu tiên'
          : null,
        req.ip
      );

      return res
        .status(201)
        .json({
          success: true,

          message:
            isBootstrap
              ? 'Khởi tạo Giám đốc đầu tiên thành công'
              : 'Tạo nhân sự thành công',

          id: newId,

          data: created
        });

    } catch (err) {
      if (conn) {
        try {
          await conn.rollback();
        } catch (rollbackErr) {
          console.error(
            '[POST /users][ROLLBACK]',
            rollbackErr.message
          );
        }
      }

      console.error(
        '[POST /users]',
        err
      );

      /*
       * Một số auth middleware tự res.status(...).json(...)
       * trước khi kết thúc.
       * Tránh gửi response lần 2.
       */
      if (res.headersSent) {
        return;
      }

      return fail(
        res,
        err.message ||
          'Không thể tạo nhân sự',
        errorStatus(err, 500)
      );

    } finally {
      if (conn) {
        conn.release();
      }
    }
  }
);

// ============================================================
// PATCH /users/:id
// ============================================================

router.patch(
  '/:id',
  auth,
  allow('users'),
  async (req, res) => {
    let conn = null;

    try {
      const targetId =
        parseId(
          req.params.id,
          'id'
        );

      if (
        req.user.role !== 'giam_doc'
      ) {
        throw makeError(
          'Chỉ Giám đốc mới được cập nhật hồ sơ nhân sự',
          403
        );
      }

      const body =
        req.body || {};

      conn =
        await pool.getConnection();

      await conn.beginTransaction();

      // --------------------------------------------------------
      // LOCK TARGET
      // --------------------------------------------------------

      const [targetRows] =
        await conn.query(
          `
            SELECT *
            FROM users
            WHERE id = ?
            FOR UPDATE
          `,
          [targetId]
        );

      if (!targetRows.length) {
        throw makeError(
          'Không tìm thấy nhân sự',
          404
        );
      }

      const target =
        targetRows[0];

      // --------------------------------------------------------
      // VALIDATE
      // --------------------------------------------------------

      const errors =
        validateUserInput(
          body,
          {
            isUpdate: true,
            requireRole: false
          }
        );

      if (errors.length) {
        throw makeError(
          errors.join('; '),
          400
        );
      }

      // --------------------------------------------------------
      // USERNAME
      // --------------------------------------------------------

      if (
        body.username !== undefined &&
        String(body.username).trim() !==
          target.username
      ) {
        throw makeError(
          'Không thể đổi username. Vui lòng tạo user mới nếu cần.',
          400
        );
      }

      // --------------------------------------------------------
      // SELF ROLE
      // --------------------------------------------------------

      if (
        Number(targetId) ===
          Number(req.user.id) &&
        body.role !== undefined &&
        body.role !== target.role
      ) {
        throw makeError(
          'Không thể tự đổi role của chính mình',
          403
        );
      }

      // Không cho tự suspend/resign chính mình.
      if (
        Number(targetId) ===
          Number(req.user.id) &&
        body.status !== undefined &&
        body.status !== 'active'
      ) {
        throw makeError(
          'Không thể tự khóa hoặc cho chính mình nghỉ việc',
          403
        );
      }

      // --------------------------------------------------------
      // FIELDS
      // --------------------------------------------------------

      const fullName =
        body.full_name !== undefined
          ? String(
              body.full_name
            ).trim()
          : target.full_name;

      const role =
        body.role !== undefined
          ? body.role
          : target.role;

      const status =
        body.status !== undefined
          ? body.status
          : target.status;

      const teamId =
        body.team_id !== undefined
          ? body.team_id || null
          : target.team_id;

      const position =
        body.position !== undefined
          ? body.position || null
          : target.position;

      const phone =
        body.phone !== undefined
          ? body.phone || null
          : target.phone;

      const email =
        body.email !== undefined
          ? body.email || null
          : target.email;

      const salaryBase =
        body.salary_base !== undefined
          ? Number(body.salary_base)
          : Number(
              target.salary_base || 0
            );

      // --------------------------------------------------------
      // PASSWORD OPTIONAL
      // --------------------------------------------------------

      let passwordHash =
        target.password_hash;

      if (body.password !== undefined) {
        passwordHash =
          await hashPassword(
            body.password
          );
      }

      // --------------------------------------------------------
      // UPDATE
      // --------------------------------------------------------

      await conn.query(
        `
          UPDATE users
          SET
            password_hash = ?,
            full_name = ?,
            role = ?,
            status = ?,
            team_id = ?,
            position = ?,
            phone = ?,
            email = ?,
            salary_base = ?
          WHERE id = ?
        `,
        [
          passwordHash,
          fullName,
          role,
          status,
          teamId,
          position,
          phone,
          email,
          salaryBase,
          targetId
        ]
      );

      const [updatedRows] =
        await conn.query(
          `
            SELECT *
            FROM users
            WHERE id = ?
          `,
          [targetId]
        );

      const updated =
        sanitizeUser(
          updatedRows[0]
        );

      await conn.commit();

      await safeAudit(
        req.user.id,
        'UPDATE',
        'users',
        targetId,
        {
          full_name:
            target.full_name,

          role:
            target.role,

          status:
            target.status
        },
        {
          full_name:
            updated.full_name,

          role:
            updated.role,

          status:
            updated.status
        },
        null,
        req.ip
      );

      return res.json({
        success: true,
        message:
          'Cập nhật hồ sơ thành công',
        data: updated
      });

    } catch (err) {
      if (conn) {
        try {
          await conn.rollback();
        } catch (rollbackErr) {
          console.error(
            '[PATCH /users/:id][ROLLBACK]',
            rollbackErr.message
          );
        }
      }

      console.error(
        '[PATCH /users/:id]',
        err
      );

      return fail(
        res,
        err.message ||
          'Không thể cập nhật nhân sự',
        errorStatus(err, 500)
      );

    } finally {
      if (conn) {
        conn.release();
      }
    }
  }
);

// ============================================================
// DELETE /users/:id
// XÓA MỀM = status resigned
// ============================================================

router.delete(
  '/:id',
  auth,
  allow('users'),
  async (req, res) => {
    let conn = null;

    try {
      if (
        req.user.role !== 'giam_doc'
      ) {
        throw makeError(
          'Chỉ Giám đốc mới được cho nhân sự nghỉ việc',
          403
        );
      }

      const targetId =
        parseId(
          req.params.id,
          'id'
        );

      if (
        targetId ===
        Number(req.user.id)
      ) {
        throw makeError(
          'Không thể tự cho chính mình nghỉ việc',
          400
        );
      }

      conn =
        await pool.getConnection();

      await conn.beginTransaction();

      const [targetRows] =
        await conn.query(
          `
            SELECT
              id,
              full_name,
              role,
              status
            FROM users
            WHERE id = ?
            FOR UPDATE
          `,
          [targetId]
        );

      if (!targetRows.length) {
        throw makeError(
          'Không tìm thấy nhân sự',
          404
        );
      }

      const target =
        targetRows[0];

      if (
        target.status === 'resigned'
      ) {
        throw makeError(
          'Nhân sự đã nghỉ việc trước đó',
          409
        );
      }

      // --------------------------------------------------------
      // Không cho xóa GĐ active cuối cùng.
      // --------------------------------------------------------

      if (
        target.role === 'giam_doc'
      ) {
        const [directorRows] =
          await conn.query(
            `
              SELECT COUNT(*) AS total
              FROM users
              WHERE role = 'giam_doc'
                AND status = 'active'
            `
          );

        const activeDirectors =
          Number(
            directorRows[0]?.total || 0
          );

        if (activeDirectors <= 1) {
          throw makeError(
            'Không thể cho Giám đốc active cuối cùng nghỉ việc',
            409
          );
        }
      }

      await conn.query(
        `
          UPDATE users
          SET status = 'resigned'
          WHERE id = ?
        `,
        [targetId]
      );

      await conn.commit();

      await safeAudit(
        req.user.id,
        'DELETE',
        'users',
        targetId,
        {
          status:
            target.status
        },
        {
          status:
            'resigned'
        },
        `Cho nghỉ việc: ${target.full_name}`,
        req.ip
      );

      return res.json({
        success: true,
        message:
          'Đã chuyển trạng thái sang Nghỉ việc'
      });

    } catch (err) {
      if (conn) {
        try {
          await conn.rollback();
        } catch (rollbackErr) {
          console.error(
            '[DELETE /users/:id][ROLLBACK]',
            rollbackErr.message
          );
        }
      }

      console.error(
        '[DELETE /users/:id]',
        err
      );

      return fail(
        res,
        err.message ||
          'Không thể cho nhân sự nghỉ việc',
        errorStatus(err, 500)
      );

    } finally {
      if (conn) {
        conn.release();
      }
    }
  }
);

module.exports = router;