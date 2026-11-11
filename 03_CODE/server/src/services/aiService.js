const { pool } = require('../config/db');

const removeDiacritics = (str) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

const processAIChat = async (userId, role, sessionId, question) => {
  try {
    const qNorm = removeDiacritics(question.toLowerCase());
    let dbContext = '';
    
    // 1. TRUY VẤN DỮ LIỆU THẬT (Phân tích từ khóa thông minh hơn)
    
    // Hỏi về Doanh thu
    if (qNorm.includes('doanh thu')) {
      try {
        const [rev] = await pool.query(`SELECT SUM(total) as total FROM orders WHERE type='sale' AND status IN ('approved', 'delivered', 'done')`);
        dbContext += `[DỮ LIỆU THẬT]: Tổng doanh thu hiện tại là ${Number(rev[0].total || 0).toLocaleString('vi-VN')} VNĐ.\n`;
      } catch (e) { dbContext += `Lỗi đọc doanh thu.\n`; }
    }

    // Hỏi về Đơn hàng / Chờ duyệt
    if (qNorm.includes('don hang') || qNorm.includes('cho duyet')) {
      try {
        const [pending] = await pool.query(`SELECT COUNT(*) as count FROM orders WHERE status='draft'`);
        dbContext += `[DỮ LIỆU THẬT]: Hiện có ${pending[0].count} đơn hàng đang chờ duyệt.\n`;
      } catch (e) { dbContext += `Lỗi đọc đơn hàng.\n`; }
    }

    // Hỏi về Tồn kho
    if (qNorm.includes('kho') || qNorm.includes('sap het')) {
      try {
        const [stock] = await pool.query(`SELECT i.name, COALESCE(SUM(s.signed_qty), 0) as stock FROM items i LEFT JOIN stock_ledger s ON i.id = s.item_id GROUP BY i.id HAVING stock < i.min_stock`);
        if (stock.length > 0) {
          dbContext += `[DỮ LIỆU THẬT]: Các mặt hàng đang cảnh báo hết kho: ${stock.map(s => `${s.name} (Còn ${s.stock})`).join(', ')}.\n`;
        } else {
          dbContext += `[DỮ LIỆU THẬT]: Kho hàng đang an toàn.\n`;
        }
      } catch (e) { dbContext += `Lỗi đọc kho.\n`; }
    }

    // Hỏi về Nhân sự
    if (qNorm.includes('nhan vien') || qNorm.includes('nhan su')) {
      try {
        const [users] = await pool.query(`SELECT COUNT(*) as count FROM users WHERE status = 'active'`);
        dbContext += `[DỮ LIỆU THẬT]: Hiện có ${users[0].count} nhân viên đang làm việc.\n`;
      } catch (e) {}
    }

    // Hỏi về Lương
    if (qNorm.includes('luong')) {
      if (role === 'giam_doc' || role === 'ke_toan') {
        try {
          // Trích xuất tên nhân viên từ câu hỏi (nếu có)
          const matchName = question.match(/của\s+(.+?)\s+(là|bao)/i);
          let targetName = matchName ? matchName[1].trim() : '';
          
          if (targetName) {
            const [payrolls] = await pool.query(`SELECT u.full_name, p.net_salary FROM payrolls p JOIN users u ON p.user_id = u.id WHERE u.full_name LIKE ? ORDER BY p.period DESC LIMIT 1`, [`%${targetName}%`]);
            if (payrolls.length > 0) {
              dbContext += `[DỮ LIỆU THẬT]: Lương gần nhất của ${payrolls[0].full_name} là ${Number(payrolls[0].net_salary).toLocaleString('vi-VN')} VNĐ.\n`;
            } else {
              dbContext += `[DỮ LIỆU THẬT]: Không tìm thấy dữ liệu lương cho "${targetName}".\n`;
            }
          } else {
            const [payrolls] = await pool.query(`SELECT u.full_name, p.net_salary FROM payrolls p JOIN users u ON p.user_id = u.id ORDER BY p.period DESC LIMIT 3`);
            dbContext += `[DỮ LIỆU THẬT]: Bảng lương gần nhất: ${payrolls.map(p => `${p.full_name} (${Number(p.net_salary).toLocaleString('vi-VN')}đ)`).join(', ')}.\n`;
          }
        } catch (e) {}
      } else {
        dbContext += `[HỆ THỐNG TỪ CHỐI]: Bạn không có quyền xem dữ liệu lương.\n`;
      }
    }

    // Hỏi về Ai làm tốt nhất / tệ nhất (KPI)
    if (qNorm.includes('tot nhat') || qNorm.includes('te nhat') || qNorm.includes('kpi')) {
      try {
        const [kpiData] = await pool.query(`
          SELECT u.full_name, 
            COALESCE(SUM(CASE WHEN t.status = 'done' THEN t.kpi_weight ELSE 0 END), 0) as done_weight,
            COALESCE(SUM(t.kpi_weight), 0) as total_weight
          FROM users u
          LEFT JOIN tasks t ON u.id = t.assignee_id AND t.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
          WHERE u.role != 'giam_doc'
          GROUP BY u.id
          HAVING total_weight > 0
          ORDER BY (done_weight / total_weight) DESC
        `);
        
        if (kpiData.length > 0) {
          const best = kpiData[0];
          const worst = kpiData[kpiData.length - 1];
          dbContext += `[DỮ LIỆU THẬT VỀ KPI THÁNG NÀY]:\n`;
          dbContext += `- Làm tốt nhất: ${best.full_name} (${Math.round((best.done_weight/best.total_weight)*100)}% KPI)\n`;
          dbContext += `- Làm tệ nhất: ${worst.full_name} (${Math.round((worst.done_weight/worst.total_weight)*100)}% KPI)\n`;
        } else {
          dbContext += `[DỮ LIỆU THẬT]: Chưa có đủ dữ liệu công việc để đánh giá KPI tháng này.\n`;
        }
      } catch (e) {}
    }

    // 2. Lấy lịch sử chat
    const [history] = await pool.query(`SELECT role, content FROM ai_conversations WHERE user_id = ? AND session_id = ? ORDER BY created_at DESC LIMIT 10`, [userId, sessionId]);
    const messages = history.reverse().map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content }));
    messages.push({ role: 'user', content: question });

    // 3. Gọi OpenAI (Ép AI trả lời dựa trên dữ liệu thật)
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
