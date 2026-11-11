require('dotenv').config();
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  waitForConnections: true, connectionLimit: 10, queueLimit: 0, ssl: { rejectUnauthorized: false }
});

const initDB = async () => {
  try {
    const c = await pool.getConnection();
    console.log('✅ Đã kết nối MySQL (Aiven)');
    
    // ... (Các bảng cũ giữ nguyên)
    await c.query(`CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role ENUM('giam_doc', 'ke_toan', 'to_truong', 'cong_nhan', 'ctv') NOT NULL, status ENUM('active', 'resigned', 'suspended') DEFAULT 'active', full_name VARCHAR(100) NOT NULL, dob DATE, gender ENUM('male', 'female', 'other'), cccd VARCHAR(20), cccd_date DATE, cccd_place VARCHAR(100), phone VARCHAR(20), email VARCHAR(100), permanent_address VARCHAR(255), current_address VARCHAR(255), emergency_contact VARCHAR(150), team_id VARCHAR(20), position VARCHAR(100), join_date DATE, contract_type ENUM('probation', 'official', 'seasonal'), salary_base INT DEFAULT 0, bank_account VARCHAR(50), bank_name VARCHAR(100), tax_code VARCHAR(50), bhxh_code VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await c.query(`CREATE TABLE IF NOT EXISTS partners (id INT AUTO_INCREMENT PRIMARY KEY, type ENUM('customer', 'supplier') NOT NULL, code VARCHAR(50) UNIQUE NOT NULL, name VARCHAR(255) NOT NULL, company_name VARCHAR(255), contact_person VARCHAR(100), phone VARCHAR(20), email VARCHAR(100), tax_code VARCHAR(50), address VARCHAR(255), category VARCHAR(50), bank_account VARCHAR(50), bank_name VARCHAR(100), credit_limit INT DEFAULT 0, payment_term INT DEFAULT 0, owner_id INT, is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await c.query(`CREATE TABLE IF NOT EXISTS items (id INT AUTO_INCREMENT PRIMARY KEY, type ENUM('material', 'product') NOT NULL, code VARCHAR(50) UNIQUE NOT NULL, barcode VARCHAR(50), name VARCHAR(255) NOT NULL, unit VARCHAR(20) NOT NULL, price_in INT DEFAULT 0, price_out INT DEFAULT 0, price_floor INT DEFAULT 0, min_stock DECIMAL(15,3) DEFAULT 0, max_stock DECIMAL(15,3) DEFAULT 0, spec_thickness DECIMAL(10,3), spec_width DECIMAL(10,3), spec_length DECIMAL(10,3), weight DECIMAL(10,3), location VARCHAR(100), is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await c.query(`CREATE TABLE IF NOT EXISTS audit_logs (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT, action VARCHAR(50) NOT NULL, resource VARCHAR(50) NOT NULL, ref_id INT, before_data JSON, after_data JSON, note VARCHAR(255), ip VARCHAR(50), at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    
    // Bảng Orders (Thêm cột require_full_payment)
    await c.query(`CREATE TABLE IF NOT EXISTS orders (id INT AUTO_INCREMENT PRIMARY KEY, type ENUM('sale', 'purchase') NOT NULL, code VARCHAR(50) UNIQUE NOT NULL, partner_id INT NOT NULL, sub_total INT DEFAULT 0, discount INT DEFAULT 0, tax_amount INT DEFAULT 0, shipping_fee INT DEFAULT 0, total INT DEFAULT 0, paid_amount INT DEFAULT 0, payment_status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid', payment_method ENUM('cash', 'transfer') DEFAULT 'transfer', status ENUM('draft', 'pending', 'approved', 'delivered', 'done', 'cancelled') DEFAULT 'draft', delivery_address VARCHAR(255), due_date DATETIME, note TEXT, require_full_payment BOOLEAN DEFAULT TRUE, created_by INT, approved_by INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    
    await c.query(`CREATE TABLE IF NOT EXISTS order_items (id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL, item_id INT NOT NULL, qty DECIMAL(15,3) NOT NULL, unit_price INT NOT NULL, amount INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE)`);
    await c.query(`CREATE TABLE IF NOT EXISTS stock_ledger (id INT AUTO_INCREMENT PRIMARY KEY, item_id INT NOT NULL, type ENUM('in', 'out', 'adjust') NOT NULL, qty DECIMAL(15,3) NOT NULL, signed_qty DECIMAL(15,3) NOT NULL, unit_cost INT DEFAULT 0, batch_no VARCHAR(50), ref_type VARCHAR(50), ref_id INT, note VARCHAR(255), created_by INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await c.query(`CREATE TABLE IF NOT EXISTS tasks (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(50), title VARCHAR(255) NOT NULL, description TEXT, assignee_id INT NOT NULL, assigned_by INT NOT NULL, team_id VARCHAR(20), priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal', status ENUM('todo', 'doing', 'done', 'blocked', 'cancelled') DEFAULT 'todo', due DATETIME, kpi_weight DECIMAL(5,2) DEFAULT 1.0, evidence_required BOOLEAN DEFAULT TRUE, evidence TEXT, done_at DATETIME, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await c.query(`CREATE TABLE IF NOT EXISTS attendance (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, date DATE NOT NULL, check_in DATETIME, check_out DATETIME, work_hours DECIMAL(5,2) DEFAULT 0, ot_hours DECIMAL(5,2) DEFAULT 0, late_minutes INT DEFAULT 0, shift ENUM('office', 'morning', 'afternoon', 'night') DEFAULT 'office', note VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY uniq_attendance (user_id, date))`);
    await c.query(`CREATE TABLE IF NOT EXISTS payrolls (id INT AUTO_INCREMENT PRIMARY KEY, period VARCHAR(20) NOT NULL, user_id INT NOT NULL, salary_base INT DEFAULT 0, work_pay INT DEFAULT 0, ot_pay INT DEFAULT 0, allowances INT DEFAULT 0, kpi_bonus INT DEFAULT 0, other_bonus INT DEFAULT 0, bhxh_deduction INT DEFAULT 0, union_fee INT DEFAULT 0, pit_tax INT DEFAULT 0, advance_payment INT DEFAULT 0, other_deduction INT DEFAULT 0, net_salary INT DEFAULT 0, status ENUM('draft', 'approved', 'paid') DEFAULT 'draft', approved_by INT, approved_at DATETIME, paid_at DATETIME, note VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, UNIQUE KEY uniq_payroll (period, user_id))`);
    await c.query(`CREATE TABLE IF NOT EXISTS sop_docs (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(50) UNIQUE NOT NULL, title VARCHAR(255) NOT NULL, steps TEXT NOT NULL, owner VARCHAR(100), tags VARCHAR(255), visibility ENUM('public', 'internal') DEFAULT 'public', approved BOOLEAN DEFAULT TRUE, created_by INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await c.query(`CREATE TABLE IF NOT EXISTS assets (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(50) UNIQUE NOT NULL, serial_no VARCHAR(50), name VARCHAR(255) NOT NULL, brand VARCHAR(100), purchase_date DATE, price INT DEFAULT 0, warranty_until DATE, depreciation INT DEFAULT 0, location VARCHAR(100), last_maintenance DATE, next_maintenance DATE, status ENUM('active', 'broken', 'maintenance') DEFAULT 'active', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await c.query(`CREATE TABLE IF NOT EXISTS costs (id INT AUTO_INCREMENT PRIMARY KEY, date DATE NOT NULL, category VARCHAR(50) NOT NULL, amount INT NOT NULL, payment_method ENUM('cash', 'transfer') DEFAULT 'transfer', invoice_no VARCHAR(50), description TEXT, source VARCHAR(100), created_by INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await c.query(`CREATE TABLE IF NOT EXISTS marketing (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL, channel VARCHAR(50), budget INT DEFAULT 0, spent INT DEFAULT 0, start_date DATE, end_date DATE, kpi_target INT DEFAULT 0, result INT DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
    await c.query(`CREATE TABLE IF NOT EXISTS ai_conversations (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, session_id VARCHAR(50) NOT NULL, role ENUM('user', 'assistant', 'summary') NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

    // BẢNG MỚI: payments (Lịch sử thu tiền)
    await c.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        amount INT NOT NULL,
        method ENUM('cash', 'transfer', 'momo') DEFAULT 'transfer',
        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        note VARCHAR(255),
        created_by INT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )
    `);

    c.release();
  } catch (err) { console.error('❌ Lỗi DB:', err.message); process.exit(1); }
};
module.exports = { pool, initDB };
