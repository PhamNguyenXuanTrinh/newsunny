const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');
const { generateNextCode } = require('../utils/codeGenerator');
const { pool } = require('../config/db');

// ============================================================
// HELPER: Validate dữ liệu đầu vào
// ============================================================
const VALID_TYPES = ['material', 'product'];

const validateItemInput = (body, isUpdate = false) => {
  const errors = [];

  // type: bắt buộc khi tạo mới
  if (!isUpdate || body.type !== undefined) {
    if (!body.type) {
      errors.push('Thiếu trường "type" (material hoặc product)');
    } else if (!VALID_TYPES.includes(body.type)) {
      errors.push(`"type" phải là "material" hoặc "product" (nhận được: "${body.type}")`);
    }
  }

  // name: bắt buộc khi tạo mới
  if (!isUpdate || body.name !== undefined) {
    if (!body.name || String(body.name).trim() === '') {
      errors.push('Thiếu trường "name" (tên hàng hóa không được rỗng)');
    } else if (String(body.name).length > 255) {
      errors.push('"name" không được vượt quá 255 ký tự');
    }
  }

  // unit: bắt buộc khi tạo mới
  if (!isUpdate || body.unit !== undefined) {
    if (!body.unit || String(body.unit).trim() === '') {
      errors.push('Thiếu trường "unit" (đơn vị tính)');
    } else if (String(body.unit).length > 20) {
      errors.push('"unit" không được vượt quá 20 ký tự');
    }
  }

  // code: nếu user tự truyền thì phải đúng format
  if (body.code !== undefined && body.code !== null && String(body.code).trim() !== '') {
    if (!/^[A-Za-z0-9_-]{1,50}$/.test(String(body.code))) {
      errors.push('"code" chỉ được chứa chữ, số, gạch ngang, gạch dưới (tối đa 50 ký tự)');
    }
  }

  // Các trường số không được âm
  const numericFields = ['price_in', 'price_out', 'price_floor', 'min_stock', 'max_stock', 'weight'];
  for (const f of numericFields) {
    if (body[f] !== undefined && body[f] !== null && body[f] !== '' && Number(body[f]) < 0) {
      errors.push(`"${f}" không được âm`);
    }
  }

  // max_stock phải >= min_stock (nếu cả 2 cùng được gửi)
  if (body.min_stock !== undefined && body.max_stock !== undefined) {
    if (Number(body.max_stock) > 0 && Number(body.max_stock) < Number(body.min_stock)) {
      errors.push('"max_stock" phải lớn hơn hoặc bằng "min_stock"');
    }
  }

  return errors;
};

// ============================================================
// GET /api/items — Lấy danh sách (lọc ?type=material hoặc ?type=product)
// ============================================================
router.get('/', auth, allow('items'), async (req, res) => {
  const type = req.query.type;
  if (type && !VALID_TYPES.includes(type)) {
    return res.status(400).json({
      success: false,
      error: `"type" phải là "material" hoặc "product" (nhận được: "${type}")`
    });
  }
  const data = await Item.getAll(type);
  res.json({ success: true, data, count: data.length });
});

// ============================================================
// POST /api/items — Tạo hàng hóa mới (có RETRY LOOP chống trùng mã)
// ============================================================
router.post('/', auth, allow('items'), async (req, res) => {
  // 1. Validate đầu vào
  const errors = validateItemInput(req.body, false);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: errors.join('; '), errors });
  }

  const body = { ...req.body };
  const prefix = body.type === 'material' ? 'VT' : 'TP';
  const whereClause = "AND type = '" + body.type + "'";

  // 2. RETRY LOOP: nếu gặp race condition (ER_DUP_ENTRY), tự tăng mã và thử lại
  let attempts = 0;
  const MAX_ATTEMPTS = 5;
  let lastError = null;

  while (attempts < MAX_ATTEMPTS) {
    attempts++;

    // 2.1 Sinh mã nếu user không tự cung cấp
    if (!body.code || String(body.code).trim() === '') {
      body.code = await generateNextCode('items', 'code', prefix, 3, whereClause);
    }

    try {
      // 2.2 Tạo hàng hóa
      const id = await Item.create(body);

      // 2.3 Đọc lại object đầy đủ
      const [createdRows] = await pool.query('SELECT * FROM items WHERE id = ?', [id]);
      const created = createdRows[0];

      // 2.4 Audit
      await logAudit(
        req.user.id,
        'CREATE',
        'items',
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

      // Nếu trùng mã → reset và thử lại
      if (err.code === 'ER_DUP_ENTRY' && err.message.includes('code')) {
        console.warn(
          `[POST /items] Trùng mã "${body.code}" (lần ${attempts}/${MAX_ATTEMPTS}), ` +
          `đang tự tăng và thử lại...`
        );
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
           `Vui lòng thử lại hoặc kiểm tra bảng items có dữ liệu lỗi.`,
    lastError: lastError?.message
  });
});

// ============================================================
// PATCH /api/items/:id — Cập nhật
// ============================================================
router.patch('/:id', auth, allow('items'), async (req, res) => {
  const id = req.params.id;

  // 1. Kiểm tra tồn tại
  const old = await Item.findById(id);
  if (!old) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy hàng hóa' });
  }

  // 2. Validate
  const errors = validateItemInput(req.body, true);
  if (errors.length > 0) {
    return res.status(400).json({ success: false, error: errors.join('; '), errors });
  }

  // 3. Update (merge old + new để không ghi đè field không gửi)
  await Item.update(id, { ...old, ...req.body });

  // 4. Đọc lại object sau update
  const [updatedRows] = await pool.query('SELECT * FROM items WHERE id = ?', [id]);

  await logAudit(req.user.id, 'UPDATE', 'items', id, old, req.body, null, req.ip);

  res.json({
    success: true,
    message: 'Cập nhật thành công',
    data: updatedRows[0]
  });
});

// ============================================================
// DELETE /api/items/:id — Ngừng kinh doanh (is_active = FALSE)
// ============================================================
router.delete('/:id', auth, allow('items'), async (req, res) => {
  const id = req.params.id;

  const old = await Item.findById(id);
  if (!old) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy hàng hóa' });
  }

  if (!old.is_active) {
    return res.status(400).json({ success: false, error: 'Hàng hóa đã ngừng kinh doanh trước đó' });
  }

  await pool.query('UPDATE items SET is_active = FALSE WHERE id = ?', [id]);
  await logAudit(
    req.user.id,
    'DELETE',
    'items',
    id,
    { is_active: true },
    { is_active: false },
    'Ngừng kinh doanh',
    req.ip
  );

  res.json({ success: true, message: 'Đã ngừng kinh doanh mặt hàng' });
});

module.exports = router;