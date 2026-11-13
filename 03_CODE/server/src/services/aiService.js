const { pool } = require('../config/db');
const AI_KNOWLEDGE_BASE = require('../config/aiKnowledge');
const { buildCompanyContext } = require('./companyContext');

console.log(
  '🚀 SUNNY AI COMPANY SECRETARY SERVICE v11.0 ĐÃ ĐƯỢC NẠP'
);

const normalizeStr = str => {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
};

const getCurrentUser = async userId => {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      username,
      full_name,
      role,
      team_id,
      position,
      status
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

const loadHistory = async (
  userId,
  sessionId,
  limit = 12
) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        role,
        content,
        created_at
      FROM ai_conversations
      WHERE user_id = ?
        AND session_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [
        userId,
        sessionId,
        Number(limit)
      ]
    );

    return rows
      .reverse()
      .filter(row =>
        row.role === 'user' ||
        row.role === 'assistant'
      )
      .map(row => ({
        role: row.role,
        content: row.content
      }));
  } catch (err) {
    console.error(
      '[AI HISTORY READ ERROR]',
      err.message
    );

    return [];
  }
};

const saveConversation = async ({
  userId,
  sessionId,
  question,
  answer
}) => {
  try {
    await pool.query(
      `
      INSERT INTO ai_conversations
      (
        user_id,
        session_id,
        role,
        content
      )
      VALUES (?, ?, 'user', ?)
      `,
      [
        userId,
        sessionId,
        question
      ]
    );

    await pool.query(
      `
      INSERT INTO ai_conversations
      (
        user_id,
        session_id,
        role,
        content
      )
      VALUES (?, ?, 'assistant', ?)
      `,
      [
        userId,
        sessionId,
        answer
      ]
    );
  } catch (err) {
    console.error(
      '[AI HISTORY SAVE ERROR]',
      err.message
    );
  }
};

const buildKnowledgeText = role => {
  const roleData =
    AI_KNOWLEDGE_BASE.roles?.[role] || {};

  const sections = [];

  if (AI_KNOWLEDGE_BASE.identity) {
    sections.push(`
===== DANH TÍNH AI =====
${AI_KNOWLEDGE_BASE.identity}
`);
  }

  if (AI_KNOWLEDGE_BASE.general_rules) {
    sections.push(`
===== LUẬT CHUNG =====
${AI_KNOWLEDGE_BASE.general_rules}
`);
  }

  if (
    role === 'giam_doc' &&
    AI_KNOWLEDGE_BASE.executive_mode
  ) {
    sections.push(`
===== CHẾ ĐỘ THƯ KÝ GIÁM ĐỐC =====
${AI_KNOWLEDGE_BASE.executive_mode}
`);
  }

  if (AI_KNOWLEDGE_BASE.company_workflow) {
    sections.push(`
===== LOGIC VẬN HÀNH TOÀN CÔNG TY =====

${Object.values(
  AI_KNOWLEDGE_BASE.company_workflow
).join('\n')}
`);
  }

  if (AI_KNOWLEDGE_BASE.management_alerts) {
    sections.push(`
===== QUY TẮC CẢNH BÁO =====
${AI_KNOWLEDGE_BASE.management_alerts}
`);
  }

  if (AI_KNOWLEDGE_BASE.analysis_rules) {
    sections.push(`
===== QUY TẮC PHÂN TÍCH =====
${AI_KNOWLEDGE_BASE.analysis_rules}
`);
  }

  if (AI_KNOWLEDGE_BASE.answer_format) {
    sections.push(`
===== ĐỊNH DẠNG TRẢ LỜI =====
${AI_KNOWLEDGE_BASE.answer_format}
`);
  }

  if (AI_KNOWLEDGE_BASE.database_knowledge) {
    sections.push(`
===== Ý NGHĨA DATABASE =====
${AI_KNOWLEDGE_BASE.database_knowledge}
`);
  }

  if (AI_KNOWLEDGE_BASE.cross_module_reasoning) {
    sections.push(`
===== SUY LUẬN LIÊN PHÒNG BAN =====
${AI_KNOWLEDGE_BASE.cross_module_reasoning}
`);
  }

  if (AI_KNOWLEDGE_BASE.authority_control) {
    sections.push(`
===== GIỚI HẠN QUYỀN AI =====
${AI_KNOWLEDGE_BASE.authority_control}
`);
  }

  sections.push(`
===== VAI TRÒ NGƯỜI DÙNG =====

Chức danh:
${roleData.title || role}

Quyền hạn:
${roleData.permission || 'Chưa cấu hình'}

Cách AI hỗ trợ vai trò này:
${roleData.ai_behavior || 'Hỗ trợ trong phạm vi quyền được phép.'}

SOP vai trò:
${roleData.sop_steps || 'Chưa cấu hình.'}
`);

  return sections.join('\n');
};

const buildSystemPrompt = ({
  user,
  role,
  companyContext
}) => {
  const knowledge =
    buildKnowledgeText(role);

  return `
Bạn là SUNNY AI - Thư ký Điều hành AI của SUNNY AI FLEX 3D.

Bạn đang làm việc trực tiếp với dữ liệu thật do backend cung cấp.

==================================================
NGƯỜI ĐANG HỎI
==================================================

Họ tên: ${user.full_name}
Username: ${user.username}
Vai trò: ${role}
Vị trí: ${user.position || 'Chưa khai báo'}
Tổ/nhóm: ${user.team_id || 'Chưa khai báo'}

==================================================
KNOWLEDGE BASE
==================================================

${knowledge}

==================================================
DỮ LIỆU THỰC TẾ TỪ DATABASE
==================================================

${companyContext}

==================================================
QUY TẮC TUYỆT ĐỐI
==================================================

1. Không được bịa số liệu.

2. Không được dùng số liệu mà SYSTEM CONTEXT
   không cung cấp như thể đó là dữ liệu thật.

3. Nếu thiếu dữ liệu để kết luận, phải nói:
   "Hiện hệ thống chưa có đủ dữ liệu để kết luận."

4. Phải phân biệt:
   - Số liệu từ hệ thống
   - Phân tích của AI
   - Đề xuất của AI

5. Không được tự tuyên bố đã:
   - duyệt tiền
   - trừ lương
   - sửa kho
   - hủy đơn
   - kỷ luật nhân viên
   nếu backend chưa thực hiện hành động đó.

6. Khi người hỏi là Giám đốc:
   ưu tiên nhìn vấn đề ở cấp toàn công ty
   và chỉ ra mối liên hệ giữa các bộ phận.

7. Khi phát hiện vấn đề:
   nêu rõ:
   - Vấn đề
   - Số liệu liên quan
   - Ảnh hưởng
   - Đề xuất xử lý

8. Không phóng đại mức độ nghiêm trọng
   nếu dữ liệu chưa đủ căn cứ.

9. Với số tiền:
   dùng định dạng VNĐ dễ đọc.

10. Trả lời bằng tiếng Việt tự nhiên,
    rõ ràng, chuyên nghiệp.

11. Nếu câu hỏi đơn giản,
    trả lời thẳng vào câu hỏi,
    không bắt buộc tạo báo cáo dài.

12. Nếu Giám đốc hỏi tổng quan công ty,
    cuối câu trả lời phải có:
    "3 việc nên ưu tiên xử lý".
`;
};

const callOpenAI = async messages => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY chưa được cấu hình'
    );
  }

  const baseUrl =
    String(
      process.env.OPENAI_BASE_URL ||
      'https://api.openai.com/v1'
    ).replace(/\/$/, '');

  const response = await fetch(
    `${baseUrl}/chat/completions`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Authorization:
          `Bearer ${process.env.OPENAI_API_KEY}`
      },

      body: JSON.stringify({
        model:
          process.env.OPENAI_MODEL ||
          'gpt-4o-mini',

        messages,

        temperature: 0.2,

        max_tokens:
          Number(
            process.env.OPENAI_MAX_TOKENS ||
            1800
          )
      })
    }
  );

  const raw =
    await response.text();

  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      `AI API trả dữ liệu không hợp lệ: ${raw.slice(0, 300)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      `AI API HTTP ${response.status}`
    );
  }

  const answer =
    data?.choices?.[0]?.message?.content;

  if (!answer) {
    throw new Error(
      'AI API không trả nội dung'
    );
  }

  return answer.trim();
};

const processAIChat = async (
  userId,
  role,
  sessionId,
  question
) => {
  try {
    const user =
      await getCurrentUser(userId);

    if (!user) {
      return {
        answer:
          'Không tìm thấy thông tin tài khoản người dùng.'
      };
    }

    if (user.status !== 'active') {
      return {
        answer:
          'Tài khoản hiện không ở trạng thái hoạt động.'
      };
    }

    const cleanQuestion =
      String(question || '').trim();

    if (!cleanQuestion) {
      return {
        answer:
          'Vui lòng nhập câu hỏi.'
      };
    }

    console.log(
      `[SUNNY AI v11] user=${user.username} role=${role} question="${cleanQuestion.slice(0, 160)}"`
    );

    // ==========================================
    // 1. LẤY DỮ LIỆU THẬT CẦN THIẾT
    // ==========================================

    const company =
      await buildCompanyContext({
        userId,
        role,
        question: cleanQuestion
      });

    console.log(
      '[SUNNY AI CONTEXT]',
      {
        period: company.period,
        sections: company.sections
      }
    );

    // ==========================================
    // 2. LẤY LỊCH SỬ HỘI THOẠI
    // ==========================================

    const history =
      await loadHistory(
        userId,
        sessionId,
        12
      );

    // ==========================================
    // 3. SYSTEM PROMPT
    // ==========================================

    const systemPrompt =
      buildSystemPrompt({
        user,
        role,
        companyContext:
          company.context
      });

    // ==========================================
    // 4. GHÉP MESSAGE
    // ==========================================

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },

      ...history,

      {
        role: 'user',
        content: cleanQuestion
      }
    ];

    // ==========================================
    // 5. GỌI AI
    // ==========================================

    const answer =
      await callOpenAI(messages);

    // ==========================================
    // 6. LƯU LỊCH SỬ
    // ==========================================

    await saveConversation({
      userId,
      sessionId,
      question: cleanQuestion,
      answer
    });

    return {
      answer,
      meta: {
        period: company.period,
        sections: company.sections
      }
    };

  } catch (err) {
    console.error(
      '[AI SERVICE ERROR]',
      {
        message: err.message,
        stack: err.stack
      }
    );

    throw err;
  }
};

module.exports = {
  processAIChat
};