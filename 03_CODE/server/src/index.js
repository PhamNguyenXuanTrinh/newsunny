require('dotenv').config();
require('express-async-errors');   // ✅ FIX CRASH: Bắt lỗi async không cần try/catch trong mọi route

const express = require('express');
const cors = require('cors');
const { initDB } = require('./config/db');

const app = express();

// ============================================================
// MIDDLEWARE CHUNG
// ============================================================
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check — để kiểm tra server sống hay không
app.get('/', (req, res) => {
  res.json({
    name: 'SUNNY AI FLEX 3D API',
    status: 'ok',
    time: new Date().toISOString()
  });
});

// ============================================================
// ĐĂNG KÝ ROUTES
// ============================================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/items', require('./routes/items'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/order-items', require('./routes/orderItems'));
app.use('/api/stock-ledger', require('./routes/stockLedger'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/incidents', require('./routes/incidents'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/payrolls', require('./routes/payrolls'));
app.use('/api/sop', require('./routes/sop'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/costs', require('./routes/costs'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/chat-history', require('./routes/chatHistory'));
app.use('/api/shift-reports', require('./routes/shiftReports'));
app.use('/api/ai', require('./routes/ai'));

// ============================================================
// 404 HANDLER
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route không tồn tại: ${req.method} ${req.path}`
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// Với express-async-errors: handler này sẽ BẮT ĐƯỢC cả lỗi async
// từ bất kỳ route nào throw — dù route không có try/catch.
// ============================================================
app.use((err, req, res, next) => {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('[GLOBAL ERROR]', new Date().toISOString());
  console.error('  Route:', req.method, req.path);
  console.error('  Message:', err.message);
  console.error('  Stack:', err.stack);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Nếu response đã gửi rồi → bỏ qua (tránh lỗi "headers already sent")
  if (res.headersSent) return next(err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Lỗi hệ thống không xác định'
  });
});

// ============================================================
// KHỞI ĐỘNG SERVER
// ============================================================
const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
      console.log(`📋 Đã đăng ký 21 route API`);
      console.log(`🛡️  express-async-errors đã kích hoạt — lỗi async sẽ KHÔNG làm crash server`);
    });
  } catch (err) {
    console.error('❌ Không thể khởi động server:', err.message);
    process.exit(1);
  }
})();

// ============================================================
// BẮT LỖI CUỐI CÙNG — không để Node chết vì unhandledRejection
// (Đề phòng trường hợp lỗi xảy ra TRƯỚC khi express-async-errors kịp bắt)
// ============================================================
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  [UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️  [UNCAUGHT EXCEPTION]', err.message);
  console.error(err.stack);
});