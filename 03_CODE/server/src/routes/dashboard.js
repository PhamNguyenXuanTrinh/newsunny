const express = require('express'); const router = express.Router();
const { pool } = require('../config/db'); const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const role = req.user.role; 
    const userId = req.user.id; 
    let data = { type: role };
    const period = req.query.period || 'month';

    // 1. Tính mốc thời gian (ĐÃ SỬA LỖI)
    const now = new Date();
    let startDate, endDate, lastMonthStart, lastMonthEnd;
    
    if (period === 'day') { 
      startDate = new Date(now.setHours(0,0,0,0)); 
      endDate = new Date(now.setHours(23,59,59,999)); 
      lastMonthStart = new Date(startDate); // Mặc định lấy cùng ngày để so sánh
      lastMonthEnd = new Date(endDate);
    }
    else if (period === 'week') { 
      const day = now.getDay() || 7; 
      startDate = new Date(now.setDate(now.getDate() - day + 1)); 
      endDate = new Date(); 
      lastMonthStart = new Date(startDate); // Mặc định lấy cùng tuần để so sánh
      lastMonthEnd = new Date(endDate);
    }
    else if (period === 'month') { 
      startDate = new Date(now.getFullYear(), now.getMonth(), 1); 
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); 
      lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    }
    else if (period === 'quarter') { 
      const q = Math.floor(now.getMonth()/3); 
      startDate = new Date(now.getFullYear(), q*3, 1); 
      endDate = new Date(now.getFullYear(), q*3 + 3, 0); 
      lastMonthStart = new Date(now.getFullYear(), q*3 - 3, 1);
      lastMonthEnd = new Date(now.getFullYear(), q*3, 0);
    }
    else { 
      startDate = new Date(now.getFullYear(), 0, 1); 
      endDate = new Date(now.getFullYear(), 11, 31); 
      lastMonthStart = new Date(now.getFullYear() - 1, 0, 1);
      lastMonthEnd = new Date(now.getFullYear() - 1, 11, 31);
    }
    
    const startStr = startDate.toISOString().slice(0, 19).replace('T', ' ');
    const endStr = endDate.toISOString().slice(0, 19).replace('T', ' ');
    const startDateStr = startDate.toISOString().slice(0, 10);
    const endDateStr = endDate.toISOString().slice(0, 10);
    const lastMonthStartStr = lastMonthStart.toISOString().slice(0, 10);
    const lastMonthEndStr = lastMonthEnd.toISOString().slice(0, 10);

    if (role === 'giam_doc') {
      // 1. Doanh thu
      const [rev] = await pool.query(`SELECT SUM(total) as total FROM orders WHERE type='sale' AND status IN ('approved', 'delivered', 'done') AND created_at BETWEEN ? AND ?`, [startStr, endStr]);
      
      // 2. Sản lượng (Bọc try/catch phòng hờ bảng chưa có)
      let prodTotal = 0;
      try {
        const [prod] = await pool.query(`SELECT SUM(good_qty) as total_m2 FROM shift_reports WHERE day BETWEEN ? AND ?`, [startDateStr, endDateStr]);
        prodTotal = Number(prod[0].total_m2 || 0);
      } catch (e) {
        console.log("Lưu ý: Bảng shift_reports chưa có dữ liệu.");
      }
      
      // 3. Tiền mặt
      const [thu] = await pool.query(`SELECT SUM(amount) as total FROM payments WHERE paid_at BETWEEN ? AND ?`, [startStr, endStr]);
      const [chi] = await pool.query(`SELECT SUM(amount) as total FROM costs WHERE date BETWEEN ? AND ?`, [startDateStr, endDateStr]);
      const cash = Number(thu[0].total || 0) - Number(chi[0].total || 0);

      // 4. Công nợ
      const [debt] = await pool.query(`SELECT SUM(total - paid_amount) as total FROM orders WHERE type='sale' AND payment_status != 'paid'`);
      
      // 5. KPI
      const [kpi] = await pool.query(`
        SELECT SUM(CASE WHEN t.status = 'done' THEN t.kpi_weight ELSE 0 END) as done, SUM(t.kpi_weight) as total
        FROM tasks t JOIN users u ON t.assignee_id = u.id WHERE u.role != 'giam_doc' AND t.created_at BETWEEN ? AND ?
      `, [startStr, endStr]);
      const kpiPercent = kpi[0].total > 0 ? Math.round((kpi[0].done / kpi[0].total) * 100) : 0;

      // 6. Kaizen (Sẽ báo 0% nếu chọn kỳ Ngày/Tuần)
      const [chiKyTruoc] = await pool.query(`SELECT SUM(amount) as total FROM costs WHERE date BETWEEN ? AND ?`, [lastMonthStartStr, lastMonthEndStr]);
      const costThisPeriod = Number(chi[0].total || 0);
      const costLastPeriod = Number(chiKyTruoc[0].total || 0);
      let kaizenPercent = 0;
      if (costLastPeriod > 0 && costLastPeriod !== costThisPeriod) {
        kaizenPercent = ((costLastPeriod - costThisPeriod) / costLastPeriod) * 100;
      }

      const [pendingOrders] = await pool.query(`SELECT COUNT(*) as count FROM orders WHERE status='draft'`);
      const [lowStock] = await pool.query(`SELECT i.name, COALESCE(SUM(s.signed_qty), 0) as stock FROM items i LEFT JOIN stock_ledger s ON i.id = s.item_id GROUP BY i.id, i.name, i.min_stock HAVING COALESCE(SUM(s.signed_qty), 0) < i.min_stock`);
      const [kpiData] = await pool.query(`
        SELECT u.id, u.full_name, u.team_id, COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.kpi_weight ELSE 0 END), 0) as done_weight, COALESCE(SUM(t.kpi_weight), 0) as total_weight
        FROM users u LEFT JOIN tasks t ON u.id = t.assignee_id AND t.created_at BETWEEN ? AND ? WHERE u.role IN ('ke_toan', 'to_truong', 'cong_nhan', 'ctv') GROUP BY u.id
      `, [startStr, endStr]);

      data.revenue = Number(rev[0].total || 0);
      data.production = prodTotal;
      data.cash = cash;
      data.debt = Number(debt[0].total || 0);
      data.kpi = kpiPercent;
      data.kaizen = Number(kaizenPercent.toFixed(1));
      data.pending_orders = pendingOrders[0].count;
      data.low_stock_items = lowStock;
      data.kpi_leaderboard = kpiData;
    } 
    else if (role === 'ke_toan') {
      const [receivable] = await pool.query("SELECT COALESCE(SUM(total - paid_amount), 0) as total FROM orders WHERE type='sale' AND payment_status != 'paid'");
      const [payable] = await pool.query("SELECT COALESCE(SUM(total - paid_amount), 0) as total FROM orders WHERE type='purchase' AND payment_status != 'paid'");
      const [collected] = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE paid_at BETWEEN ? AND ?", [startStr, endStr]);
      const [spent] = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM costs WHERE date BETWEEN ? AND ?", [startDateStr, endDateStr]);
      data.receivable = Number(receivable[0].total); data.payable = Number(payable[0].total);
      data.collected = Number(collected[0].total); data.spent = Number(spent[0].total);
    }
    else if (role === 'to_truong') {
      const [tasks] = await pool.query(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done, SUM(CASE WHEN status = 'doing' THEN 1 ELSE 0 END) as doing, SUM(CASE WHEN status != 'done' AND due < NOW() THEN 1 ELSE 0 END) as late FROM tasks WHERE team_id = ? AND created_at BETWEEN ? AND ?`, [req.user.team_id, startStr, endStr]);
      const [workers] = await pool.query(`SELECT u.id, u.full_name, COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.kpi_weight ELSE 0 END), 0) as done_weight, COALESCE(SUM(t.kpi_weight), 0) as total_weight FROM users u LEFT JOIN tasks t ON u.id = t.assignee_id AND t.created_at BETWEEN ? AND ? WHERE u.team_id = ? AND u.role = 'cong_nhan' GROUP BY u.id`, [startStr, endStr, req.user.team_id]);
      data.team_tasks = tasks[0]; data.workers = workers;
    }
    else {
      const [myTasks] = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE assignee_id = ? AND status != 'done' AND created_at BETWEEN ? AND ?", [userId, startStr, endStr]);
      const [myLateTasks] = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE assignee_id = ? AND status != 'done' AND due < NOW() AND created_at BETWEEN ? AND ?", [userId, startStr, endStr]);
      data.my_todo_tasks = myTasks[0].count; data.my_late_tasks = myLateTasks[0].count;
    }
    res.json({ success: true, data });
  } catch (err) { 
    console.error("Dashboard Error:", err);
    res.status(500).json({ error: err.message }); 
  }
});
module.exports = router;