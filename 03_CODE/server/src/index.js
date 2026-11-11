require('dotenv').config();
const express = require('express'); const cors = require('cors');
const { initDB } = require('./config/db');
const app = express();
app.use(cors()); app.use(express.json());

initDB().catch(err => { console.error('❌ Lỗi DB:', err.message); process.exit(1); });

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/partners', require('./routes/partners'));
app.use('/api/items', require('./routes/items'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/stock-ledger', require('./routes/stockLedger'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/payrolls', require('./routes/payrolls'));
app.use('/api/sop', require('./routes/sop'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/costs', require('./routes/costs'));
app.use('/api/marketing', require('./routes/marketing'));

// AI Routes
app.use('/api/ai', require('./routes/ai'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server chạy tại http://localhost:${PORT}`));
