const express = require('express'); const router = express.Router();
const { Task } = require('../models/HrModels');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.get('/', auth, async (req, res) => {
  const data = await Task.getAll(req.user.role === 'cong_nhan' ? req.user.id : null);
  res.json({ success: true, data });
});
router.post('/', auth, async (req, res) => {
  req.body.assigned_by = req.user.id;
  const id = await Task.create(req.body);
  await logAudit(req.user.id, 'CREATE', 'tasks', id, null, req.body, null, req.ip);
  res.status(201).json({ success: true, id });
});
router.patch('/:id', auth, async (req, res) => {
  await Task.updateStatus(req.params.id, req.body.status, req.body.evidence);
  res.json({ success: true });
});
module.exports = router;
