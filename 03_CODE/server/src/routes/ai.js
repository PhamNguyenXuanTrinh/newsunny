const express = require('express');
const router = express.Router();

const { processAIChat } = require('../services/aiService');
const { pool } = require('../config/db');
const auth = require('../middleware/auth');

/**
 * SUNNY AI - ROUTE CHAT
 *
 * Nhiệm vụ:
 * - Xác thực người dùng
 * - Kiểm tra câu hỏi
 * - Giới hạn sử dụng theo vai trò
 * - Chuyển câu hỏi sang AI Service
 * - Ghi audit log
 *
 * Không xử lý logic nghiệp vụ tại đây.
 * Việc đọc dữ liệu công ty và phân tích được giao cho aiService.
 */

router.post('/chat', auth, async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;

  let { question, session_id } = req.body;

  // =========================
  // 1. VALIDATE QUESTION
  // =========================
  if (typeof question !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Câu hỏi không hợp lệ.'
    });
  }

  question = question.trim();

  if (!question) {
    return res.status(400).json({
      success: false,
      error: 'Vui lòng nhập câu hỏi.'
    });
  }

  /**
   * Tránh prompt quá lớn.
   *
   * Giám đốc được quyền hỏi dài hơn nhân viên,
   * nhưng vẫn cần giới hạn để bảo vệ server/API.
   */
  const maxLength = role === 'giam_doc' ? 30000 : 10000;

  if (question.length > maxLength) {
    return res.status(400).json({
      success: false,
      error: `Câu hỏi vượt quá ${maxLength.toLocaleString('vi-VN')} ký tự.`
    });
  }

  // =========================
  // 2. SESSION
  // =========================
  const sessionId =
    typeof session_id === 'string' && session_id.trim()
      ? session_id.trim().slice(0, 50)
      : `user_${userId}_default`;

  try {
    // =========================
    // 3. RATE LIMIT
    // =========================

    /**
     * Giám đốc:
     * - Không áp giới hạn 100 câu/ngày.
     *
     * Nhân viên:
     * - Tối đa 100 câu/ngày.
     */
    if (role !== 'giam_doc') {
      const [countRows] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM audit_logs
        WHERE user_id = ?
          AND action = 'AI_ASK'
          AND DATE(at) = CURDATE()
        `,
        [userId]
      );

      const usedToday = Number(countRows[0]?.total || 0);

      if (usedToday >= 100) {
        return res.status(429).json({
          success: false,
          error: 'Bạn đã đạt giới hạn 100 câu hỏi AI trong ngày.'
        });
      }
    }

    // =========================
    // 4. PROCESS AI
    // =========================

    /**
     * Từ đây aiService chịu trách nhiệm:
     *
     * Question
     *      ↓
     * xác định ý định
     *      ↓
     * lấy dữ liệu thật
     *      ↓
     * kiểm tra quyền
     *      ↓
     * knowledge base
     *      ↓
     * company context
     *      ↓
     * AI trả lời
     */
    const result = await processAIChat(
      userId,
      role,
      sessionId,
      question
    );

    // =========================
    // 5. AUDIT LOG
    // =========================
    try {
      await pool.query(
        `
        INSERT INTO audit_logs
        (
          user_id,
          action,
          resource,
          note,
          at
        )
        VALUES (?, 'AI_ASK', 'ai', ?, NOW())
        `,
        [
          userId,
          `AI chat - session: ${sessionId}`
        ]
      );
    } catch (auditError) {
      /**
       * Audit lỗi không được làm AI chat thất bại.
       * Nhưng phải ghi console để quản trị biết.
       */
      console.error(
        '[AI AUDIT ERROR]',
        auditError.message
      );
    }

    // =========================
    // 6. RESPONSE
    // =========================
    return res.json({
      success: true,
      answer:
        result?.answer ||
        'Hiện hệ thống chưa có đủ dữ liệu để trả lời.',
      session_id: sessionId
    });

  } catch (err) {
    console.error('[AI ROUTE ERROR]', {
      userId,
      role,
      sessionId,
      message: err.message,
      stack: err.stack
    });

    /**
     * Không trả lỗi kỹ thuật/API key cho người dùng.
     * Không giả vờ rằng yêu cầu đã thành công.
     */
    return res.status(500).json({
      success: false,
      error: 'Hệ thống AI hiện chưa thể xử lý yêu cầu này. Vui lòng thử lại.'
    });
  }
});

module.exports = router;