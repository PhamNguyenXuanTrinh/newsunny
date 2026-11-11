const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/rbac');
const { hashPassword } = require('../utils/password');
const jwt = require('jsonwebtoken');

// Lấy danh sách
router.get('/', auth, allow('users'), async (req, res) => {
  const users = await User.getAll();
  res.json(users);
});

// Tạo mới
router.post('/', async (req, res) => {
  try {
    const count = await User.countAll();
    if (count > 0) {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'Cần token' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role !== 'giam_doc') return res.status(403).json({ error: 'Chỉ GĐ mới được tạo' });
    }
    
    const data = req.body;
    if (!data.username || !data.password || !data.role || !data.full_name) {
       return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }
    
    const existing = await User.findByUsername(data.username);
    if (existing) return res.status(400).json({ error: 'Username đã tồn tại' });
    
    data.password_hash = await hashPassword(data.password);
    const newUserId = await User.create(data);
    res.status(201).json({ message: 'Tạo nhân sự thành công', id: newUserId });
  } catch (err) { 
    console.error("Lỗi Database:", err.sqlMessage || err.message);
    res.status(500).json({ error: err.sqlMessage || err.message }); 
  }
});

// Cập nhật thông tin (Update)
router.patch('/:id', auth, allow('users'), async (req, res) => {
  try {
    const data = req.body;
    if (!data.role || !data.full_name) {
      return res.status(400).json({ error: 'Không được để trống role hoặc full_name' });
    }
    await User.update(req.params.id, data);
    res.json({ message: 'Cập nhật hồ sơ thành công' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// XÓA MỀM (Đổi trạng thái thành resigned hoặc suspended)
router.delete('/:id', auth, allow('users'), async (req, res) => {
  try {
    await User.changeStatus(req.params.id, 'resigned');
    res.json({ message: 'Đã cho nhân viên nghỉ việc (Xóa mềm thành công)' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// CẤP LẠI MẬT KHẨU (Reset Password)
router.patch('/:id/reset-password', auth, allow('users'), async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 3) {
      return res.status(400).json({ error: 'Mật khẩu mới phải từ 3 ký tự' });
    }
    const hash = await hashPassword(new_password);
    await User.updatePassword(req.params.id, hash);
    res.json({ message: 'Đã cấp lại mật khẩu mới thành công' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
