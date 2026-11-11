const express = require('express'); const router = express.Router();
const Partner = require('../models/Partner'); const auth = require('../middleware/auth');
const { allow } = require('../middleware/rbac'); const { logAudit } = require('../middleware/audit');

// Cho phép cả Kế toán và CTV
router.get('/', auth, allow('partners'), async (req, res) => {
  const data = await Partner.getAll(req.query.type);
  res.json({ success: true, data });
});

router.post('/', auth, allow('partners'), async (req, res) => {
  const id = await Partner.create(req.body);
  await logAudit(req.user.id, 'CREATE', 'partners', id, null, req.body, null, req.ip);
  res.status(201).json({ success: true, id });
});

router.patch('/:id', auth, allow('partners'), async (req, res) => {
  const old = await Partner.findById(req.params.id);
  await Partner.update(req.params.id, req.body);
  await logAudit(req.user.id, 'UPDATE', 'partners', req.params.id, old, req.body, null, req.ip);
  res.json({ success: true, message: 'Cập nhật thành công' });
});

router.delete('/:id', auth, allow('partners'), async (req, res) => {
  try {
    await require('../config/db').pool.query("UPDATE partners SET is_active = FALSE WHERE id = ?", [req.params.id]);
    await logAudit(req.user.id, 'DELETE', 'partners', req.params.id, null, null, 'Khóa đối tác', req.ip);
    res.json({ success: true, message: 'Đã khóa đối tác' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});
module.exports = router;
