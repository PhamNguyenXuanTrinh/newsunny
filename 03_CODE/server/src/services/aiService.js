const { pool } = require('../config/db');
const AI_KNOWLEDGE_BASE = require('../config/aiKnowledge');

const removeDiacritics = (str) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

const processAIChat = async (userId, role, sessionId, question) => {
  try {
    const qNorm = removeDiacritics(question.toLowerCase());
    let dbContext = '';
    
    // Lấy thông tin người đang đăng nhập
    const [myUserRows] = await pool.query(`SELECT username, full_name FROM users WHERE id = ?`, [userId]);
    const myUser = myUserRows[0] || { username: 'unknown', full_name: 'Người dùng' };

    // 1. DOANH THU
    if (qNorm.includes('doanh thu')) {
      if (role === 'giam_doc' || role === 'ke_toan') {
        try {
          const [rev] = await pool.query(`SELECT SUM(total) as total FROM orders WHERE type='sale' AND status IN ('approved', 'delivered', 'done')`);
          dbContext += `[DỮ LIỆU THẬT]: Tổng doanh thu công ty là ${Number(rev[0].total || 0).toLocaleString('vi-VN')} VNĐ.\n`;
        } catch (e) { dbContext += `Lỗi đọc doanh thu.\n`; }
      } else {
        dbContext += `[HỆ THỐNG TỪ CHỐI]: Bạn không có quyền xem tổng doanh thu công ty.\n`;
      }
    }

    // 2. ĐƠN HÀNG CHỜ DUYỆT
    if (qNorm.includes('don hang') || qNorm.includes('cho duyet')) {
      try {
        const [pending] = await pool.query(`SELECT COUNT(*) as count FROM orders WHERE status='draft'`);
        dbContext += `[DỮ LIỆU THẬT]: Hiện có ${pending[0].count} đơn hàng đang chờ duyệt.\n`;
      } catch (e) { dbContext += `Lỗi đọc đơn hàng.\n`; }
    }

    // 3. TỒN KHO
    if (qNorm.includes('kho') || qNorm.includes('sap het')) {
      try {
        const [stock] = await pool.query(`SELECT i.name, i.min_stock, COALESCE(SUM(s.signed_qty), 0) as stock FROM items i LEFT JOIN stock_ledger s ON i.id = s.item_id GROUP BY i.id, i.name, i.min_stock HAVING stock < i.min_stock`);
        if (stock.length > 0) {
          dbContext += `[DỮ LIỆU THẬT]: Các mặt hàng đang cảnh báo hết kho: ${stock.map(s => `${s.name} (Còn ${s.stock})`).join(', ')}.\n`;
        } else {
          dbContext += `[DỮ LIỆU THẬT]: Kho hàng đang an toàn.\n`;
        }
      } catch (e) { dbContext += `Lỗi đọc kho: ${e.message}.\n`; }
    }

    // 4. NHÂN SỰ
    if (qNorm.includes('nhan vien') || qNorm.includes('nhan su')) {
      try {
        const [users] = await pool.query(`SELECT COUNT(*) as count FROM users WHERE status = 'active'`);
        dbContext += `[DỮ LIỆU THẬT]: Hiện có ${users[0].count} nhân viên đang làm việc.\n`;
      } catch (e) { dbContext += `Lỗi đọc nhân sự.\n`; }
    }

    // 5. LƯƠNG
    if (qNorm.includes('luong')) {
      try {
        if (role === 'giam_doc' || role === 'ke_toan') {
          const [allUsers] = await pool.query(`SELECT id, username, full_name FROM users`);
          let targetUser = null;
          
          for (let u of allUsers) {
            const uNameNorm = removeDiacritics(u.username.toLowerCase());
            const fNameNorm = removeDiacritics((u.full_name || '').toLowerCase());
            if (qNorm.includes(uNameNorm) || (fNameNorm && qNorm.includes(fNameNorm))) {
              targetUser = u;
              break; 
            }
          }

          if (targetUser) {
            const [payrolls] = await pool.query(`SELECT net_salary, period, status FROM payrolls WHERE user_id = ? ORDER BY period DESC LIMIT 1`, [targetUser.id]);
            if (payrolls.length > 0) {
              dbContext += `[DỮ LIỆU THẬT]: Lương kỳ ${payrolls[0].period} của nhân viên ${targetUser.full_name} (Mã: ${targetUser.username}) là ${Number(payrolls[0].net_salary).toLocaleString('vi-VN')} VNĐ (Trạng thái: ${payrolls[0].status}).\n`;
            } else {
              dbContext += `[DỮ LIỆU THẬT]: Nhân viên ${targetUser.full_name} (${targetUser.username}) chưa có dữ liệu lương trong hệ thống.\n`;
            }
          } else if (qNorm.includes('cua toi') || qNorm.includes('cua minh')) {
            const [payrolls] = await pool.query(`SELECT net_salary, period, status FROM payrolls WHERE user_id = ? ORDER BY period DESC LIMIT 1`, [userId]);
            if (payrolls.length > 0) {
              dbContext += `[DỮ LIỆU THẬT]: Lương kỳ ${payrolls[0].period} của bạn (${myUser.full_name}) là ${Number(payrolls[0].net_salary).toLocaleString('vi-VN')} VNĐ (Trạng thái: ${payrolls[0].status}).\n`;
            } else {
              dbContext += `[DỮ LIỆU THẬT]: Chưa có dữ liệu lương cho bạn (${myUser.full_name}) trong hệ thống.\n`;
            }
          } else {
            dbContext += `[DỮ LIỆU THẬT]: Bạn chưa chỉ định rõ tên nhân viên cần xem lương. Vui lòng hỏi "Lương của nhân viên [Tên/Mã] là bao nhiêu?".\n`;
          }
        } else {
          const myNameNorm = removeDiacritics((myUser.full_name || '').toLowerCase());
          const myUsernameNorm = removeDiacritics(myUser.username.toLowerCase());
          
          const isAskingForSelf = qNorm.includes('cua toi') || qNorm.includes('cua minh') || qNorm.includes(myUsernameNorm) || qNorm.includes(myNameNorm);
          const isAskingForOthers = qNorm.includes('giam doc') || qNorm.includes('ke toan') || qNorm.includes('sep') || qNorm.includes('nguoi khac');

          if (isAskingForOthers && !isAskingForSelf) {
            dbContext += `[HỆ THỐNG TỪ CHỐI]: Bạn chỉ có quyền xem lương của chính mình, không được xem lương của người khác.\n`;
          } else {
            const [payrolls] = await pool.query(`SELECT net_salary, period, status FROM payrolls WHERE user_id = ? ORDER BY period DESC LIMIT 1`, [userId]);
            if (payrolls.length > 0) {
              dbContext += `[DỮ LIỆU THẬT]: Lương kỳ ${payrolls[0].period} của bạn (${myUser.full_name}) là ${Number(payrolls[0].net_salary).toLocaleString('vi-VN')} VNĐ (Trạng thái: ${payrolls[0].status}).\n`;
            } else {
              dbContext += `[DỮ LIỆU THẬT]: Chưa có dữ liệu lương cho bạn (${myUser.full_name}) trong hệ thống.\n`;
            }
          }
        }
      } catch (e) { dbContext += `Lỗi đọc lương: ${e.message}.\n`; }
    }

    // 6. KPI
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
          dbContext += `[DỮ LIỆU THẬT]: Chưa có nhân viên nào được giao công việc (KPI) trong tháng này.\n`;
        }
      } catch (e) { dbContext += `Lỗi đọc KPI.\n`; }
    }

    // 7. Lịch sử chat
    const [history] = await pool.query(`SELECT role, content FROM ai_conversations WHERE user_id = ? AND session_id = ? ORDER BY created_at DESC LIMIT 10`, [userId, sessionId]);
    const messages = history.reverse().map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content }));
    messages.push({ role: 'user', content: question });

    // 8. LUẬT VÀ SOP
    const roleData = AI_KNOWLEDGE_BASE.roles[role] || { title: role, permission: 'Không xác định', sop_steps: 'Không có quy trình' };

    const systemPrompt = `
      Bạn là Trợ lý AI thông minh của công ty SUNNY AI FLEX 3D.
      
      [1. QUY TẮC CHUNG BẮT BUỘC]:
      ${AI_KNOWLEDGE_BASE.general_rules}

      [2. THÔNG TIN NGƯỜI ĐANG HỎI]:
      - Tên: ${myUser.full_name} (Username: ${myUser.username})
      - Vị trí: ${roleData.title}
      - Quyền hạn: ${roleData.permission}
      - Quy trình SOP bắt buộc của họ:
      ${roleData.sop_steps}
      - LƯU Ý ĐẶC BIỆT: Khi người dùng hỏi có chứa từ "tôi", "mình", "của tôi", hãy hiểu đó là đang nói về chính người dùng hiện tại (${myUser.full_name}). Tuyệt đối không đi tìm người có tên là "tôi" trong dữ liệu.

      [3. DỮ LIỆU THỰC TẾ TỪ HỆ THỐNG]:
      ${dbContext || 'Không có dữ liệu truy vấn nào được yêu cầu.'}

      [4. NHIỆM VỤ CỦA BẠN]:
      - Trả lời câu hỏi dựa trên dữ liệu thực tế ở mục 3.
      - QUAN TRỌNG: Nếu mục 3 đã cung cấp thông tin (ví dụ: 0 đơn hàng, lương của bạn là X), bạn PHẢI trả lời đúng thông tin đó. TUYỆT ĐỐI KHÔNG trả lời "Chưa có dữ liệu" khi mục 3 đã có số liệu.
      - Nhắc nhở nộp bằng chứng nếu cần.
      - Không tự duyệt chi, phạt tiền.
    `;

    // 9. GỌI OPENAI
    let aiText = "Xin lỗi, hệ thống đang bận.";
    try {
      const apiRes = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          temperature: 0.1
        })
      });
      const data = await apiRes.json();
      if (data.choices && data.choices.length > 0) aiText = data.choices[0].message.content;
    } catch (error) {
      console.error("Lỗi gọi OpenAI:", error);
    }

    // 10. Lưu lịch sử
    try {
      await pool.query(`INSERT INTO ai_conversations (user_id, session_id, role, content) VALUES (?, ?, 'user', ?)`, [userId, sessionId, question]);
      await pool.query(`INSERT INTO ai_conversations (user_id, session_id, role, content) VALUES (?, ?, 'assistant', ?)`, [userId, sessionId, aiText]);
    } catch (e) {}

    return { answer: aiText };
  } catch (globalError) {
    console.error("Lỗi AI Service:", globalError);
    return { answer: "Đã xảy ra lỗi hệ thống." };
  }
};

module.exports = { processAIChat };