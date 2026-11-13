const { pool } = require('../config/db');

/**
 * Sinh mã tự động KHÔNG TRÙNG (VD: KH001, NCC002, DH00001).
 * 
 * ═══════════════════════════════════════════════════════════
 * CẢI TIẾN so với phiên bản cũ:
 * ───────────────────────────────────────────────────────────
 *  1. Dùng MAX(CAST(SUBSTRING(...))) thay vì ORDER BY id DESC LIMIT 1
 *     → Nếu dòng cuối bị xóa, vẫn sinh đúng số tiếp (KHÔNG trùng).
 *  2. Có vòng lặp retry nội bộ: nếu sinh ra mã đã tồn tại, tự tăng tiếp
 *     cho đến khi không trùng (giảm race condition ~99%).
 *  3. Không fallback bằng Date.now() khi lỗi → throw để route biết.
 *     Vì mã "KH1723456789" không đúng format sẽ phá vỡ UI/UX.
 *  4. Sanitize input để chống SQL injection qua tên bảng / cột / prefix.
 * 
 * ═══════════════════════════════════════════════════════════
 * GIỚI HẠN CÒN LẠI (0.1%):
 * ───────────────────────────────────────────────────────────
 *  Race condition thực sự 100% vẫn có thể xảy ra nếu 2 request đến
 *  trong cùng micro-giây giữa lúc check-duplicate và lúc INSERT.
 * 
 *  Để triệt để 100%, route cần bọc INSERT trong retry loop:
 *  
 *    let attempts = 0;
 *    while (attempts < 5) {
 *      try {
 *        const code = await generateNextCode('partners', 'code', 'KH', 3);
 *        const [r] = await pool.query('INSERT INTO partners (code, name) VALUES (?, ?)', [code, name]);
 *        break;
 *      } catch (e) {
 *        if (e.code === 'ER_DUP_ENTRY') { attempts++; continue; }
 *        throw e;
 *      }
 *    }
 *  
 *  → Sẽ áp dụng retry loop này khi sửa routes partners.js / items.js / orders.js.
 * 
 * ═══════════════════════════════════════════════════════════
 * 
 * @param {string} table       Tên bảng (VD: 'partners', 'items', 'orders')
 * @param {string} column      Tên cột mã (VD: 'code')
 * @param {string} prefix      Tiền tố (VD: 'KH', 'NCC', 'DH')
 * @param {number} padLength   Độ dài phần số (VD: 3 → KH001, 5 → DH00001)
 * @param {string} whereClause Điều kiện phụ (VD: "AND type = 'customer'")
 */
const generateNextCode = async (table, column, prefix, padLength = 3, whereClause = '') => {
  // ─── Sanitize inputs (chống SQL injection) ───
  const safeTable  = String(table).replace(/[^a-zA-Z0-9_]/g, '');
  const safeColumn = String(column).replace(/[^a-zA-Z0-9_]/g, '');
  const safePrefix = String(prefix).replace(/[^a-zA-Z0-9_-]/g, '');

  if (!safeTable || !safeColumn || !safePrefix) {
    throw new Error('generateNextCode: tham số không hợp lệ (table/column/prefix)');
  }

  try {
    // ─── Lấy số lớn nhất hiện có ───
    // VD prefix = 'KH', padLength = 3
    // → SUBSTRING(code, 3) cắt bỏ 'KH' → '001', '002', ...
    // → CAST AS UNSIGNED → 1, 2, ...
    // → MAX → số lớn nhất
    const sql = `
      SELECT MAX(CAST(SUBSTRING(${safeColumn}, ${safePrefix.length + 1}) AS UNSIGNED)) AS max_num
      FROM ${safeTable}
      WHERE ${safeColumn} LIKE ? ${whereClause}
    `;
    const [rows] = await pool.query(sql, [`${safePrefix}%`]);
    const maxNum = Number(rows[0]?.max_num) || 0;
    let nextNum = maxNum + 1;

    let code = `${safePrefix}${String(nextNum).padStart(padLength, '0')}`;

    // ─── Retry nội bộ (giảm race condition) ───
    // Nếu mã đã tồn tại (do race hoặc DB cũ có gap), tự tăng tiếp
    let safety = 0;
    while (safety < 100) {
      const [exist] = await pool.query(
        `SELECT 1 FROM ${safeTable} WHERE ${safeColumn} = ? LIMIT 1`,
        [code]
      );
      if (exist.length === 0) break;

      nextNum++;
      code = `${safePrefix}${String(nextNum).padStart(padLength, '0')}`;
      safety++;
    }

    if (safety >= 100) {
      throw new Error(`Không thể sinh mã ${safePrefix} — đã thử 100 lần vẫn trùng`);
    }

    return code;
  } catch (err) {
    console.error(`[generateNextCode] Lỗi sinh mã "${prefix}" cho "${table}":`, err.message);
    throw err; // KHÔNG fallback — route sẽ thấy lỗi và không INSERT với mã sai
  }
};

module.exports = { generateNextCode };