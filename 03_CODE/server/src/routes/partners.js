const express = require('express');
const router = express.Router();
const Partner = require('../models/Partner');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');
const { generateNextCode } = require('../utils/codeGenerator');
const { pool } = require('../config/db');

// ============================================================
// HELPER: Validate dữ liệu đầu vào
// ============================================================
const VALID_TYPES = ['customer', 'supplier'];

const validatePartnerInput = (body, isUpdate = false) => {
  const errors = [];

  // type: bắt buộc khi tạo mới, nếu có khi update thì phải hợp lệ
  if (!isUpdate || body.type !== undefined) {
    if (!body.type) {
      errors.push('Thiếu trường "type" (customer hoặc supplier)');
    } else if (!VALID_TYPES.includes(body.type)) {
      errors.push(`"type" phải là "customer" hoặc "supplier" (nhận được: "${body.type}")`);
    }
  }

  // name: bắt buộc khi tạo mới, nếu có khi update thì không được rỗng
  if (!isUpdate || body.name !== undefined) {
    if (!body.name || String(body.name).trim() === '') {
      errors.push('Thiếu trường "name" (tên đối tác không được rỗng)');
    } else if (String(body.name).length > 255) {
      errors.push('"name" không được vượt quá 255 ký tự');
    }
  }

  // code: nếu user tự truyền thì phải đúng format (không chứa ký tự lạ)
  if (body.code !== undefined && body.code !== null && String(body.code).trim() !== '') {
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(String(body.code))) {
      errors.push('"code" chỉ được chứa chữ, số, gạch ngang, gạch dưới (tối đa 50 ký tự)');
    }
  }

  // credit_limit, payment_term: nếu có thì phải >= 0
  if (body.credit_limit !== undefined && Number(body.credit_limit) < 0) {
    errors.push('"credit_limit" không được âm');
  }
  if (body.payment_term !== undefined && Number(body.payment_term) < 0) {
    errors.push('"payment_term" không được âm');
  }

  return errors;
};

// ============================================================
// GET /api/partners — Lấy danh sách (có thể lọc ?type=customer)
// ============================================================
router.get('/', auth, allow('partners'), async (req, res) => {
  const type = req.query.type;
  if (type && !VALID_TYPES.includes(type)) {
    return res.status(400).json({
      success: false,
      error: `"type" phải là "customer" hoặc "supplier" (nhận được: "${type}")`
    });
  }
  const data = await Partner.getAll(type);
  res.json({ success: true, data, count: data.length });
});

// ============================================================
// POST /api/partners — Tạo đối tác mới (có RETRY LOOP chống trùng mã)
// ============================================================
router.post('/', auth, allow('partners'), async (req, res) => {
  // 1. Validate đầu vào
  const errors = validatePartnerInput(req.body, false);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: errors.join('; '), errors });
  }

  const body = { ...req.body };
  const prefix = body.type === 'supplier' ? 'NCC' : 'KH';
  const whereClause = "AND type = '" + body.type + "'";

  // 2. RETRY LOOP: nếu gặp race condition (ER_DUP_ENTRY), tự tăng mã và thử lại
  let attempts = 0;
  const MAX_ATTEMPTS = 5;
  let lastError = null;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;

    // 2.1 Sinh mã nếu user không tự cung cấp
    if (!body.code || String(body.code).trim() === '') {
      body.code = await generateNextCode('partners', 'code', prefix, 3, whereClause);
    }

    try {
      // 2.2 Tạo đối tác
      const id = await Partner.create(body);

      // 2.3 Đọc lại toàn bộ object từ DB để trả về FE ngay
      const [createdRows] = await pool.query('SELECT * FROM partners WHERE id = ?', [id]);
      const created = createdRows[0];

      // 2.4 Ghi audit log
      await logAudit(
        req.user.id,
        'CREATE',
        'partners',
        id,
        null,
        { code: body.code, name: body.name, type: body.type },
        null,
        req.ip
      );

      // 2.5 Trả về FULL object
      return res.status(201).json({
        success: true,
        id,
        code: body.code,
        data: created,
        attempt: attempts
      });
    } catch (err) {
      lastError = err;

      // Nếu lỗi là "Duplicate entry" trên cột code → reset mã và thử lại
      if (err.code === 'ER_DUP_ENTRY' && err.message.includes('code')) {
        console.warn(
          `[POST /partners] Trùng mã "${body.code}" (lần ${attempts}/${MAX_ATTEMPTS}), ` +
          `đang tự tăng và thử lại...`
        );
        // Xóa code cũ để lần sau generateNextCode sinh mã mới
        body.code = null;
        continue;
      }

      // Lỗi khác → throw để global handler bắt
      throw err;
    }
  }

  // Hết MAX_ATTEMPTS vẫn trùng
  return res.status(409).json({
    success: false,
    error: `Không thể sinh mã duy nhất sau ${MAX_ATTEMPTS} lần thử. ` +
           `Vui lòng thử lại hoặc kiểm tra bảng partners có dữ liệu lỗi.`,
    lastError: lastError?.message
  });
});

// ============================================================
// PATCH /api/partners/:id — Cập nhật
// ============================================================
router.patch('/:id', auth, allow('partners'), async (req, res) => {
  const id = req.params.id;

  // 1. Kiểm tra tồn tại
  const old = await Partner.findById(id);
  if (!old) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy đối tác' });
  }

  // 2. Validate
  const errors = validatePartnerInput(req.body, true);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: errors.join('; '), errors });
  }

  // 3. Update
  await Partner.update(id, { ...old, ...req.body });

  // 4. Đọc lại object sau update
  const [updatedRows] = await pool.query('SELECT * FROM partners WHERE id = ?', [id]);

  await logAudit(req.user.id, 'UPDATE', 'partners', id, old, req.body, null, req.ip);

  res.json({
    success: true,
    message: 'Cập nhật thành công',
    data: updatedRows[0]
  });
});

// ============================================================
// DELETE /api/partners/:id — Khóa mềm (is_active = FALSE)
// ============================================================
router.delete('/:id', auth, allow('partners'), async (req, res) => {
  const id = req.params.id;

  const old = await Partner.findById(id);
  if (!old) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy đối tác' });
  }

  if (!old.is_active) {
    return res.status(400).json({ success: false, error: 'Đối tác đã bị khóa trước đó' });
  }

  await pool.query('UPDATE partners SET is_active = FALSE WHERE id = ?', [id]);
  await logAudit(
    req.user.id,
    'DELETE',
    'partners',
    id,
    { is_active: true },
    { is_active: false },
    'Khóa đối tác',
    req.ip
  );

  res.json({ success: true, message: 'Đã khóa đối tác' });
});

module.exports = router;