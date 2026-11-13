const express = require('express');
const router = express.Router();

const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { generateNextCode } = require('../utils/codeGenerator');


// ======================================================
// GET - DANH SÁCH TÀI SẢN
// ======================================================
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM assets ORDER BY id DESC'
    );

    res.json({
      success: true,
      data: rows
    });

  } catch (err) {
    console.error('[GET /assets]', err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


// ======================================================
// POST - THÊM TÀI SẢN
// Mã TS tự động nếu frontend không truyền code
// ======================================================
router.post('/', auth, async (req, res) => {
  try {
    let {
      code,
      serial_no,
      name,
      brand,
      purchase_date,
      price,
      warranty_until,
      depreciation,
      location,
      last_maintenance,
      next_maintenance,
      status
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Tên tài sản là bắt buộc'
      });
    }

    // TỰ ĐỘNG SINH TS001, TS002, TS003...
    if (!code || String(code).trim() === '') {
      code = await generateNextCode(
        'assets',
        'code',
        'TS',
        3
      );
    } else {
      code = String(code).trim();
    }

    const [result] = await pool.query(
      `
      INSERT INTO assets (
        code,
        serial_no,
        name,
        brand,
        purchase_date,
        price,
        warranty_until,
        depreciation,
        location,
        last_maintenance,
        next_maintenance,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        code,
        serial_no || null,
        String(name).trim(),
        brand || null,
        purchase_date || null,
        Number(price) || 0,
        warranty_until || null,
        Number(depreciation) || 0,
        location || null,
        last_maintenance || null,
        next_maintenance || null,
        status || 'active'
      ]
    );

    await logAudit(
      req.user.id,
      'CREATE',
      'assets',
      result.insertId,
      null,
      { ...req.body, code },
      null,
      req.ip
    );

    const [rows] = await pool.query(
      'SELECT * FROM assets WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: rows[0]
    });

  } catch (err) {
    console.error('[POST /assets]', err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Mã tài sản đã tồn tại'
      });
    }

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


// ======================================================
// PATCH - CẬP NHẬT TÀI SẢN
// ======================================================
router.patch('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const [oldRows] = await pool.query(
      'SELECT * FROM assets WHERE id = ?',
      [id]
    );

    if (!oldRows.length) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy tài sản'
      });
    }

    const oldAsset = oldRows[0];

    const {
      serial_no,
      name,
      brand,
      purchase_date,
      price,
      warranty_until,
      depreciation,
      location,
      last_maintenance,
      next_maintenance,
      status
    } = req.body;

    const newAsset = {
      serial_no:
        serial_no !== undefined
          ? serial_no || null
          : oldAsset.serial_no,

      name:
        name !== undefined
          ? name
          : oldAsset.name,

      brand:
        brand !== undefined
          ? brand || null
          : oldAsset.brand,

      purchase_date:
        purchase_date !== undefined
          ? purchase_date || null
          : oldAsset.purchase_date,

      price:
        price !== undefined
          ? Number(price) || 0
          : oldAsset.price,

      warranty_until:
        warranty_until !== undefined
          ? warranty_until || null
          : oldAsset.warranty_until,

      depreciation:
        depreciation !== undefined
          ? Number(depreciation) || 0
          : oldAsset.depreciation,

      location:
        location !== undefined
          ? location || null
          : oldAsset.location,

      last_maintenance:
        last_maintenance !== undefined
          ? last_maintenance || null
          : oldAsset.last_maintenance,

      next_maintenance:
        next_maintenance !== undefined
          ? next_maintenance || null
          : oldAsset.next_maintenance,

      status:
        status !== undefined
          ? status
          : oldAsset.status
    };

    await pool.query(
      `
      UPDATE assets
      SET
        serial_no = ?,
        name = ?,
        brand = ?,
        purchase_date = ?,
        price = ?,
        warranty_until = ?,
        depreciation = ?,
        location = ?,
        last_maintenance = ?,
        next_maintenance = ?,
        status = ?
      WHERE id = ?
      `,
      [
        newAsset.serial_no,
        newAsset.name,
        newAsset.brand,
        newAsset.purchase_date,
        newAsset.price,
        newAsset.warranty_until,
        newAsset.depreciation,
        newAsset.location,
        newAsset.last_maintenance,
        newAsset.next_maintenance,
        newAsset.status,
        id
      ]
    );

    await logAudit(
      req.user.id,
      'UPDATE',
      'assets',
      id,
      oldAsset,
      newAsset,
      null,
      req.ip
    );

    const [rows] = await pool.query(
      'SELECT * FROM assets WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: rows[0]
    });

  } catch (err) {
    console.error('[PATCH /assets/:id]', err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


module.exports = router;