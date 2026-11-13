const { pool } = require('../config/db');

const safeQuery = async (sql, params = []) => {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (err) {
    console.error('[COMPANY CONTEXT QUERY ERROR]', err.message);
    return [];
  }
};

const money = v => `${Number(v || 0).toLocaleString('vi-VN')} VNĐ`;
const num = v => Number(v || 0).toLocaleString('vi-VN');

const normalize = str =>
  String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hasPhrase = (q, phrase) => ` ${normalize(q)} `.includes(` ${normalize(phrase)} `);
const hasAnyPhrase = (q, arr) => arr.some(x => hasPhrase(q, x));
const hasWord = (q, word) => normalize(q).split(/\s+/).includes(normalize(word));

const detectPeriod = question => {
  const q = normalize(question);
  if (hasAnyPhrase(q, ['hom nay','trong ngay','ngay nay'])) return 'day';
  if (hasAnyPhrase(q, ['tuan nay','trong tuan'])) return 'week';
  if (hasAnyPhrase(q, ['nam nay','trong nam'])) return 'year';
  return 'month';
};

const dateCondition = (column, period) => {
  if (period === 'day') return `DATE(${column}) = CURDATE()`;
  if (period === 'week') return `YEARWEEK(${column},1)=YEARWEEK(CURDATE(),1)`;
  if (period === 'year') return `YEAR(${column})=YEAR(CURDATE())`;
  return `MONTH(${column})=MONTH(CURDATE()) AND YEAR(${column})=YEAR(CURDATE())`;
};

const getSalesContext = async period => {
  const condition = dateCondition('created_at', period);
  const summary = await safeQuery(`
    SELECT COUNT(*) total_orders,COALESCE(SUM(total),0) sales_value,COALESCE(SUM(paid_amount),0) paid_value,COALESCE(SUM(total-paid_amount),0) receivable
    FROM orders WHERE type='sale' AND status<>'cancelled' AND ${condition}
  `);
  const statuses = await safeQuery(`
    SELECT status,COUNT(*) total FROM orders
    WHERE type='sale' AND ${condition}
    GROUP BY status ORDER BY total DESC
  `);
  const outstanding = await safeQuery(`
    SELECT COUNT(*) unpaid_orders,COALESCE(SUM(total-paid_amount),0) total_receivable
    FROM orders WHERE type='sale' AND status<>'cancelled' AND payment_status<>'paid'
  `);
  const unpaid = await safeQuery(`
    SELECT o.code,p.name customer_name,o.total,o.paid_amount,(o.total-o.paid_amount) remaining,o.due_date,o.status
    FROM orders o JOIN partners p ON p.id=o.partner_id
    WHERE o.type='sale' AND o.status<>'cancelled' AND o.payment_status<>'paid'
    ORDER BY remaining DESC LIMIT 10
  `);
  const x = summary[0] || {};
  const debt = outstanding[0] || {};
  let text = `[ĐƠN BÁN & DOANH THU]
- Số đơn kỳ này: ${num(x.total_orders)}
- Giá trị đơn bán: ${money(x.sales_value)}
- Đã ghi nhận thanh toán trên đơn: ${money(x.paid_value)}
- Còn phải thu phát sinh trong kỳ: ${money(x.receivable)}
- Tổng công nợ phải thu hiện tại: ${money(debt.total_receivable)}
- Số đơn còn công nợ: ${num(debt.unpaid_orders)}
`;
  if (statuses.length) text += `- Trạng thái đơn: ${statuses.map(x => `${x.status}: ${x.total}`).join(', ')}\n`;
  if (unpaid.length) {
    text += `[TOP CÔNG NỢ KHÁCH HÀNG]\n`;
    for (const r of unpaid) text += `- ${r.code} | ${r.customer_name} | Còn ${money(r.remaining)} | ${r.status}${r.due_date ? ` | Hạn ${r.due_date}` : ''}\n`;
  }
  return text;
};

const getPaymentsContext = async period => {
  const condition = dateCondition('paid_at', period);
  const rows = await safeQuery(`SELECT COUNT(*) total_transactions,COALESCE(SUM(amount),0) total_amount FROM payments WHERE ${condition}`);
  const methods = await safeQuery(`SELECT method,COUNT(*) total_transactions,COALESCE(SUM(amount),0) total_amount FROM payments WHERE ${condition} GROUP BY method`);
  const x = rows[0] || {};
  return `[THANH TOÁN]
- Số giao dịch: ${num(x.total_transactions)}
- Tổng tiền: ${money(x.total_amount)}
${methods.length ? `- Theo phương thức: ${methods.map(m => `${m.method}: ${money(m.total_amount)}`).join(' | ')}` : ''}
`;
};

const getPurchasingContext = async period => {
  const condition = dateCondition('o.created_at', period);
  const rows = await safeQuery(`
    SELECT COUNT(*) total_orders,COALESCE(SUM(o.total),0) purchase_value,COALESCE(SUM(o.paid_amount),0) paid_value,COALESCE(SUM(o.total-o.paid_amount),0) payable
    FROM orders o WHERE o.type='purchase' AND o.status<>'cancelled' AND ${condition}
  `);
  const pending = await safeQuery(`
    SELECT o.code,p.name supplier_name,o.total,o.paid_amount,o.status,o.payment_status
    FROM orders o JOIN partners p ON p.id=o.partner_id
    WHERE o.type='purchase' AND o.status<>'cancelled'
    AND (o.status IN ('draft','pending','approved') OR o.payment_status<>'paid')
    ORDER BY o.created_at DESC LIMIT 10
  `);
  const x = rows[0] || {};
  let text = `[MUA HÀNG]
- Số đơn mua kỳ này: ${num(x.total_orders)}
- Giá trị mua: ${money(x.purchase_value)}
- Đã thanh toán NCC: ${money(x.paid_value)}
- Còn phải trả NCC: ${money(x.payable)}
`;
  if (pending.length) {
    text += `[ĐƠN MUA ĐANG THEO DÕI]\n`;
    for (const r of pending) text += `- ${r.code} | ${r.supplier_name} | ${money(r.total)} | ${r.status}/${r.payment_status}\n`;
  }
  return text;
};

const getStockContext = async () => {
  const rows = await safeQuery(`
    SELECT i.id,i.code,i.name,i.type,i.unit,i.min_stock,i.max_stock,COALESCE(SUM(s.signed_qty),0) stock
    FROM items i LEFT JOIN stock_ledger s ON s.item_id=i.id
    WHERE i.is_active=1
    GROUP BY i.id,i.code,i.name,i.type,i.unit,i.min_stock,i.max_stock
    ORDER BY stock ASC
  `);
  const low = rows.filter(x => Number(x.stock) < Number(x.min_stock || 0));
  const negative = rows.filter(x => Number(x.stock) < 0);
  let text = `[KHO]
- Tổng mặt hàng: ${rows.length}
- Dưới tồn tối thiểu: ${low.length}
- Tồn âm: ${negative.length}
`;
  if (low.length) {
    text += `[MẶT HÀNG CẦN CHÚ Ý]\n`;
    for (const r of low.slice(0,15)) text += `- ${r.code} | ${r.name}: ${num(r.stock)} ${r.unit} (min ${num(r.min_stock)})\n`;
  }
  return text;
};

const getTasksContext = async period => {
  const condition = dateCondition('t.created_at', period);
  const summary = await safeQuery(`SELECT t.status,COUNT(*) total FROM tasks t WHERE ${condition} GROUP BY t.status`);
  const overdue = await safeQuery(`
    SELECT t.code,t.title,t.priority,t.status,t.due,u.full_name
    FROM tasks t JOIN users u ON u.id=t.assignee_id
    WHERE t.status<>'done' AND t.due IS NOT NULL AND t.due<NOW()
    ORDER BY FIELD(t.priority,'urgent','high','normal','low'),t.due ASC LIMIT 15
  `);
  let text = `[CÔNG VIỆC & KPI]
- Trạng thái: ${summary.length ? summary.map(x => `${x.status}: ${x.total}`).join(', ') : 'Chưa có dữ liệu'}
- Công việc quá hạn: ${overdue.length}
`;
  if (overdue.length) {
    text += `[CÔNG VIỆC QUÁ HẠN]\n`;
    for (const r of overdue) text += `- ${r.code || '-'} | ${r.title} | ${r.full_name} | ${r.priority} | Hạn ${r.due}\n`;
  }
  return text;
};

const getAttendanceContext = async period => {
  const condition = dateCondition('a.date', period);
  const rows = await safeQuery(`
    SELECT COUNT(*) attendance_records,COALESCE(SUM(a.work_hours),0) work_hours,COALESCE(SUM(a.ot_hours),0) ot_hours,
    COALESCE(SUM(a.late_minutes),0) late_minutes,SUM(CASE WHEN a.late_minutes>0 THEN 1 ELSE 0 END) late_records
    FROM attendance a WHERE ${condition}
  `);
  const late = await safeQuery(`
    SELECT u.full_name,COUNT(*) late_count,SUM(a.late_minutes) late_minutes
    FROM attendance a JOIN users u ON u.id=a.user_id
    WHERE ${condition} AND a.late_minutes>0
    GROUP BY u.id,u.full_name ORDER BY late_minutes DESC LIMIT 10
  `);
  const x = rows[0] || {};
  let text = `[CHẤM CÔNG]
- Bản ghi: ${num(x.attendance_records)}
- Giờ làm: ${num(x.work_hours)}
- OT: ${num(x.ot_hours)} giờ
- Lượt đi muộn: ${num(x.late_records)}
- Tổng phút đi muộn: ${num(x.late_minutes)}
`;
  if (late.length) {
    text += `[ĐI MUỘN NHIỀU]\n`;
    for (const r of late) text += `- ${r.full_name}: ${r.late_count} lần, ${r.late_minutes} phút\n`;
  }
  return text;
};

const getPayrollContext = async () => {
  const rows = await safeQuery(`
    SELECT period,status,COUNT(*) employees,COALESCE(SUM(net_salary),0) total_net_salary
    FROM payrolls GROUP BY period,status ORDER BY period DESC LIMIT 12
  `);
  if (!rows.length) return `[BẢNG LƯƠNG]\n- Chưa có dữ liệu.\n`;
  return `[BẢNG LƯƠNG]\n${rows.map(r => `- ${r.period} | ${r.status} | ${r.employees} nhân sự | ${money(r.total_net_salary)}`).join('\n')}\n`;
};

const getCostsContext = async period => {
  const condition = dateCondition('date', period);
  const rows = await safeQuery(`SELECT COUNT(*) total_records,COALESCE(SUM(amount),0) total_amount FROM costs WHERE ${condition}`);
  const categories = await safeQuery(`SELECT category,COALESCE(SUM(amount),0) total_amount FROM costs WHERE ${condition} GROUP BY category ORDER BY total_amount DESC LIMIT 10`);
  const x = rows[0] || {};
  return `[CHI PHÍ]
- Số khoản chi: ${num(x.total_records)}
- Tổng chi: ${money(x.total_amount)}
${categories.length ? `- Nhóm chi lớn: ${categories.map(c => `${c.category}: ${money(c.total_amount)}`).join(' | ')}` : ''}
`;
};

const getMarketingContext = async () => {
  const rows = await safeQuery(`
    SELECT title,channel,budget,spent,kpi_target,result,start_date,end_date
    FROM marketing ORDER BY start_date DESC LIMIT 15
  `);
  if (!rows.length) return `[MARKETING]\n- Chưa có dữ liệu.\n`;
  let text = `[MARKETING]\n`;
  for (const r of rows) {
    text += `- ${r.title} | ${r.channel || '-'} | Ngân sách ${money(r.budget)} | Đã chi ${money(r.spent)} | KPI ${num(r.result)}/${num(r.kpi_target)}`;
    if (Number(r.budget || 0) > 0 && Number(r.spent || 0) > Number(r.budget || 0)) text += ` | CẢNH BÁO VƯỢT NGÂN SÁCH`;
    text += '\n';
  }
  return text;
};

const getProductionContext = async period => {
  const condition = dateCondition('sr.day', period);
  const rows = await safeQuery(`
    SELECT COUNT(*) reports,COALESCE(SUM(sr.good_qty),0) good_qty,COALESCE(SUM(sr.scrap_qty),0) scrap_qty,
    COALESCE(SUM(sr.downtime_min),0) downtime_min,
    SUM(CASE WHEN sr.qc_result='fail' THEN 1 ELSE 0 END) qc_fail,
    SUM(CASE WHEN sr.qc_result='rework' THEN 1 ELSE 0 END) qc_rework
    FROM shift_reports sr WHERE ${condition}
  `);
  const bad = await safeQuery(`
    SELECT sr.day,sr.team_id,sr.shift,sr.good_qty,sr.scrap_qty,sr.downtime_min,sr.qc_result
    FROM shift_reports sr
    WHERE ${condition} AND (sr.qc_result IN ('fail','rework') OR sr.downtime_min>=60)
    ORDER BY sr.day DESC,sr.downtime_min DESC LIMIT 12
  `);
  const x = rows[0] || {};
  let text = `[SẢN XUẤT & QC]
- Báo cáo ca: ${num(x.reports)}
- Sản lượng đạt: ${num(x.good_qty)}
- Phế phẩm: ${num(x.scrap_qty)}
- Downtime: ${num(x.downtime_min)} phút
- QC fail: ${num(x.qc_fail)}
- QC rework: ${num(x.qc_rework)}
`;
  if (bad.length) {
    text += `[CA CẦN CHÚ Ý]\n`;
    for (const r of bad) text += `- ${r.day} | Tổ ${r.team_id || '-'} | ${r.shift} | QC ${r.qc_result} | Good ${r.good_qty} | Scrap ${r.scrap_qty} | Downtime ${r.downtime_min} phút\n`;
  }
  return text;
};

const getIncidentsContext = async () => {
  const summary = await safeQuery(`SELECT status,COUNT(*) total FROM incidents GROUP BY status`);
  const open = await safeQuery(`
    SELECT i.code,i.status,i.violation_codes,i.created_at,u.full_name
    FROM incidents i JOIN users u ON u.id=i.user_id
    WHERE i.status NOT IN ('closed','approved','rejected')
    ORDER BY i.created_at DESC LIMIT 12
  `);
  let text = `[SỰ CỐ / VI PHẠM]
- Trạng thái: ${summary.length ? summary.map(x => `${x.status}: ${x.total}`).join(', ') : 'Không có dữ liệu'}
`;
  if (open.length) {
    text += `[HỒ SƠ CHƯA KHÉP]\n`;
    for (const r of open) text += `- ${r.code} | ${r.full_name} | ${r.status} | ${r.violation_codes}\n`;
  }
  return text;
};

const getAssetsContext = async () => {
  const summary = await safeQuery(`SELECT status,COUNT(*) total,COALESCE(SUM(price),0) total_value FROM assets GROUP BY status`);
  const maintenance = await safeQuery(`
    SELECT code,name,status,next_maintenance FROM assets
    WHERE status IN ('broken','maintenance')
    OR (next_maintenance IS NOT NULL AND next_maintenance<=DATE_ADD(CURDATE(),INTERVAL 14 DAY))
    ORDER BY next_maintenance ASC LIMIT 15
  `);
  let text = `[TÀI SẢN]\n${summary.map(r => `- ${r.status}: ${r.total} tài sản | ${money(r.total_value)}`).join('\n')}\n`;
  if (maintenance.length) {
    text += `[TÀI SẢN CẦN CHÚ Ý]\n`;
    for (const r of maintenance) text += `- ${r.code} | ${r.name} | ${r.status}${r.next_maintenance ? ` | Bảo trì ${r.next_maintenance}` : ''}\n`;
  }
  return text;
};

const getSOPContext = async question => {
  const match = String(question || '').match(/[A-Z]{2,5}-?\d{2,4}/i);
  if (match) {
    const rows = await safeQuery(`SELECT code,title,steps,owner,tags,visibility,approved FROM sop_docs WHERE code=? LIMIT 1`, [match[0].toUpperCase()]);
    if (rows.length) {
      const s = rows[0];
      return `[SOP ${s.code}]
- Tên: ${s.title}
- Phụ trách: ${s.owner || 'Chưa khai báo'}
- Tags: ${s.tags || '-'}
- Visibility: ${s.visibility}
- Đã duyệt: ${s.approved ? 'Có' : 'Chưa'}
- Nội dung: ${s.steps}
`;
    }
  }
  const rows = await safeQuery(`SELECT code,title,owner,tags FROM sop_docs WHERE approved=1 ORDER BY code LIMIT 30`);
  return `[SOP HIỆN CÓ]\n${rows.map(r => `- ${r.code}: ${r.title} | ${r.owner || '-'}`).join('\n')}\n`;
};

const getUserOwnContext = async userId => {
  const user = await safeQuery(`SELECT id,username,full_name,role,position,team_id,status,salary_base FROM users WHERE id=? LIMIT 1`, [userId]);
  const tasks = await safeQuery(`SELECT code,title,priority,status,due,evidence_required FROM tasks WHERE assignee_id=? ORDER BY created_at DESC LIMIT 15`, [userId]);
  const payroll = await safeQuery(`SELECT period,net_salary,status FROM payrolls WHERE user_id=? ORDER BY period DESC LIMIT 4`, [userId]);
  const attendance = await safeQuery(`SELECT date,check_in,check_out,work_hours,ot_hours,late_minutes,shift FROM attendance WHERE user_id=? ORDER BY date DESC LIMIT 15`, [userId]);
  return `[THÔNG TIN CÁ NHÂN]
${JSON.stringify(user[0] || {}, null, 2)}
[CÔNG VIỆC]
${JSON.stringify(tasks, null, 2)}
[LƯƠNG]
${JSON.stringify(payroll, null, 2)}
[CHẤM CÔNG]
${JSON.stringify(attendance, null, 2)}
`;
};

const detectSections = (question, role) => {
  const q = normalize(question);
  const sections = new Set();

  const executiveOverview =
    role === 'giam_doc' &&
    (
      hasAnyPhrase(q, [
        'tinh hinh cong ty','cong ty the nao','tong quan cong ty','bao cao cong ty',
        'bao cao dieu hanh','bao cao hom nay','toan bo cong ty','toan cong ty',
        'rui ro van hanh','rui ro toan cong ty','phan tich tong the','danh gia tong the',
        '3 viec can uu tien','3 viec toi can uu tien','viec can uu tien xu ly'
      ]) ||
      (hasPhrase(q,'hom nay') && hasPhrase(q,'cong ty') && hasAnyPhrase(q,['van de','tinh hinh']))
    );

  if (executiveOverview) {
    ['sales','payments','purchasing','stock','tasks','attendance','payroll','costs','marketing','production','incidents','assets'].forEach(x => sections.add(x));
    return sections;
  }

  if (hasAnyPhrase(q,['doanh thu','ban hang','don hang','don ban','cong no khach','khach hang no','don giao'])) sections.add('sales');
  if (hasAnyPhrase(q,['thu tien','thanh toan','tien ve','da thu','con phai thu','cong no'])) {
    sections.add('payments');
    if (hasAnyPhrase(q,['cong no','con phai thu'])) sections.add('sales');
  }
  if (hasAnyPhrase(q,['mua hang','nha cung cap','don mua','cong no nha cung cap','phai tra nha cung cap'])) sections.add('purchasing');
  if (hasWord(q,'kho') || hasAnyPhrase(q,['ton kho','ton am','ton toi thieu','ton kha dung','vat tu','nguyen lieu','thieu hang','thieu thanh pham'])) sections.add('stock');
  if (hasAnyPhrase(q,['cong viec','qua han','nhiem vu','kpi','hieu suat']) || hasWord(q,'task')) sections.add('tasks');
  if (hasAnyPhrase(q,['cham cong','di muon','tang ca','vang mat','nghi lam','gio lam']) || hasWord(q,'ot')) sections.add('attendance');
  if (hasAnyPhrase(q,['bang luong','tien luong','luong thang']) || hasWord(q,'luong')) sections.add('payroll');
  if (hasAnyPhrase(q,['chi phi','chi tieu','khoan chi'])) sections.add('costs');
  if (hasAnyPhrase(q,['marketing','chien dich','quang cao','ngan sach marketing'])) sections.add('marketing');
  if (hasAnyPhrase(q,['san xuat','phe pham','thanh pham','downtime','rework','kiem tra chat luong']) || hasWord(q,'qc') || hasWord(q,'kcs')) sections.add('production');
  if (hasAnyPhrase(q,['su co','vi pham','ky luat','giai trinh','phieu vi pham'])) sections.add('incidents');
  if (hasAnyPhrase(q,['tai san','bao tri','may hong','thiet bi hong','han bao tri'])) sections.add('assets');
  if (hasAnyPhrase(q,['sop','quy trinh','huong dan'])) sections.add('sop');

  if (hasAnyPhrase(q,['thieu nguyen lieu','thieu thanh pham','khong du nguyen lieu'])) {
    sections.add('stock');
    sections.add('production');
  }

  if (!sections.size) {
    if (role === 'giam_doc') ['sales','stock','tasks','incidents'].forEach(x => sections.add(x));
    else sections.add('own');
  }

  return sections;
};

const enforceRoleAccess = (sections, role) => {
  if (role === 'giam_doc') return sections;
  const allowed = {
    ke_toan: new Set(['sales','payments','purchasing','stock','attendance','payroll','costs','sop','own']),
    to_truong: new Set(['stock','tasks','attendance','production','incidents','sop','own']),
    cong_nhan: new Set(['sop','own']),
    ctv: new Set(['sales','sop','own'])
  };
  const roleAllowed = allowed[role] || new Set(['own']);
  return new Set([...sections].filter(x => roleAllowed.has(x)));
};

const buildCompanyContext = async ({ userId, role, question }) => {
  const period = detectPeriod(question);
  const sections = enforceRoleAccess(detectSections(question, role), role);
  const parts = [];
  const todayVN = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  parts.push(`[SYSTEM CONTEXT]
- Ngày hệ thống: ${todayVN}
- Khoảng phân tích: ${period}
- Vai trò: ${role}
- Chỉ sử dụng dữ liệu được cung cấp.
`);

  for (const section of sections) {
    if (section === 'sales') parts.push(await getSalesContext(period));
    else if (section === 'payments') parts.push(await getPaymentsContext(period));
    else if (section === 'purchasing') parts.push(await getPurchasingContext(period));
    else if (section === 'stock') parts.push(await getStockContext());
    else if (section === 'tasks') parts.push(await getTasksContext(period));
    else if (section === 'attendance') parts.push(await getAttendanceContext(period));
    else if (section === 'payroll') parts.push(await getPayrollContext());
    else if (section === 'costs') parts.push(await getCostsContext(period));
    else if (section === 'marketing') parts.push(await getMarketingContext());
    else if (section === 'production') parts.push(await getProductionContext(period));
    else if (section === 'incidents') parts.push(await getIncidentsContext());
    else if (section === 'assets') parts.push(await getAssetsContext());
    else if (section === 'sop') parts.push(await getSOPContext(question));
    else if (section === 'own') parts.push(await getUserOwnContext(userId));
  }

  return { period, sections: [...sections], context: parts.join('\n') };
};

module.exports = { buildCompanyContext };