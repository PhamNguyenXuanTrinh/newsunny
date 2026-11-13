require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

const FILE_CSV = "C:\\Users\\trinh\\Downloads\\SUNNY_FLEX3D_BO_QUY_TAC_115_MA_GUI_PHAN_MEM\\SUNNY_FLEX3D_115_MA_GIA_TRI_QUY_DOI_DOI_CHIEU.csv";

const readCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, '')
      }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

(async () => {
  try {
    console.log("⏳ Đang đọc file CSV...");
    const data = await readCSV(FILE_CSV);
    console.log(`✅ Đọc được ${data.length} dòng dữ liệu.`);

    console.log("⏳ Đang nạp dữ liệu vào Database...");
    let importedCount = 0;

    for (let row of data) {
      const code = (row['Mã'] || '').trim();
      if (!code) continue;

      const groupName = (row['Nhóm'] || '').trim();
      const behavior = (row['Hành vi'] || '').trim();
      const fineAmountStr = (row['Giá trị quy đổi quản trị'] || '0').replace(/[^0-9]/g, '');
      const fineAmount = parseInt(fineAmountStr) || 0;
      const verifyMethod = (row['Bước xác minh'] || '').trim();
      const remedy = (row['Hướng khắc phục'] || '').trim();
      const regulation = (row['Quy định tiền'] || '').trim();
      const colorStatus = (row['Màu khi chưa phát sinh'] || '').trim();

      await pool.query(`
        INSERT INTO violation_rules (code, group_name, behavior, fine_amount, verify_method, remedy, regulation, color_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          group_name = VALUES(group_name),
          behavior = VALUES(behavior),
          fine_amount = VALUES(fine_amount),
          verify_method = VALUES(verify_method),
          remedy = VALUES(remedy),
          regulation = VALUES(regulation),
          color_status = VALUES(color_status)
      `, [code, groupName, behavior, fineAmount, verifyMethod, remedy, regulation, colorStatus]);

      importedCount++;
    }

    console.log(`\n🎉 HOÀN TẤT!`);
    console.log(`✅ Đã nạp thành công: ${importedCount} mã vi phạm vào Database.`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi Import:", err.message);
    process.exit(1);
  }
})();
