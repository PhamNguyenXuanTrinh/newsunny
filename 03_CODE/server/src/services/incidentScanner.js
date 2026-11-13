const { pool } = require('../config/db');

const scanAndCreateIncidents = async (dateStr = null) => {
  try {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    console.log(`🤖 [BOT] Bắt đầu quét vi phạm ngày: ${targetDate}`);

    const [attendances] = await pool.query(`
      SELECT a.*, u.full_name, u.username 
      FROM attendance a 
      JOIN users u ON a.user_id = u.id 
      WHERE a.date = ?
    `, [targetDate]);

    if (attendances.length === 0) {
      console.log(`🤖 [BOT] Không có dữ liệu chấm công ngày ${targetDate}`);
      return { scanned: 0, created: 0 };
    }

    let createdCount = 0;

    for (const att of attendances) {
      if (!att.check_in) continue;

      const checkInTime = new Date(att.check_in);
      const hour = checkInTime.getHours();
      const minute = checkInTime.getMinutes();

      let lateMinutes = 0;
      if (hour >= 8) {
        lateMinutes = (hour - 8) * 60 + minute;
      }

      if (lateMinutes > 0) {
        let violationCode = null;
        if (lateMinutes <= 15) violationCode = 'VP001';
        else if (lateMinutes <= 30) violationCode = 'VP002';
        else violationCode = 'VP003';

        const [existing] = await pool.query(`
          SELECT id FROM incidents 
          WHERE user_id = ? AND DATE(created_at) = ? 
          AND JSON_CONTAINS(violation_codes, JSON_QUOTE(?))
        `, [att.user_id, targetDate, violationCode]);

        if (existing.length === 0) {
          const code = `INC-AUTO-${Date.now()}-${att.user_id}`;
          const evidence = `[Hệ thống tự động] Nhân viên ${att.full_name} (${att.username}) check-in lúc ${checkInTime.toLocaleTimeString('vi-VN')}, trễ ${lateMinutes} phút so với giờ làm việc (8h00).`;

          await pool.query(`
            INSERT INTO incidents (code, user_id, violation_codes, status, evidence, created_by) 
            VALUES (?, ?, ?, 'pending_explanation', ?, 1)
          `, [code, att.user_id, JSON.stringify([violationCode]), evidence]);

          console.log(`🤖 [BOT] ✅ Đã tạo phiếu cho ${att.full_name}: ${violationCode} (Trễ ${lateMinutes} phút)`);
          createdCount++;
        } else {
          console.log(`🤖 [BOT] ⏭️ Bỏ qua ${att.full_name} (Đã có phiếu ${violationCode})`);
        }
      }
    }

    console.log(`🤖 [BOT] Hoàn tất! Đã quét ${attendances.length} nhân viên, tạo mới ${createdCount} phiếu.`);
    return { scanned: attendances.length, created: createdCount };

  } catch (err) {
    console.error('🤖 [BOT] Lỗi quét vi phạm:', err.message);
    throw err;
  }
};

module.exports = { scanAndCreateIncidents };
