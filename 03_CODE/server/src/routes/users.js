const express = require('express'); const router = express.Router();
const User = require('../models/User'); const auth = require('../middleware/auth');
const { allow } = require('../middleware/rbac'); const { hashPassword } = require('../utils/password');
const jwt = require('jsonwebtoken'); const { logAudit } = require('../middleware/audit');

// SỬA LỖI: Cho phép cả Kế toán và Tổ trưởng lấy danh sách users
router.get('/', auth, async (req, res) => {
  try {
    if (!['giam_doc', 'ke_toan', 'to_truong'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Không có quyền' });
    }
    const [users] = await require('../config/db').pool.query("SELECT id, username, full_name, role, status, team_id, phone, salary_base FROM users WHERE status != 'resigned'");
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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
    const existing = await User.findByUsername(data.username);
    if (existing) return res.status(400).json({ error: 'Username đã tồn tại' });
    data.password_hash = await hashPassword(data.password);
    const newUserId = await User.create(data);
    res.status(201).json({ message: 'Tạo nhân sự thành công', id: newUserId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', auth, allow('users'), async (req, res) => {
  try {
    const data = req.body;
    await User.update(req.params.id, data);
    res.json({ message: 'Cập nhật hồ sơ thành công' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, allow('users'), async (req, res) => {
  try {
    if (req.params.id == req.user.id) throw new Error("Không thể tự xóa chính mình!");
    await require('../config/db').pool.query("UPDATE users SET status = 'resigned' WHERE id = ?", [req.params.id]);
    await logAudit(req.user.id, 'DELETE', 'users', req.params.id, null, null, 'Cho nghỉ việc', req.ip);
    res.json({ message: 'Đã chuyển trạng thái sang Nghỉ việc' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
