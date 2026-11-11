const express = require('express'); const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    // 1. Doanh thu
    const [rev] = await pool.query("SELECT SUM(total) as total_revenue FROM orders WHERE type='sale' AND status IN ('approved', 'delivered', 'done')");
    // 2. Đơn hàng chờ duyệt
    const [pendingOrders] = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status='draft'");
    // 3. Task trễ hạn
    const [lateTasks] = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE status != 'done' AND due < NOW()");
    // 4. Tồn kho thấp
    const [lowStock] = await pool.query(`SELECT i.name, COALESCE(SUM(s.signed_qty), 0) as stock, i.min_stock FROM items i LEFT JOIN stock_ledger s ON i.id = s.item_id GROUP BY i.id HAVING stock < i.min_stock`);

    res.json({
      success: true,
      data: {
        revenue: rev[0].total_revenue || 0,
        pending_orders: pendingOrders[0].count,
        late_tasks: lateTasks[0].count,
        low_stock_items: lowStock
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;
