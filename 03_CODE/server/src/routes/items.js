const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/rbac');
const { logAudit } = require('../middleware/audit');

router.get('/', auth, allow('users'), async (req, res) => {
  try {
    const data = await Item.getAll(req.query.type);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', auth, allow('users'), async (req, res) => {
  try {
    const data = await Item.findById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Không tìm thấy' });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, allow('users'), async (req, res) => {
  try {
    const id = await Item.create(req.body);
    await logAudit(req.user.id, 'CREATE', 'items', id, null, req.body, null, req.ip);
    res.status(201).json({ success: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', auth, allow('users'), async (req, res) => {
  try {
    const old = await Item.findById(req.params.id);
    await Item.update(req.params.id, req.body);
    await logAudit(req.user.id, 'UPDATE', 'items', req.params.id, old, req.body, null, req.ip);
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, allow('users'), async (req, res) => {
  try {
    await Item.delete(req.params.id);
    await logAudit(req.user.id, 'DELETE', 'items', req.params.id, null, null, 'Xóa mềm', req.ip);
    res.json({ success: true, message: 'Đã xóa' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
