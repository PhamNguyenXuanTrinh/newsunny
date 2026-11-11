$ErrorActionPreference = "Stop"
$root = "D:\SUNNY_AI_PROJECT\03_CODE\server"
if (-not (Test-Path $root)) { throw "Khong tim thay thu muc: $root" }
Set-Location $root

Write-Host "=== SUNNY AI FLEX 3D - DAY 3 CODE GENERATOR ===" -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path "src\models" | Out-Null
New-Item -ItemType Directory -Force -Path "src\routes" | Out-Null
New-Item -ItemType Directory -Force -Path "src\config" | Out-Null

# ============================================================
# 1) src/config/db.js  (them 3 bang moi)
# ============================================================
$dbContent = @'
const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sunny_ai",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initDatabase() {
  const conn = await pool.getConnection();
  try {
    // ---- Existing tables (IF NOT EXISTS - se bo qua neu da co) ----
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        email VARCHAR(100),
        role ENUM('ADMIN','MANAGER','SALES','WAREHOUSE','ACCOUNTANT') NOT NULL DEFAULT 'SALES',
        status TINYINT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS partners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        partner_code VARCHAR(50) NOT NULL UNIQUE,
        partner_name VARCHAR(200) NOT NULL,
        partner_type ENUM('CUSTOMER','SUPPLIER') NOT NULL DEFAULT 'CUSTOMER',
        phone VARCHAR(30),
        email VARCHAR(100),
        address TEXT,
        notes TEXT,
        status TINYINT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_code VARCHAR(50) NOT NULL UNIQUE,
        item_name VARCHAR(200) NOT NULL,
        item_type ENUM('MATERIAL','PRODUCT') NOT NULL DEFAULT 'PRODUCT',
        unit VARCHAR(20) DEFAULT 'pcs',
        cost_price DECIMAL(15,2) DEFAULT 0,
        sell_price DECIMAL(15,2) DEFAULT 0,
        stock_quantity DECIMAL(15,2) DEFAULT 0,
        min_stock DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        status TINYINT DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(50),
        table_name VARCHAR(50),
        record_id INT,
        before_json LONGTEXT,
        after_json LONGTEXT,
        ip_address VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // ============ DAY 3: NEW TABLES ============
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_code VARCHAR(50) NOT NULL UNIQUE,
        partner_id INT NOT NULL,
        order_type ENUM('SALES','PURCHASE') NOT NULL DEFAULT 'SALES',
        order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status ENUM('DRAFT','CONFIRMED','DELIVERED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
        total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_orders_partner (partner_id),
        INDEX idx_orders_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        item_id INT NOT NULL,
        quantity DECIMAL(15,2) NOT NULL DEFAULT 1,
        unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
        total_price DECIMAL(15,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_oi_order (order_id),
        INDEX idx_oi_item (item_id),
        CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS stock_ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_id INT NOT NULL,
        transaction_type ENUM('IN','OUT','ADJUST') NOT NULL,
        reference_type VARCHAR(50) DEFAULT 'MANUAL',
        reference_id INT,
        quantity DECIMAL(15,2) NOT NULL,
        balance_before DECIMAL(15,2) NOT NULL DEFAULT 0,
        balance_after DECIMAL(15,2) NOT NULL DEFAULT 0,
        unit_cost DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        created_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sl_item (item_id),
        INDEX idx_sl_ref (reference_type, reference_id),
        INDEX idx_sl_type (transaction_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log("[DB] All tables ready");
  } catch (err) {
    console.error("[DB] Init error:", err.message);
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDatabase };
'@
Set-Content -Path "src\config\db.js" -Value $dbContent -Encoding UTF8
Write-Host "[OK] src/config/db.js" -ForegroundColor Green

# ============================================================
# 2) src/models/Order.js
# ============================================================
$orderModel = @'
const { pool } = require("../config/db");

class Order {
  static async findAll({ status, order_type, partner_id, keyword, limit = 100, offset = 0 } = {}) {
    let sql = `SELECT o.*, p.partner_name, u.full_name AS creator_name
               FROM orders o
               LEFT JOIN partners p ON p.id = o.partner_id
               LEFT JOIN users u ON u.id = o.created_by
               WHERE 1=1`;
    const params = [];
    if (status) { sql += " AND o.status = ?"; params.push(status); }
    if (order_type) { sql += " AND o.order_type = ?"; params.push(order_type); }
    if (partner_id) { sql += " AND o.partner_id = ?"; params.push(partner_id); }
    if (keyword) { sql += " AND o.order_code LIKE ?"; params.push(`%${keyword}%`); }
    sql += " ORDER BY o.id DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT o.*, p.partner_name, u.full_name AS creator_name
       FROM orders o
       LEFT JOIN partners p ON p.id = o.partner_id
       LEFT JOIN users u ON u.id = o.created_by
       WHERE o.id = ?`, [id]
    );
    return rows[0] || null;
  }

  static async getItems(orderId) {
    const [rows] = await pool.query(
      `SELECT oi.*, i.item_code, i.item_name, i.unit
       FROM order_items oi
       JOIN items i ON i.id = oi.item_id
       WHERE oi.order_id = ?
       ORDER BY oi.id`, [orderId]
    );
    return rows;
  }

  static async create(data, conn = null) {
    const exec = conn || pool;
    const [result] = await exec.query(
      `INSERT INTO orders
         (order_code, partner_id, order_type, order_date, status, total_amount, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.order_code,
        data.partner_id,
        data.order_type || "SALES",
        data.order_date || new Date(),
        data.status || "DRAFT",
        data.total_amount || 0,
        data.notes || null,
        data.created_by || null
      ]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const fields = [];
    const params = [];
    const allowed = ["order_code", "partner_id", "order_type", "order_date", "status", "total_amount", "notes"];
    for (const k of allowed) {
      if (data[k] !== undefined) { fields.push(`${k} = ?`); params.push(data[k]); }
    }
    if (fields.length === 0) return false;
    params.push(id);
    const [r] = await pool.query(`UPDATE orders SET ${fields.join(", ")} WHERE id = ?`, params);
    return r.affectedRows > 0;
  }

  static async remove(id) {
    const [r] = await pool.query("DELETE FROM orders WHERE id = ?", [id]);
    return r.affectedRows > 0;
  }

  static async recalcTotal(orderId, conn = null) {
    const exec = conn || pool;
    const [rows] = await exec.query(
      "SELECT COALESCE(SUM(total_price),0) AS total FROM order_items WHERE order_id = ?",
      [orderId]
    );
    const total = Number(rows[0].total);
    await exec.query("UPDATE orders SET total_amount = ? WHERE id = ?", [total, orderId]);
    return total;
  }

  static async generateCode(type = "SALES") {
    const prefix = type === "PURCHASE" ? "PO" : "SO";
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS c FROM orders WHERE order_code LIKE ?", [`${prefix}-%`]
    );
    const next = Number(rows[0].c) + 1;
    return `${prefix}-${String(next).padStart(5, "0")}`;
  }
}

module.exports = Order;
'@
Set-Content -Path "src\models\Order.js" -Value $orderModel -Encoding UTF8
Write-Host "[OK] src/models/Order.js" -ForegroundColor Green

# ============================================================
# 3) src/models/OrderItem.js
# ============================================================
$orderItemModel = @'
const { pool } = require("../config/db");
const Order = require("./Order");

class OrderItem {
  static async findAll({ order_id, item_id, limit = 200, offset = 0 } = {}) {
    let sql = `SELECT oi.*, i.item_code, i.item_name, i.unit, o.order_code
               FROM order_items oi
               JOIN items i ON i.id = oi.item_id
               JOIN orders o ON o.id = oi.order_id
               WHERE 1=1`;
    const params = [];
    if (order_id) { sql += " AND oi.order_id = ?"; params.push(order_id); }
    if (item_id)  { sql += " AND oi.item_id = ?";  params.push(item_id); }
    sql += " ORDER BY oi.id DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT oi.*, i.item_code, i.item_name
       FROM order_items oi
       JOIN items i ON i.id = oi.item_id
       WHERE oi.id = ?`, [id]
    );
    return rows[0] || null;
  }

  static async create(data) {
    const total = Number(data.quantity) * Number(data.unit_price);
    const [result] = await pool.query(
      `INSERT INTO order_items (order_id, item_id, quantity, unit_price, total_price, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.order_id, data.item_id, data.quantity, data.unit_price, total, data.notes || null]
    );
    await Order.recalcTotal(data.order_id);
    return result.insertId;
  }

  static async update(id, data) {
    const existing = await this.findById(id);
    if (!existing) return false;
    const q = data.quantity !== undefined ? data.quantity : existing.quantity;
    const p = data.unit_price !== undefined ? data.unit_price : existing.unit_price;
    const total = Number(q) * Number(p);

    const fields = [];
    const params = [];
    if (data.quantity !== undefined)   { fields.push("quantity = ?");   params.push(data.quantity); }
    if (data.unit_price !== undefined) { fields.push("unit_price = ?"); params.push(data.unit_price); }
    if (data.notes !== undefined)      { fields.push("notes = ?");      params.push(data.notes); }
    fields.push("total_price = ?");    params.push(total);
    params.push(id);
    await pool.query(`UPDATE order_items SET ${fields.join(", ")} WHERE id = ?`, params);
    await Order.recalcTotal(existing.order_id);
    return true;
  }

  static async remove(id) {
    const existing = await this.findById(id);
    if (!existing) return false;
    await pool.query("DELETE FROM order_items WHERE id = ?", [id]);
    await Order.recalcTotal(existing.order_id);
    return true;
  }
}

module.exports = OrderItem;
'@
Set-Content -Path "src\models\OrderItem.js" -Value $orderItemModel -Encoding UTF8
Write-Host "[OK] src/models/OrderItem.js" -ForegroundColor Green

# ============================================================
# 4) src/models/StockLedger.js
# ============================================================
$stockLedgerModel = @'
const { pool } = require("../config/db");

class StockLedger {
  static async findAll({ item_id, transaction_type, reference_type, from_date, to_date, limit = 200, offset = 0 } = {}) {
    let sql = `SELECT sl.*, i.item_code, i.item_name, i.unit, u.full_name AS creator_name
               FROM stock_ledger sl
               LEFT JOIN items i ON i.id = sl.item_id
               LEFT JOIN users u ON u.id = sl.created_by
               WHERE 1=1`;
    const params = [];
    if (item_id)          { sql += " AND sl.item_id = ?";          params.push(item_id); }
    if (transaction_type) { sql += " AND sl.transaction_type = ?"; params.push(transaction_type); }
    if (reference_type)   { sql += " AND sl.reference_type = ?";   params.push(reference_type); }
    if (from_date)        { sql += " AND sl.created_at >= ?";       params.push(from_date); }
    if (to_date)          { sql += " AND sl.created_at <= ?";       params.push(to_date); }
    sql += " ORDER BY sl.id DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT sl.*, i.item_code, i.item_name
       FROM stock_ledger sl
       LEFT JOIN items i ON i.id = sl.item_id
       WHERE sl.id = ?`, [id]
    );
    return rows[0] || null;
  }

  static async findByItem(itemId, limit = 100) {
    const [rows] = await pool.query(
      `SELECT * FROM stock_ledger WHERE item_id = ? ORDER BY id DESC LIMIT ?`,
      [itemId, Number(limit)]
    );
    return rows;
  }

  // Tao 1 but toan kho: cap nhat items.stock_quantity + ghi stock_ledger
  static async create(data, conn = null) {
    const exec = conn || pool;
    const [itemRows] = await exec.query("SELECT stock_quantity FROM items WHERE id = ?", [data.item_id]);
    if (itemRows.length === 0) throw new Error(`Item id=${data.item_id} not found`);

    const before = Number(itemRows[0].stock_quantity);
    const qty = Number(data.quantity);
    let after;
    if (data.transaction_type === "IN")      after = before + qty;
    else if (data.transaction_type === "OUT") after = before - qty;
    else if (data.transaction_type === "ADJUST") after = qty; // ADJUST = set new balance
    else throw new Error("Invalid transaction_type");

    await exec.query("UPDATE items SET stock_quantity = ? WHERE id = ?", [after, data.item_id]);

    const [result] = await exec.query(
      `INSERT INTO stock_ledger
         (item_id, transaction_type, reference_type, reference_id, quantity,
          balance_before, balance_after, unit_cost, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.item_id,
        data.transaction_type,
        data.reference_type || "MANUAL",
        data.reference_id || null,
        qty,
        before,
        after,
        data.unit_cost || 0,
        data.notes || null,
        data.created_by || null
      ]
    );
    return { id: result.insertId, balance_before: before, balance_after: after };
  }
}

module.exports = StockLedger;
'@
Set-Content -Path "src\models\StockLedger.js" -Value $stockLedgerModel -Encoding UTF8
Write-Host "[OK] src/models/StockLedger.js" -ForegroundColor Green

# ============================================================
# 5) src/routes/orders.js
# ============================================================
$ordersRoute = @'
const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const Order = require("../models/Order");
const StockLedger = require("../models/StockLedger");

const authMod = require("../middleware/auth");
const authenticate = authMod.authenticate || authMod.authMiddleware || authMod.verifyToken || authMod.default || authMod;

const rbacMod = require("../middleware/rbac");
const authorize = rbacMod.authorize || rbacMod.checkRole || rbacMod.requireRole || rbacMod.default || rbacMod;

router.use(authenticate);

// GET /api/orders
router.get("/", async (req, res, next) => {
  try {
    const data = await Order.findAll(req.query);
    res.json({ success: true, data, count: data.length });
  } catch (err) { next(err); }
});

// GET /api/orders/:id
router.get("/:id", async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    order.items = await Order.getItems(order.id);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

// POST /api/orders
router.post("/", authorize(["ADMIN", "MANAGER", "SALES", "WAREHOUSE"]), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const body = req.body;
    const code = body.order_code || await Order.generateCode(body.order_type);

    const orderId = await Order.create({
      ...body,
      order_code: code,
      created_by: req.user ? req.user.id : null
    }, conn);

    if (Array.isArray(body.items) && body.items.length > 0) {
      for (const it of body.items) {
        const total = Number(it.quantity) * Number(it.unit_price);
        await conn.query(
          `INSERT INTO order_items (order_id, item_id, quantity, unit_price, total_price, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, it.item_id, it.quantity, it.unit_price, total, it.notes || null]
        );
      }
      await Order.recalcTotal(orderId, conn);
    }

    await conn.commit();
    res.status(201).json({ success: true, data: { id: orderId, order_code: code } });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

// PUT /api/orders/:id
router.put("/:id", authorize(["ADMIN", "MANAGER", "SALES"]), async (req, res, next) => {
  try {
    const ok = await Order.update(req.params.id, req.body);
    if (!ok) return res.status(404).json({ success: false, message: "Order not found or no changes" });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/orders/:id
router.delete("/:id", authorize(["ADMIN", "MANAGER"]), async (req, res, next) => {
  try {
    const ok = await Order.remove(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/orders/:id/confirm  -> sinh stock_ledger
router.post("/:id/confirm", authorize(["ADMIN", "MANAGER", "WAREHOUSE"]), async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const order = await Order.findById(req.params.id);
    if (!order) throw new Error("Order not found");
    if (order.status !== "DRAFT") throw new Error(`Cannot confirm order in status ${order.status}`);

    const items = await Order.getItems(order.id);
    if (items.length === 0) throw new Error("Order has no items");

    const transType = order.order_type === "SALES" ? "OUT" : "IN";
    for (const it of items) {
      await StockLedger.create({
        item_id: it.item_id,
        transaction_type: transType,
        reference_type: "ORDER",
        reference_id: order.id,
        quantity: it.quantity,
        unit_cost: it.unit_price,
        notes: `Auto from ${order.order_code}`,
        created_by: req.user ? req.user.id : null
      }, conn);
    }

    await conn.query("UPDATE orders SET status = 'CONFIRMED' WHERE id = ?", [order.id]);
    await conn.commit();
    res.json({ success: true, message: "Order confirmed and stock updated", transaction_type: transType });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
'@
Set-Content -Path "src\routes\orders.js" -Value $ordersRoute -Encoding UTF8
Write-Host "[OK] src/routes/orders.js" -ForegroundColor Green

# ============================================================
# 6) src/routes/orderItems.js
# ============================================================
$orderItemsRoute = @'
const express = require("express");
const router = express.Router();
const OrderItem = require("../models/OrderItem");

const authMod = require("../middleware/auth");
const authenticate = authMod.authenticate || authMod.authMiddleware || authMod.verifyToken || authMod.default || authMod;

const rbacMod = require("../middleware/rbac");
const authorize = rbacMod.authorize || rbacMod.checkRole || rbacMod.requireRole || rbacMod.default || rbacMod;

router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const data = await OrderItem.findAll(req.query);
    res.json({ success: true, data, count: data.length });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const data = await OrderItem.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Order item not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/", authorize(["ADMIN", "MANAGER", "SALES", "WAREHOUSE"]), async (req, res, next) => {
  try {
    const id = await OrderItem.create(req.body);
    res.status(201).json({ success: true, data: { id } });
  } catch (err) { next(err); }
});

router.put("/:id", authorize(["ADMIN", "MANAGER", "SALES"]), async (req, res, next) => {
  try {
    const ok = await OrderItem.update(req.params.id, req.body);
    if (!ok) return res.status(404).json({ success: false, message: "Order item not found" });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete("/:id", authorize(["ADMIN", "MANAGER"]), async (req, res, next) => {
  try {
    const ok = await OrderItem.remove(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: "Order item not found" });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
'@
Set-Content -Path "src\routes\orderItems.js" -Value $orderItemsRoute -Encoding UTF8
Write-Host "[OK] src/routes/orderItems.js" -ForegroundColor Green

# ============================================================
# 7) src/routes/stockLedger.js
# ============================================================
$stockLedgerRoute = @'
const express = require("express");
const router = express.Router();
const StockLedger = require("../models/StockLedger");

const authMod = require("../middleware/auth");
const authenticate = authMod.authenticate || authMod.authMiddleware || authMod.verifyToken || authMod.default || authMod;

const rbacMod = require("../middleware/rbac");
const authorize = rbacMod.authorize || rbacMod.checkRole || rbacMod.requireRole || rbacMod.default || rbacMod;

router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const data = await StockLedger.findAll(req.query);
    res.json({ success: true, data, count: data.length });
  } catch (err) { next(err); }
});

router.get("/item/:itemId", async (req, res, next) => {
  try {
    const data = await StockLedger.findByItem(req.params.itemId, req.query.limit || 100);
    res.json({ success: true, data, count: data.length });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const data = await StockLedger.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Ledger entry not found" });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/", authorize(["ADMIN", "MANAGER", "WAREHOUSE"]), async (req, res, next) => {
  try {
    const result = await StockLedger.create({
      ...req.body,
      created_by: req.user ? req.user.id : null
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

module.exports = router;
'@
Set-Content -Path "src\routes\stockLedger.js" -Value $stockLedgerRoute -Encoding UTF8
Write-Host "[OK] src/routes/stockLedger.js" -ForegroundColor Green

# ============================================================
# 8) src/index.js  (ghi de - giu 5 routes cu + them 3 routes moi)
# ============================================================
$indexContent = @'
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initDatabase } = require("./config/db");

const authRoutes       = require("./routes/auth");
const userRoutes       = require("./routes/users");
const partnerRoutes    = require("./routes/partners");
const itemRoutes       = require("./routes/items");
const auditLogRoutes   = require("./routes/auditLogs");
const orderRoutes      = require("./routes/orders");
const orderItemRoutes  = require("./routes/orderItems");
const stockLedgerRoutes = require("./routes/stockLedger");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => res.json({
  name: "SUNNY AI FLEX 3D API",
  version: "3.0.0",
  day: "Day 3 - Orders / Order_Items / Stock_Ledger"
}));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/audit-logs", auditLogRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/order-items", orderItemRoutes);
app.use("/api/stock-ledger", stockLedgerRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found: " + req.path }));

app.use((err, req, res, next) => {
  console.error("[ERR]", err.message);
  res.status(err.status || 500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => console.log(`[SERVER] Running on http://localhost:${PORT}`));
  } catch (err) {
    console.error("[FATAL]", err);
    process.exit(1);
  }
})();
'@
Set-Content -Path "src\index.js" -Value $indexContent -Encoding UTF8
Write-Host "[OK] src/index.js" -ForegroundColor Green

# ============================================================
# 9) test_day3.ps1
# ============================================================
$testContent = @'
$ErrorActionPreference = "Stop"
$base = "http://localhost:3000/api"

Write-Host "=== SUNNY AI - DAY 3 TEST ===" -ForegroundColor Cyan

# --- 1. Login admin/123 ---
$loginBody = @{ username = "admin"; password = "123" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $loginBody -ContentType "application/json"

$token = $null
if ($login.token) { $token = $login.token }
elseif ($login.data -and $login.data.token) { $token = $login.data.token }
if (-not $token) { throw "Login failed - no token in response" }
Write-Host "[OK] Logged in. Token length = $($token.Length)" -ForegroundColor Green

$headers = @{ Authorization = "Bearer $token" }

# --- 2. Lay partner & item mau de test ---
$partners = Invoke-RestMethod -Uri "$base/partners" -Headers $headers
if (-not $partners.data -or $partners.data.Count -lt 1) { throw "No partners. Run seed_data.js first." }
$partnerId = $partners.data[0].id

$items = Invoke-RestMethod -Uri "$base/items" -Headers $headers
if (-not $items.data -or $items.data.Count -lt 2) { throw "Need >=2 items. Run seed_data.js first." }
$itemId1 = $items.data[0].id
$itemId2 = $items.data[1].id
Write-Host "[OK] partnerId=$partnerId, itemId1=$itemId1, itemId2=$itemId2" -ForegroundColor Yellow

# --- 3. Tao don hang (kem 2 dong items) ---
$orderBody = @{
    partner_id = $partnerId
    order_type = "SALES"
    notes      = "Day 3 test order"
    items      = @(
        @{ item_id = $itemId1; quantity = 5; unit_price = 100000 },
        @{ item_id = $itemId2; quantity = 3; unit_price = 250000 }
    )
} | ConvertTo-Json -Depth 5

$newOrder = Invoke-RestMethod -Uri "$base/orders" -Method POST -Body $orderBody -Headers $headers -ContentType "application/json"
$orderId = $newOrder.data.id
Write-Host "[OK] Created order id=$orderId code=$($newOrder.data.order_code)" -ForegroundColor Green

# --- 4. Xem chi tiet don ---
$detail = Invoke-RestMethod -Uri "$base/orders/$orderId" -Headers $headers
Write-Host "[OK] Detail: total=$($detail.data.total_amount), items=$($detail.data.items.Count)" -ForegroundColor Green

# --- 5. Them 1 order_item qua endpoint rieng ---
$addItemBody = @{
    order_id   = $orderId
    item_id    = $itemId1
    quantity   = 2
    unit_price = 90000
} | ConvertTo-Json
$added = Invoke-RestMethod -Uri "$base/order-items" -Method POST -Body $addItemBody -Headers $headers -ContentType "application/json"
$orderItemId = $added.data.id
Write-Host "[OK] Added order_item id=$orderItemId" -ForegroundColor Green

# --- 6. Update order_item ---
$updBody = @{ quantity = 4; unit_price = 95000 } | ConvertTo-Json
Invoke-RestMethod -Uri "$base/order-items/$orderItemId" -Method PUT -Body $updBody -Headers $headers -ContentType "application/json" | Out-Null
Write-Host "[OK] Updated order_item id=$orderItemId" -ForegroundColor Green

# --- 7. Confirm don hang -> sinh stock_ledger (OUT kho) ---
$confirm = Invoke-RestMethod -Uri "$base/orders/$orderId/confirm" -Method POST -Headers $headers
Write-Host "[OK] Confirm: $($confirm.message) ($($confirm.transaction_type))" -ForegroundColor Green

# --- 8. Kiem tra stock_ledger cua don ---
$ledger = Invoke-RestMethod -Uri "$base/stock-ledger?reference_type=ORDER&reference_id=$orderId" -Headers $headers
Write-Host "[OK] Ledger entries for order: $($ledger.data.Count)" -ForegroundColor Green
$ledger.data | Format-Table id, item_code, transaction_type, quantity, balance_before, balance_after -AutoSize

# --- 9. Nhap kho thu cong (ADJUST) ---
$adjustBody = @{
    item_id          = $itemId1
    transaction_type = "ADJUST"
    quantity         = 100
    notes            = "Manual adjust day3 test"
} | ConvertTo-Json
$adjust = Invoke-RestMethod -Uri "$base/stock-ledger" -Method POST -Body $adjustBody -Headers $headers -ContentType "application/json"
Write-Host "[OK] Adjust item $itemId1 : before=$($adjust.data.balance_before) after=$($adjust.data.balance_after)" -ForegroundColor Green

# --- 10. Lich su kho cua 1 item ---
$itemLedger = Invoke-RestMethod -Uri "$base/stock-ledger/item/$itemId1" -Headers $headers
Write-Host "[OK] Item $itemId1 ledger history count = $($itemLedger.data.Count)" -ForegroundColor Green

Write-Host ""
Write-Host "=== ALL DAY 3 TESTS PASSED ===" -ForegroundColor Cyan
'@
Set-Content -Path "test_day3.ps1" -Value $testContent -Encoding UTF8
Write-Host "[OK] test_day3.ps1" -ForegroundColor Green

# ============================================================
# DONE
# ============================================================
Write-Host ""
Write-Host "=== HOAN TAT SINH CODE NGAY 3 ===" -ForegroundColor Cyan
Write-Host "Buoc tiep theo:" -ForegroundColor Yellow
Write-Host "  1) Khoi dong server:  node src/index.js" -ForegroundColor White
Write-Host "  2) Mo terminal khac:  .\test_day3.ps1" -ForegroundColor White