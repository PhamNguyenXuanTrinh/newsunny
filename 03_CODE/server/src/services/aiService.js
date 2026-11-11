const { pool } = require('../config/db');

const removeDiacritics = (str) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

const processAIChat = async (userId, role, sessionId, question, agentType = 'commander') => {
  const qNorm = removeDiacritics(question.toLowerCase());
  let dbContext = '';
  
  // 1. Truy vấn Database (Data Sandbox)
  if (qNorm.includes('luong') || qNorm.includes('payroll')) {
    if (role === 'giam_doc' || role === 'ke_toan') {
      try {
        const [payrolls] = await pool.query(`SELECT u.full_name, p.net_salary FROM payrolls p JOIN users u ON p.user_id = u.id ORDER BY p.period DESC LIMIT 5`);
        dbContext += `Dữ liệu lương gần nhất: ${JSON.stringify(payrolls)}\n`;
      } catch (e) { dbContext += `Lỗi đọc dữ liệu lương.\n`; }
    } else {
      dbContext += `[HỆ THỐNG TỪ CHỐI]: Người dùng không có quyền xem dữ liệu lương.\n`;
    }
  }

  if (qNorm.includes('doanh thu') || qNorm.includes('revenue')) {
    try {
      const [rev] = await pool.query(`SELECT SUM(total) as total FROM orders WHERE type='sale' AND status IN ('approved', 'delivered', 'done')`);
      dbContext += `Tổng doanh thu: ${rev[0].total || 0} VNĐ.\n`;
    } catch (e) { dbContext += `Lỗi đọc dữ liệu doanh thu.\n`; }
  }

  if (qNorm.includes('kho') || qNorm.includes('ton') || qNorm.includes('het hang')) {
    try {
      const [stock] = await pool.query(`SELECT i.name, COALESCE(SUM(s.signed_qty), 0) as stock, i.min_stock FROM items i LEFT JOIN stock_ledger s ON i.id = s.item_id GROUP BY i.id, i.name, i.min_stock HAVING COALESCE(SUM(s.signed_qty), 0) < i.min_stock`);
      dbContext += `Mặt hàng sắp hết kho: ${JSON.stringify(stock)}\n`;
    } catch (e) { dbContext += `Lỗi đọc dữ liệu kho.\n`; }
  }

  // 2. Lấy lịch sử chat
  const [history] = await pool.query(`SELECT role, content FROM ai_conversations WHERE user_id = ? AND session_id = ? ORDER BY created_at DESC LIMIT 10`, [userId, sessionId]);
  const messages = history.reverse().map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content }));

  // 3. Tạo System Prompt (Nhân cách + Dữ liệu DB)
  let systemPrompt = `Bạn là ${agentType.toUpperCase()} AI, trợ lý điều hành của công ty FLEX 3D.\n`;
  systemPrompt += `Dưới đây là dữ liệu thực tế từ hệ thống mà bạn cần dùng để trả lời:\n${dbContext}\n`;
  systemPrompt += `Nếu người dùng không có quyền xem dữ liệu, hãy từ chối khéo léo.\n`;

  // 4. Thêm câu hỏi mới vào mảng messages
  messages.push({ role: 'user', content: question });

  // 5. Gọi APIVN.vn (Chuẩn OpenAI)
  let aiText = "Xin lỗi, hiện tại hệ thống không thể kết nối với máy chủ AI.";
  try {
    const apiRes = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.3
      })
    });

    const data = await apiRes.json();
    if (data.choices && data.choices.length > 0) {
      aiText = data.choices[0].message.content;
    } else {
      console.log("Lỗi APIVN trả về:", data);
    }
  } catch (error) {
    console.error("Lỗi gọi APIVN:", error.message);
  }

  // 6. Lưu lịch sử
  try {
    await pool.query(`INSERT INTO ai_conversations (user_id, session_id, role, content) VALUES (?, ?, 'user', ?)`, [userId, sessionId, question]);
    await pool.query(`INSERT INTO ai_conversations (user_id, session_id, role, content) VALUES (?, ?, 'assistant', ?)`, [userId, sessionId, aiText]);
  } catch (e) {}

  return { answer: aiText, agent: agentType };
};

module.exports = { processAIChat };


