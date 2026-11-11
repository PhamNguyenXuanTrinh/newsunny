const express = require('express'); const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

router.get('/', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM sop_docs ORDER BY id DESC');
  res.json({ success: true, data: rows });
});
router.post('/', auth, async (req, res) => {
  const { code, title, steps, owner, tags } = req.body;
  const [result] = await pool.query('INSERT INTO sop_docs (code, title, steps, owner, tags, created_by) VALUES (?, ?, ?, ?, ?, ?)', [code, title, steps, owner, tags, req.user.id]);
  await logAudit(req.user.id, 'CREATE', 'sop_docs', result.insertId, null, req.body, null, req.ip);
  res.status(201).json({ success: true, id: result.insertId });
});
module.exports = router;
