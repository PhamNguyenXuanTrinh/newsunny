const express = require('express'); const router = express.Router();
const { processAIChat } = require('../services/aiService');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

router.post('/chat', auth, async (req, res) => {
  const { question, session_id } = req.body;
  if (!question) return res.status(400).json({ error: 'Vui lòng nhập câu hỏi' });

  if (req.user.role !== 'giam_doc' && question.length > 10000) {
    return res.status(400).json({ error: 'Câu hỏi vượt quá 10.000 ký tự.' });
  }

  const sessionId = session_id || 'default_session';
  const userId = req.user.id;
  const role = req.user.role;

  try {
    if (role !== 'giam_doc') {
      const [count] = await pool.query(
        "SELECT COUNT(*) as c FROM audit_logs WHERE user_id = ? AND action = 'AI_ASK' AND DATE(at) = CURDATE()",
        [userId]
      );
      if (count[0].c >= 100) {
        return res.status(429).json({ error: 'Bạn đã đạt giới hạn 100 câu hỏi/ngày.' });
      }
    }

    const result = await processAIChat(userId, role, sessionId, question);
    await pool.query(`INSERT INTO audit_logs (user_id, action, resource, note, at) VALUES (?, 'AI_ASK', 'ai', ?, NOW())`, [userId, 'Hỏi AI']);
    
    res.json({ success: true, answer: result.answer });
  } catch (err) { 
    // Bọc lỗi để không bao giờ crash server
    console.error("AI Route Error:", err.message);
    res.status(200).json({ success: true, answer: "Xin lỗi, hệ thống AI đang bận hoặc chưa được cấu hình API Key. Vui lòng thử lại sau." }); 
  }
});

module.exports = router;
