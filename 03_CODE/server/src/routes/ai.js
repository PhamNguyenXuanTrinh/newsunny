const express = require('express'); const router = express.Router();
const { processAIChat } = require('../services/aiService');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const handleChat = async (req, res, agentType = 'commander') => {
  const { question, session_id } = req.body;
  if (!question) return res.status(400).json({ error: 'Vui lòng nhập câu hỏi' });
  
  const sessionId = session_id || 'default_session';
  const userId = req.user.id;
  const role = req.user.role;

  try {
    // KIỂM TRA GIỚI HẠN 100 CÂU/NGÀY (Trừ Giám đốc)
    if (role !== 'giam_doc') {
      const [count] = await pool.query(
        "SELECT COUNT(*) as c FROM audit_logs WHERE user_id = ? AND action = 'AI_ASK' AND DATE(at) = CURDATE()",
        [userId]
      );
      if (count[0].c >= 100) {
        return res.status(429).json({ error: 'Bạn đã đạt giới hạn 100 câu hỏi/ngày. Vui lòng quay lại vào ngày mai.' });
      }
    }

    const result = await processAIChat(userId, role, sessionId, question, agentType);
    
    // Ghi log để đếm
    await logAudit(userId, 'AI_ASK', `ai_${agentType}`, null, null, { question }, null, req.ip);
    
    res.json({ success: true, session_id: sessionId, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// Các Endpoints cho 12 Agent
router.post('/chat', auth, (req, res) => handleChat(req, res, 'commander'));
router.post('/sales', auth, (req, res) => handleChat(req, res, 'sales'));
router.post('/accounting', auth, (req, res) => handleChat(req, res, 'accounting'));
// ... (Bạn có thể thêm 9 endpoints còn lại tương tự)
router.post('/ask', auth, (req, res) => handleChat(req, res, 'commander')); // Tương thích cũ

module.exports = router;
