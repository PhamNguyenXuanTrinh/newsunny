const express = require('express'); const router = express.Router();
const { pool } = require('../config/db'); const StockLedger = require('../models/StockLedger');
const auth = require('../middleware/auth'); const { logAudit } = require('../middleware/audit');

router.get('/', auth, async (req, res) => {
  const data = await StockLedger.getAll(); res.json({ success: true, data });
});

router.get('/balance', auth, async (req, res) => {
  const [rows] = await pool.query(`SELECT i.id, i.code, i.name, COALESCE(SUM(s.signed_qty), 0) as stock FROM items i LEFT JOIN stock_ledger s ON i.id = s.item_id GROUP BY i.id`);
  res.json({ success: true, data: rows });
});

router.post('/', auth, async (req, res) => {
  try {
    const signed = req.body.type === 'out' ? -Math.abs(req.body.qty) : Math.abs(req.body.qty);
    await StockLedger.create({ ...req.body, signed_qty: signed, created_by: req.user.id });
    await logAudit(req.user.id, 'CREATE', 'stock_ledger', null, null, req.body, null, req.ip);
    res.status(201).json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;
