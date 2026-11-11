const { pool } = require('../config/db');

const Task = {
  getAll: async (assigneeId) => {
    let sql = 'SELECT * FROM tasks';
    let params = [];
    if (assigneeId) { sql += ' WHERE assignee_id = ?'; params.push(assigneeId); }
    const [rows] = await pool.query(sql + ' ORDER BY id DESC', params);
    return rows;
  },
  create: async (d) => {
    const [res] = await pool.query(
      'INSERT INTO tasks (code, title, description, assignee_id, assigned_by, team_id, priority, due, start_date, kpi_weight, evidence_required, task_type, revenue_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [d.code || 'T'+Date.now(), d.title, d.description, d.assignee_id, d.assigned_by, d.team_id, d.priority||'normal', d.due, d.start_date||null, d.kpi_weight||1, d.evidence_required!==false, d.task_type||'kpi', d.revenue_value||0]
    );
    return res.insertId;
  },
  updateStatus: async (id, status, evidence) => {
    if (status === 'done') {
      const [task] = await pool.query('SELECT evidence_required FROM tasks WHERE id = ?', [id]);
      if (task[0].evidence_required && !evidence) throw new Error('Công việc này bắt buộc phải nộp bằng chứng!');
    }
    const doneAt = status === 'done' ? new Date() : null;
    await pool.query(`UPDATE tasks SET status = ?, evidence = COALESCE(?, evidence), done_at = COALESCE(?, done_at) WHERE id = ?`, [status, evidence, doneAt, id]);
  }
};

const Attendance = {
  checkIn: async (userId, shift) => {
    const today = new Date().toISOString().split('T')[0];
    const [exist] = await pool.query('SELECT id FROM attendance WHERE user_id = ? AND date = ?', [userId, today]);
    if (exist.length > 0) throw new Error('Hôm nay đã chấm công vào rồi');
    await pool.query('INSERT INTO attendance (user_id, date, check_in, shift) VALUES (?, ?, NOW(), ?)', [userId, today, shift||'office']);
  },
  checkOut: async (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await pool.query('SELECT id, check_in FROM attendance WHERE user_id = ? AND date = ?', [userId, today]);
    if (rows.length === 0) throw new Error('Chưa chấm công vào hôm nay');
    const checkIn = new Date(rows[0].check_in);
    const checkOut = new Date();
    const diffHours = (checkOut - checkIn) / (1000 * 60 * 60);
    const workHours = Math.min(8, diffHours);
    const otHours = Math.max(0, diffHours - 8);
    await pool.query('UPDATE attendance SET check_out = NOW(), work_hours = ?, ot_hours = ? WHERE id = ?', [workHours, otHours, rows[0].id]);
  },
  getByMonth: async (userId, period) => {
    const [rows] = await pool.query('SELECT * FROM attendance WHERE user_id = ? AND date LIKE ?', [userId, period + '%']);
    return rows;
  }
};

const Payroll = {
  calculateKPI: async (userId, period) => {
    const now = new Date();
    let startDate;
    if (period === 'day') { startDate = new Date(now.setHours(0,0,0,0)); }
    else if (period === 'week') { const day = now.getDay() || 7; startDate = new Date(now.setDate(now.getDate() - day + 1)); }
    else if (period === 'month') { startDate = new Date(now.getFullYear(), now.getMonth(), 1); }
    else if (period === 'quarter') { const q = Math.floor(now.getMonth()/3); startDate = new Date(now.getFullYear(), q*3, 1); }
    else { startDate = new Date(now.getFullYear(), 0, 1); }
    const startStr = startDate.toISOString().slice(0, 19).replace('T', ' ');

    const [rows] = await pool.query(`
      SELECT SUM(kpi_weight) as total_weight, SUM(CASE WHEN status='done' AND evidence IS NOT NULL THEN kpi_weight ELSE 0 END) as done_weight
      FROM tasks WHERE assignee_id = ? AND task_type = 'kpi' AND done_at >= ?
    `, [userId, startStr]);
    
    if (!rows[0].total_weight || rows[0].total_weight == 0) return { kpi: 0, bonus: 0, rank: 'Không có KPI' };
    
    const kpiPercent = (rows[0].done_weight / rows[0].total_weight) * 100;
    let bonus = 0; let rank = 'Chưa đạt';
    if (kpiPercent >= 90) { bonus = 1500000; rank = 'Tốt'; }
    else if (kpiPercent >= 50) { bonus = 700000; rank = 'Trung bình'; }
    return { kpi: kpiPercent, bonus, rank };
  },
  generate: async (userId, period) => {
    const [users] = await pool.query(`SELECT * FROM users WHERE id = ? AND status = 'active'`, [userId]);
    if (users.length === 0) throw new Error('User không tồn tại hoặc đã nghỉ việc');
    const user = users[0];

    const [att] = await pool.query('SELECT SUM(work_hours) as wh, SUM(ot_hours) as oh FROM attendance WHERE user_id = ? AND date LIKE ?', [userId, period + '%']);
    const workHours = Number(att[0].wh || 0);
    const otHours = Number(att[0].oh || 0);

    const hourlyRate = user.salary_base / (26 * 8);
    const workPay = workHours * hourlyRate;
    const otPay = otHours * hourlyRate * 1.5;

    const kpiData = await Payroll.calculateKPI(userId, 'month');
    const bhxh = user.salary_base * 0.105;
    const net = workPay + otPay + kpiData.bonus - bhxh;

    await pool.query(`
      INSERT INTO payrolls (period, user_id, salary_base, work_pay, ot_pay, kpi_bonus, bhxh_deduction, net_salary, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
      ON DUPLICATE KEY UPDATE work_pay = VALUES(work_pay), ot_pay = VALUES(ot_pay), kpi_bonus = VALUES(kpi_bonus), net_salary = VALUES(net_salary)
    `, [period, userId, user.salary_base, workPay, otPay, kpiData.bonus, bhxh, net]);

    return { kpi: kpiData, workPay, otPay, net };
  }
};

module.exports = { Task, Attendance, Payroll };
