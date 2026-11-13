require('dotenv').config();

let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch {
  bcrypt = require('bcrypt');
}

const { pool } = require('./src/config/db');

const START = new Date('2026-08-15T08:00:00+07:00');
const END = new Date('2026-11-14T18:00:00+07:00');

const pad = n => String(n).padStart(2, '0');
const dateOnly = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const dateTime = d => `${dateOnly(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}

function roundK(n) {
  return Math.round(Number(n || 0) / 1000) * 1000;
}

const columnCache = {};

async function tableExists(table) {
  const [rows] = await pool.query('SHOW TABLES LIKE ?', [table]);
  return rows.length > 0;
}

async function tableColumns(table) {
  if (columnCache[table]) return columnCache[table];
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${table}\``);
  columnCache[table] = new Set(rows.map(r => r.Field));
  return columnCache[table];
}

async function smartInsert(table, data) {
  const cols = await tableColumns(table);
  const entries = Object.entries(data).filter(([key, value]) => cols.has(key) && value !== undefined);

  if (!entries.length) return null;

  const names = entries.map(([key]) => `\`${key}\``).join(', ');
  const marks = entries.map(() => '?').join(', ');
  const values = entries.map(([, value]) => value);

  const [result] = await pool.query(
    `INSERT INTO \`${table}\` (${names}) VALUES (${marks})`,
    values
  );

  return result.insertId;
}

async function clearBusinessData() {
  const tables = [
    'ai_conversations',
    'chat_history',
    'audit_logs',
    'payments',
    'order_items',
    'stock_ledger',
    'orders',
    'payrolls',
    'attendance',
    'tasks',
    'incidents',
    'shift_reports',
    'costs',
    'marketing',
    'assets',
    'sop_docs',
    'items',
    'partners',
    'users'
  ];

  await pool.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const table of tables) {
    if (!(await tableExists(table))) continue;

    await pool.query(`DELETE FROM \`${table}\``);

    try {
      await pool.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
    } catch {}

    console.log(`CLEARED: ${table}`);
  }

  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash('123', 10);

  const staff = [
    ['admin', 'Nguyễn Xuân Trình', 'giam_doc', 'Giám đốc', 35000000, null],
    ['ketoan', 'Trần Ngọc Mai', 'ke_toan', 'Kế toán trưởng', 18000000, null],
    ['totruong1', 'Lê Minh Hoàng', 'to_truong', 'Tổ trưởng sản xuất 1', 16000000, 1],
    ['totruong2', 'Phạm Quốc Bảo', 'to_truong', 'Tổ trưởng sản xuất 2', 16000000, 2],

    ['cn1', 'Nguyễn Văn Hải', 'cong_nhan', 'Công nhân vận hành', 10500000, 1],
    ['cn2', 'Trần Hữu Phúc', 'cong_nhan', 'Công nhân gia công', 10200000, 1],
    ['cn3', 'Võ Thành Nam', 'cong_nhan', 'Công nhân hoàn thiện', 10000000, 2],
    ['cn4', 'Đặng Minh Khoa', 'cong_nhan', 'Công nhân đóng gói', 9800000, 2],
    ['cn5', 'Phan Quốc Tuấn', 'cong_nhan', 'Công nhân QC', 11000000, 1],
    ['cn6', 'Bùi Văn Dũng', 'cong_nhan', 'Công nhân kho', 10800000, 2],
    ['cn7', 'Lê Công Thành', 'cong_nhan', 'Công nhân vận hành', 10300000, 1],
    ['cn8', 'Nguyễn Đức Anh', 'cong_nhan', 'Công nhân gia công', 10100000, 2],

    ['ctv1', 'Hoàng Thu Hà', 'ctv', 'CTV Kinh doanh', 8000000, null],
    ['ctv2', 'Đỗ Khánh Linh', 'ctv', 'CTV Kinh doanh', 8000000, null],
    ['sales1', 'Nguyễn Thị Hương', 'ctv', 'Nhân viên kinh doanh', 11000000, null],
    ['sales2', 'Trần Minh Anh', 'ctv', 'Nhân viên kinh doanh', 11500000, null],

    ['kho1', 'Phạm Đức Long', 'cong_nhan', 'Thủ kho', 12500000, null],
    ['qc1', 'Vũ Thanh Huyền', 'cong_nhan', 'QC', 12000000, null]
  ];

  const ids = [];

  for (let i = 0; i < staff.length; i++) {
    const [username, full_name, role, position, salary_base, team_id] = staff[i];

    const id = await smartInsert('users', {
      username,
      password_hash: passwordHash,
      password: passwordHash,
      full_name,
      role,
      status: 'active',
      dob: `${rand(1986, 2002)}-${pad(rand(1,12))}-${pad(rand(1,28))}`,
      gender: i % 4 === 0 ? 'female' : 'male',
      cccd: `0${rand(20,79)}${rand(100000000,999999999)}`,
      cccd_date: `202${rand(1,5)}-${pad(rand(1,12))}-${pad(rand(1,28))}`,
      cccd_place: 'Cục Cảnh sát QLHC về TTXH',
      phone: `09${rand(10000000,99999999)}`,
      email: `${username}@sunnyflex3d.vn`,
      permanent_address: 'Hà Nội',
      current_address: 'Hà Nội',
      emergency_contact: `Người thân - 09${rand(10000000,99999999)}`,
      team_id,
      position,
      join_date: `2025-${pad(rand(1,12))}-${pad(rand(1,28))}`,
      contract_type: 'official',
      salary_base,
      bank_account: `10${rand(100000000,999999999)}`,
      bank_name: pick(['Vietcombank', 'BIDV', 'Techcombank', 'MB Bank']),
      tax_code: `8${rand(100000000,999999999)}`,
      bhxh_code: `BH${rand(100000000,999999999)}`
    });

    ids.push(id);
  }

  return ids;
}

async function seedPartners() {
  const customerIds = [];
  const supplierIds = [];

  const locations = ['Hà Nội', 'Bắc Ninh', 'Hưng Yên', 'Hải Phòng', 'Hà Nam', 'Vĩnh Phúc'];

  for (let i = 1; i <= 50; i++) {
    const isCompany = i > 16;

    const name = isCompany
      ? `Công ty ${pick(['Nội Thất', 'Xây Dựng', 'Cơ Khí', 'Quảng Cáo', 'Thương Mại'])} ${pick(['An Phát', 'Minh Long', 'Việt Thành', 'Đại Phúc', 'Hoàng Gia'])} ${pad(i)}`
      : `Khách lẻ ${pad(i)}`;

    const id = await smartInsert('partners', {
      type: 'customer',
      code: `KH${String(i).padStart(3, '0')}`,
      name,
      company_name: isCompany ? name : '',
      contact_person: isCompany ? `Người liên hệ ${i}` : name,
      phone: `09${rand(10000000,99999999)}`,
      email: `kh${i}@example.com`,
      tax_code: isCompany ? `01${rand(10000000,99999999)}` : '',
      address: pick(locations),
      category: isCompany ? pick(['Đại lý', 'Doanh nghiệp', 'Khách dự án']) : 'Khách lẻ',
      bank_account: `1${rand(100000000,999999999)}`,
      bank_name: pick(['Vietcombank', 'BIDV', 'MB Bank', 'Techcombank']),
      credit_limit: isCompany ? pick([50000000, 100000000, 200000000, 300000000]) : 0,
      payment_term: isCompany ? pick([15, 30, 45]) : 0
    });

    customerIds.push(id);
  }

  for (let i = 1; i <= 15; i++) {
    const name = `Nhà cung cấp ${pick(['Vật tư', 'Nhựa', 'Bao bì', 'Kim khí', 'Thiết bị'])} ${pick(['Hưng Thịnh', 'An Khang', 'Minh Phát', 'Tân Tiến'])} ${pad(i)}`;

    const id = await smartInsert('partners', {
      type: 'supplier',
      code: `NCC${String(i).padStart(3, '0')}`,
      name,
      company_name: name,
      contact_person: `Phụ trách NCC ${i}`,
      phone: `09${rand(10000000,99999999)}`,
      email: `ncc${i}@example.com`,
      tax_code: `02${rand(10000000,99999999)}`,
      address: pick(locations),
      category: 'Nhà cung cấp',
      bank_account: `2${rand(100000000,999999999)}`,
      bank_name: pick(['Vietcombank', 'BIDV', 'VietinBank', 'MB Bank']),
      credit_limit: pick([100000000, 200000000, 500000000]),
      payment_term: pick([15, 30, 45])
    });

    supplierIds.push(id);
  }

  return { customerIds, supplierIds };
}

async function seedItems() {
  const materialNames = [
    'PVC Foam 5mm', 'PVC Foam 10mm', 'Acrylic 3mm',
    'Mực UV Cyan', 'Mực UV Magenta', 'Mực UV Yellow', 'Mực UV Black',
    'Keo 3M', 'Decal PP', 'Bạt Hiflex', 'Nhôm định hình',
    'LED module', 'Nguồn LED 12V', 'Vít inox', 'Màng bảo vệ',
    'Carton đóng gói', 'Foam PE', 'Dây điện 2x1.5'
  ];

  const productNames = [
    'Biển mica 40x60', 'Hộp đèn LED 60x120', 'Bộ chữ nổi mica LED',
    'Standee formex', 'Backdrop 3x5m', 'Kệ trưng bày PVC',
    'Logo nổi Acrylic', 'Biển phòng ban mica', 'Bảng menu UV',
    'Khung check-in 3D', 'Bộ POSM cửa hàng', 'Biển chỉ dẫn'
  ];

  const materials = [];
  const products = [];
  const materialPrices = [];
  const productPrices = [];

  for (let i = 0; i < materialNames.length; i++) {
    const price = pick([95000,145000,185000,225000,285000,320000,420000,780000,1150000]);
    materialPrices.push(price);

    materials.push(await smartInsert('items', {
      type: 'material',
      code: `VT${String(i+1).padStart(3,'0')}`,
      name: materialNames[i],
      unit: pick(['Tấm', 'Cuộn', 'Chai', 'Hộp', 'Cái']),
      price_in: price,
      price_out: 0,
      price_floor: 0,
      min_stock: 20,
      max_stock: 400
    }));
  }

  for (let i = 0; i < productNames.length; i++) {
    const price = pick([320000,450000,720000,850000,1850000,2350000,2800000,3200000,4800000,6500000,7500000]);
    productPrices.push(price);

    products.push(await smartInsert('items', {
      type: 'product',
      code: `TP${String(i+1).padStart(3,'0')}`,
      name: productNames[i],
      unit: pick(['Cái', 'Bộ']),
      price_in: roundK(price * 0.65),
      price_out: price,
      price_floor: roundK(price * 0.82),
      min_stock: 3,
      max_stock: 80
    }));
  }

  return { materials, products, materialPrices, productPrices };
}

async function seedOrdersAndStock(partners, items, users) {
  let purchaseNo = 1;
  let saleNo = 1;

  for (let i = 0; i < items.products.length; i++) {
    const qty = rand(60, 120);

    await smartInsert('stock_ledger', {
      item_id: items.products[i],
      type: 'in',
      qty,
      signed_qty: qty,
      unit_cost: roundK(items.productPrices[i] * 0.65),
      ref_type: 'initial',
      note: 'Tồn kho đầu kỳ',
      created_by: users[0],
      created_at: dateTime(START)
    });
  }

  const totalDays = Math.floor((END - START) / 86400000);

  for (let day = 0; day <= totalDays; day++) {
    const current = addDays(START, day);

    if (current.getDay() === 0) continue;

    if (day % 3 === 0) {
      for (let p = 0; p < rand(1, 2); p++) {
        const lines = [];
        let subtotal = 0;

        for (let j = 0; j < rand(2, 5); j++) {
          const idx = rand(0, items.materials.length - 1);
          const qty = rand(20, 120);
          const unitPrice = items.materialPrices[idx];
          const amount = qty * unitPrice;

          lines.push({
            item_id: items.materials[idx],
            qty,
            unit_price: unitPrice,
            amount
          });

          subtotal += amount;
        }

        const shippingFee = pick([0,150000,250000,400000]);
        const total = subtotal + shippingFee;
        const paid = Math.random() < 0.8 ? total : roundK(total * 0.5);

        const orderId = await smartInsert('orders', {
          type: 'purchase',
          code: `PN${String(purchaseNo++).padStart(5,'0')}`,
          partner_id: pick(partners.supplierIds),
          sub_total: subtotal,
          discount: 0,
          tax_amount: 0,
          shipping_fee: shippingFee,
          total,
          paid_amount: paid,
          payment_status: paid >= total ? 'paid' : 'partial',
          payment_method: 'transfer',
          status: 'approved',
          due_date: dateOnly(addDays(current, 30)),
          note: 'Nhập vật tư phục vụ sản xuất',
          require_full_payment: 0,
          created_by: pick(users.slice(0,4)),
          approved_by: users[0],
          created_at: dateTime(current)
        });

        for (const line of lines) {
          await smartInsert('order_items', {
            order_id: orderId,
            ...line,
            created_at: dateTime(current)
          });

          await smartInsert('stock_ledger', {
            item_id: line.item_id,
            type: 'in',
            qty: line.qty,
            signed_qty: line.qty,
            unit_cost: line.unit_price,
            batch_no: `LOT-${dateOnly(current).replaceAll('-','')}-${rand(100,999)}`,
            ref_type: 'order',
            ref_id: orderId,
            note: 'Nhập kho theo đơn mua',
            created_by: users[0],
            created_at: dateTime(current)
          });
        }

        if (paid > 0) {
          await smartInsert('payments', {
            order_id: orderId,
            amount: paid,
            method: 'transfer',
            paid_at: dateTime(current),
            note: 'Thanh toán nhà cung cấp',
            created_by: users[1]
          });
        }
      }
    }

    for (let s = 0; s < rand(3, 6); s++) {
      const lines = [];
      let subtotal = 0;

      for (let j = 0; j < rand(1, 4); j++) {
        const idx = rand(0, items.products.length - 1);
        const qty = rand(1, 5);
        const unitPrice = roundK(items.productPrices[idx] * (0.95 + Math.random() * 0.1));
        const amount = qty * unitPrice;

        lines.push({
          item_id: items.products[idx],
          qty,
          unit_price: unitPrice,
          amount
        });

        subtotal += amount;
      }

      const discount = Math.random() < 0.22 ? roundK(subtotal * 0.03) : 0;
      const shippingFee = pick([0,100000,150000,200000]);
      const total = subtotal - discount + shippingFee;

      const payMode = Math.random();
      const paid = payMode < 0.72
        ? total
        : payMode < 0.93
          ? roundK(total * 0.5)
          : 0;

      const status = Math.random() < 0.84
        ? 'done'
        : Math.random() < 0.7
          ? 'delivered'
          : 'approved';

      const orderId = await smartInsert('orders', {
        type: 'sale',
        code: `DH${String(saleNo++).padStart(5,'0')}`,
        partner_id: pick(partners.customerIds),
        sub_total: subtotal,
        discount,
        tax_amount: 0,
        shipping_fee: shippingFee,
        total,
        paid_amount: paid,
        payment_status: paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
        payment_method: Math.random() < 0.8 ? 'transfer' : 'cash',
        status,
        delivery_address: pick(['Hà Nội','Bắc Ninh','Hưng Yên','Hải Phòng','Hà Nam']),
        due_date: dateOnly(addDays(current, rand(3,12))),
        note: 'Đơn bán hàng',
        require_full_payment: 0,
        created_by: pick(users.slice(12,16)),
        approved_by: users[0],
        created_at: dateTime(current)
      });

      for (const line of lines) {
        await smartInsert('order_items', {
          order_id: orderId,
          ...line,
          created_at: dateTime(current)
        });

        if (['done','delivered'].includes(status)) {
          await smartInsert('stock_ledger', {
            item_id: line.item_id,
            type: 'out',
            qty: line.qty,
            signed_qty: -line.qty,
            unit_cost: roundK(line.unit_price * 0.65),
            ref_type: 'order',
            ref_id: orderId,
            note: 'Xuất kho giao khách',
            created_by: users[16] || users[0],
            created_at: dateTime(current)
          });
        }
      }

      if (paid > 0) {
        await smartInsert('payments', {
          order_id: orderId,
          amount: paid,
          method: Math.random() < 0.8 ? 'transfer' : 'cash',
          paid_at: dateTime(current),
          note: 'Khách hàng thanh toán',
          created_by: users[1]
        });
      }
    }
  }
}

async function seedAttendance(users) {
  const totalDays = Math.floor((END - START) / 86400000);

  for (let day = 0; day <= totalDays; day++) {
    const current = addDays(START, day);

    if (current.getDay() === 0) continue;

    for (const userId of users.slice(1)) {
      if (Math.random() < 0.045) continue;

      const late = Math.random() < 0.11 ? rand(5,35) : 0;
      const ot = Math.random() < 0.18 ? pick([1,1.5,2,2.5,3]) : 0;

      const checkIn = new Date(current);
      checkIn.setHours(8, late, 0, 0);

      const checkOut = new Date(current);
      checkOut.setHours(17 + Math.floor(ot), 30, 0, 0);

      await smartInsert('attendance', {
        user_id: userId,
        date: dateOnly(current),
        check_in: dateTime(checkIn),
        check_out: dateTime(checkOut),
        work_hours: 8,
        ot_hours: ot,
        late_minutes: late,
        shift: 'office',
        note: late ? `Đi muộn ${late} phút` : ''
      });
    }
  }
}

async function seedTasks(users) {
  const titles = [
    'Kiểm tra tồn kho cuối ca',
    'Bảo dưỡng máy UV',
    'Đối chiếu công nợ khách hàng',
    'Hoàn thiện đơn hàng dự án',
    'Kiểm tra chất lượng thành phẩm',
    'Chuẩn bị vật tư cho ca sáng',
    'Thu hồi công nợ khách hàng',
    'Chốt đơn khách doanh nghiệp',
    'Kiểm tra định mức vật tư',
    'Sắp xếp kho thành phẩm',
    'Kiểm tra an toàn điện',
    'Báo cáo sản lượng cuối ngày'
  ];

  let no = 1;
  const totalDays = Math.floor((END - START) / 86400000);

  for (let day = 0; day <= totalDays; day += 2) {
    const current = addDays(START, day);

    if (current.getDay() === 0) continue;

    for (let i = 0; i < rand(5,9); i++) {
      const revenueTask = Math.random() < 0.22;
      const done = Math.random() < 0.82;

      await smartInsert('tasks', {
        code: `CV${String(no++).padStart(5,'0')}`,
        title: pick(titles),
        description: 'Công việc phát sinh trong quá trình vận hành thực tế.',
        assignee_id: pick(users.slice(2)),
        assigned_by: pick(users.slice(0,4)),
        team_id: pick([1,2,null]),
        priority: pick(['low','normal','high','urgent']),
        status: done ? 'done' : (Math.random() < 0.5 ? 'doing' : 'todo'),
        due: dateOnly(addDays(current, rand(1,7))),
        start_date: dateOnly(current),
        kpi_weight: revenueTask ? 0 : pick([5,10,10,20]),
        evidence_required: 1,
        evidence: done ? 'Đã hoàn thành, có ảnh hoặc biên bản xác nhận.' : '',
        done_at: done ? dateTime(addDays(current, rand(0,5))) : null,
        task_type: revenueTask ? 'revenue' : 'kpi',
        revenue_value: revenueTask ? pick([5000000,10000000,15000000,25000000,50000000]) : 0
      });
    }
  }
}

async function seedPayroll(users) {
  const periods = ['2026-08','2026-09','2026-10','2026-11'];

  for (const period of periods) {
    for (const userId of users.slice(1)) {
      const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);

      const base = Number(user.salary_base || 10000000);
      const factor = period === '2026-08'
        ? 0.55
        : period === '2026-11'
          ? 0.48
          : 1;

      const workPay = roundK(base * factor);
      const otPay = roundK(rand(0,2200000) * factor);
      const allowances = roundK(rand(300000,1200000) * factor);
      const kpiBonus = roundK(rand(0,2000000) * factor);
      const bhxh = roundK(base * 0.105 * factor);
      const pit = base >= 18000000 ? roundK(rand(200000,900000) * factor) : 0;
      const advance = Math.random() < 0.12 ? pick([500000,1000000,2000000]) : 0;

      const net = workPay + otPay + allowances + kpiBonus - bhxh - pit - advance;

      await smartInsert('payrolls', {
        period,
        user_id: userId,
        salary_base: base,
        work_pay: workPay,
        ot_pay: otPay,
        allowances,
        kpi_bonus: kpiBonus,
        other_bonus: 0,
        bhxh_deduction: bhxh,
        union_fee: roundK(100000 * factor),
        pit_tax: pit,
        advance_payment: advance,
        other_deduction: 0,
        net_salary: net,
        status: period === '2026-11' ? 'draft' : 'paid',
        approved_by: period === '2026-11' ? null : users[0],
        approved_at: period === '2026-11' ? null : `${period}-28 16:30:00`,
        paid_at: period === '2026-11' ? null : `${period}-28 17:00:00`,
        note: period === '2026-11' ? 'Lương tạm tính giữa tháng' : 'Đã chốt lương tháng'
      });
    }
  }
}

async function seedCosts(users) {
  const categories = [
    'Điện nước',
    'Vận chuyển',
    'Bảo trì máy',
    'Văn phòng',
    'Marketing',
    'Ăn ca',
    'Bao bì',
    'Công cụ dụng cụ'
  ];

  const totalDays = Math.floor((END - START) / 86400000);

  for (let day = 0; day <= totalDays; day++) {
    if (Math.random() < 0.3) continue;

    const current = addDays(START, day);

    for (let i = 0; i < rand(1,3); i++) {
      const category = pick(categories);

      await smartInsert('costs', {
        day: dateOnly(current),
        date: dateOnly(current),
        category,
        amount: pick([150000,250000,480000,650000,1200000,2500000,5000000,12000000]),
        payment_method: Math.random() < 0.75 ? 'transfer' : 'cash',
        description: `Chi phí ${category.toLowerCase()} phục vụ vận hành công ty`,
        note: 'Dữ liệu vận hành 3 tháng',
        created_by: pick(users.slice(0,4)),
        created_at: dateTime(current)
      });
    }
  }
}

async function seedMarketing(users) {
  const channels = ['Facebook','TikTok','Google Ads','Zalo','SEO Website','Khách cũ giới thiệu'];

  for (let i = 0; i < 28; i++) {
    const start = addDays(START, i * 3);
    const budget = pick([3000000,5000000,8000000,12000000,15000000]);

    await smartInsert('marketing', {
      title: `Chiến dịch ${pick(channels)} ${pad(i+1)}`,
      channel: pick(channels),
      budget,
      spent: roundK(budget * (0.72 + Math.random() * 0.25)),
      start_date: dateOnly(start),
      end_date: dateOnly(addDays(start, rand(7,18))),
      kpi_target: pick([50,80,100,150,200]),
      result: rand(30,230),
      created_by: users[0]
    });
  }
}

async function seedAssets(users) {
  const names = [
    'Máy in UV khổ lớn',
    'Máy CNC Router',
    'Máy Laser CO2',
    'Máy cắt decal',
    'Máy cán màng',
    'Máy nén khí',
    'Xe tải giao hàng',
    'Máy tính thiết kế 01',
    'Máy tính thiết kế 02',
    'Máy tính kế toán',
    'Điều hòa xưởng 01',
    'Điều hòa xưởng 02',
    'Camera kho',
    'Bộ UPS máy UV',
    'Máy khoan bàn'
  ];

  for (let i = 0; i < names.length; i++) {
    const price = pick([12000000,25000000,45000000,52000000,180000000,285000000,420000000,520000000]);

    await smartInsert('assets', {
      code: `TS${String(i+1).padStart(3,'0')}`,
      name: names[i],
      category: 'Thiết bị',
      purchase_date: `2025-${pad(rand(1,12))}-${pad(rand(1,28))}`,
      price,
      status: 'active',
      location: pick(['Xưởng 1','Xưởng 2','Kho','Văn phòng']),
      note: 'Tài sản đang sử dụng',
      created_by: users[0]
    });
  }
}

async function seedShiftReports(users) {
  const totalDays = Math.floor((END - START) / 86400000);

  for (let day = 0; day <= totalDays; day++) {
    const current = addDays(START, day);

    if (current.getDay() === 0) continue;

    for (const teamId of [1,2]) {
      for (const shift of ['morning','afternoon','night']) {
        const scrap = rand(0,6);

        await smartInsert('shift_reports', {
          team_id: teamId,
          day: dateOnly(current),
          shift,
          good_qty: rand(35,95),
          scrap_qty: scrap,
          downtime_min: rand(0,35),
          qc_result: scrap <= 2 ? 'pass' : (scrap <= 4 ? 'rework' : 'fail'),
          created_by: teamId === 1 ? users[2] : users[3]
        });
      }
    }
  }
}

async function seedIncidents(users) {
  const violationCodes = ['LATE','PPE','QC','SAFETY','PROCESS'];

  for (let i = 0; i < 38; i++) {
    const current = addDays(START, rand(0,90));
    const closed = i < 31;

    await smartInsert('incidents', {
      code: `SC${String(i+1).padStart(4,'0')}`,
      user_id: pick(users.slice(4,12)),
      violation_codes: JSON.stringify([pick(violationCodes)]),
      status: closed ? 'closed' : 'new',
      evidence: 'Biên bản hoặc ảnh ghi nhận tại hiện trường',
      explanation: 'Nhân viên đã giải trình nguyên nhân và biện pháp khắc phục.',
      decision_by: closed ? users[0] : null,
      decision_note: closed ? 'Nhắc nhở và yêu cầu khắc phục' : '',
      decision_at: closed ? dateTime(addDays(current,1)) : null,
      created_by: pick(users.slice(2,4)),
      created_at: dateTime(current)
    });
  }
}

async function seedSop(users) {
  const docs = [
    'Quy trình vận hành máy UV',
    'Quy trình vận hành CNC',
    'Quy trình kiểm tra chất lượng',
    'Quy trình nhập kho vật tư',
    'Quy trình xuất kho thành phẩm',
    'Quy trình đóng gói',
    'Quy trình xử lý đơn hàng',
    'Quy trình giao nhận',
    'Quy trình bảo trì thiết bị',
    'Quy trình an toàn điện',
    'Quy trình PCCC',
    'Quy trình xử lý hàng lỗi',
    'Quy trình kiểm kê kho',
    'Quy trình duyệt chi phí',
    'Quy trình thu hồi công nợ'
  ];

  for (let i = 0; i < docs.length; i++) {
    await smartInsert('sop_docs', {
      code: `SOP${String(i+1).padStart(3,'0')}`,
      title: docs[i],
      steps: '1. Chuẩn bị\n2. Kiểm tra điều kiện\n3. Thực hiện\n4. Ghi nhận kết quả\n5. Xác nhận và lưu hồ sơ',
      owner: pick(['Sản xuất','Kho','Kế toán','Kinh doanh','QC']),
      tags: 'quy trình,nội bộ,kiểm soát',
      visibility: 'internal',
      approved: 1,
      created_by: users[0]
    });
  }
}

async function printCounts() {
  const tables = [
    'users',
    'partners',
    'items',
    'orders',
    'order_items',
    'payments',
    'stock_ledger',
    'tasks',
    'attendance',
    'payrolls',
    'costs',
    'marketing',
    'assets',
    'shift_reports',
    'incidents',
    'sop_docs'
  ];

  console.log('\n===== KẾT QUẢ SAU KHI SEED =====');

  for (const table of tables) {
    if (!(await tableExists(table))) continue;

    const [[row]] = await pool.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
    console.log(table.padEnd(18), row.count);
  }
}

(async () => {
  try {
    console.log('============================================');
    console.log('SUNNY AI FLEX 3D - RESET + SEED 3 THÁNG');
    console.log('Khoảng dữ liệu: 15/08/2026 -> 14/11/2026');
    console.log('============================================');

    await clearBusinessData();

    const users = await seedUsers();
    console.log('OK users');

    const partners = await seedPartners();
    console.log('OK partners');

    const items = await seedItems();
    console.log('OK items');

    await seedOrdersAndStock(partners, items, users);
    console.log('OK orders / payments / stock');

    await seedAttendance(users);
    console.log('OK attendance');

    await seedTasks(users);
    console.log('OK tasks');

    await seedPayroll(users);
    console.log('OK payrolls');

    await seedCosts(users);
    console.log('OK costs');

    await seedMarketing(users);
    console.log('OK marketing');

    await seedAssets(users);
    console.log('OK assets');

    await seedShiftReports(users);
    console.log('OK shift_reports');

    await seedIncidents(users);
    console.log('OK incidents');

    await seedSop(users);
    console.log('OK SOP');

    await printCounts();

    console.log('\n===== TÀI KHOẢN =====');
    console.log('admin / 123');
    console.log('ketoan / 123');
    console.log('totruong1 / 123');
    console.log('totruong2 / 123');
    console.log('cn1 ... cn8 / 123');
    console.log('ctv1 / 123');
    console.log('ctv2 / 123');
    console.log('sales1 / 123');
    console.log('sales2 / 123');
    console.log('kho1 / 123');
    console.log('qc1 / 123');

    console.log('\nHOÀN TẤT RESET + SEED.');
  } catch (error) {
    console.error('\nSEED THẤT BẠI:');
    console.error(error);
    process.exitCode = 1;
  } finally {
    try {
      await pool.end();
    } catch {}
  }
})();
