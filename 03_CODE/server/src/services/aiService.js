const { pool } = require('../config/db');

const removeDiacritics = (str) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

const processAIChat = async (userId, role, sessionId, question) => {
  try {
    const qNorm = removeDiacritics(question.toLowerCase());
    let dbContext = '';
    
    // 1. TRUY VẤN DỮ LIỆU THẬT (Lấy chính xác số liệu từ Database)
    if (qNorm.includes('doanh thu') || qNorm.includes('revenue')) {
      try {
        const [rev] = await pool.query(`SELECT SUM(total) as total FROM orders WHERE type='sale' AND status IN ('approved', 'delivered', 'done')`);
        const total = Number(rev[0].total || 0);
        dbContext += `[DỮ LIỆU THẬT TỪ HỆ THỐNG]: Tổng doanh thu hiện tại là ${total.toLocaleString('vi-VN')} VNĐ.\n`;
      } catch (e) { dbContext += `Lỗi đọc doanh thu.\n`; }
    }

    if (qNorm.includes('kho') || qNorm.includes('ton') || qNorm.includes('sap het')) {
      try {
        const [stock] = await pool.query(`SELECT i.name, COALESCE(SUM(s.signed_qty), 0) as stock FROM items i LEFT JOIN stock_ledger s ON i.id = s.item_id GROUP BY i.id HAVING stock < i.min_stock`);
        if (stock.length > 0) {
          dbContext += `[DỮ LIỆU THẬT TỪ HỆ THỐNG]: Mặt hàng sắp hết kho: ${JSON.stringify(stock)}.\n`;
        } else {
          dbContext += `[DỮ LIỆU THẬT TỪ HỆ THỐNG]: Kho hàng đang ở mức an toàn, không có mặt hàng nào dưới định mức.\n`;
        }
      } catch (e) { dbContext += `Lỗi đọc kho.\n`; }
    }

    if (qNorm.includes('luong') || qNorm.includes('payroll')) {
      if (role === 'giam_doc' || role === 'ke_toan') {
        try {
          const [payrolls] = await pool.query(`SELECT u.full_name, p.net_salary FROM payrolls p JOIN users u ON p.user_id = u.id ORDER BY p.period DESC LIMIT 5`);
          dbContext += `[DỮ LIỆU THẬT TỪ HỆ THỐNG]: Dữ liệu lương gần nhất: ${JSON.stringify(payrolls)}.\n`;
        } catch (e) {}
      } else {
        dbContext += `[HỆ THỐNG TỪ CHỐI]: Người dùng không có quyền xem dữ liệu lương.\n`;
      }
    }

    if (qNorm.includes('nhan vien') || qNorm.includes('nhân sự')) {
      try {
        const [users] = await pool.query(`SELECT COUNT(*) as count FROM users WHERE status = 'active'`);
        dbContext += `[DỮ LIỆU THẬT TỪ HỆ THỐNG]: Hiện có ${users[0].count} nhân viên đang làm việc.\n`;
      } catch (e) {}
    }

    // 2. Lấy lịch sử chat
    const [history] = await pool.query(`SELECT role, content FROM ai_conversations WHERE user_id = ? AND session_id = ? ORDER BY created_at DESC LIMIT 10`, [userId, sessionId]);
    const messages = history.reverse().map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content }));
    messages.push({ role: 'user', content: question });

    // 3. Gọi OpenAI (Ép AI phải dùng dữ liệu thật)
    let aiText = "Xin lỗi, hiện tại tôi không thể kết nối với máy chủ AI.";
    try {
      const apiRes = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `Bạn là Trợ lý AI của công ty FLEX 3D. Đây là dữ liệu thật lấy từ hệ thống: ${dbContext}. Hãy trả lời câu hỏi của người dùng một cách ngắn gọn, chính xác dựa trên dữ liệu này. Tuyệt đối không được nói là "chưa có dữ liệu" nếu dữ liệu đã được cung cấp ở trên.` }, 
            ...messages
          ],
          temperature: 0.1
        })
      });
      const data = await apiRes.json();
      if (data.choices && data.choices.length > 0) aiText = data.choices[0].message.content;
    } catch (error) {}

    // 4. Lưu lịch sử
    try {
      await pool.query(`INSERT INTO ai_conversations (user_id, session_id, role, content) VALUES (?, ?, 'user', ?)`, [userId, sessionId, question]);
      await pool.query(`INSERT INTO ai_conversations (user_id, session_id, role, content) VALUES (?, ?, 'assistant', ?)`, [userId, sessionId, aiText]);
    } catch (e) {}

    return { answer: aiText };
  } catch (globalError) {
    return { answer: "Đã xảy ra lỗi hệ thống khi xử lý câu hỏi của bạn." };
  }
};

module.exports = { processAIChat };
