const express = require('express'); const router = express.Router();
const Item = require('../models/Item'); const auth = require('../middleware/auth');
const { allow } = require('../middleware/rbac'); const { logAudit } = require('../middleware/audit');

router.get('/', auth, allow('items'), async (req, res) => {
  const data = await Item.getAll(req.query.type);
  res.json({ success: true, data });
});

router.post('/', auth, allow('items'), async (req, res) => {
  const id = await Item.create(req.body);
  await logAudit(req.user.id, 'CREATE', 'items', id, null, req.body, null, req.ip);
  res.status(201).json({ success: true, id });
});

router.patch('/:id', auth, allow('items'), async (req, res) => {
  const old = await Item.findById(req.params.id);
  await Item.update(req.params.id, req.body);
  await logAudit(req.user.id, 'UPDATE', 'items', req.params.id, old, req.body, null, req.ip);
  res.json({ success: true, message: 'Cập nhật thành công' });
});

router.delete('/:id', auth, allow('items'), async (req, res) => {
  try {
    await require('../config/db').pool.query("UPDATE items SET is_active = FALSE WHERE id = ?", [req.params.id]);
    await logAudit(req.user.id, 'DELETE', 'items', req.params.id, null, null, 'Ngừng kinh doanh', req.ip);
    res.json({ success: true, message: 'Đã ngừng kinh doanh mặt hàng' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});
module.exports = router;
