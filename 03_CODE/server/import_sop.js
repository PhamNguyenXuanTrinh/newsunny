require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const { pool } = require('./src/config/db');

const FILE_428_MA = "C:\\Users\\trinh\\Downloads\\SUNNY_FLEX3D_BO_HO_SO_TONG_HOP_GUI_DON_VI_PHAN_MEM\\03_DU_LIEU_DOI_SOAT\\Bang_doi_chieu_428_ma.csv";
const FILE_458_TINH_HUONG = "C:\\Users\\trinh\\Downloads\\SUNNY_FLEX3D_BO_HO_SO_TONG_HOP_GUI_DON_VI_PHAN_MEM\\03_DU_LIEU_DOI_SOAT\\Bang_phan_loai_458_tinh_huong.csv";

// Hàm đọc CSV có xử lý BOM
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
    console.log("⏳ Đang đọc file đối chiếu 428 mã...");
    const data428 = await readCSV(FILE_428_MA);
    
    // IN RA CÁC CỘT THỰC TẾ ĐỂ KIỂM TRA
    if (data428.length > 0) {
      console.log("🔍 Các cột trong file 428 mã:", Object.keys(data428[0]));
    } else {
      console.log("❌ File 428 mã rỗng hoặc không đọc được!");
      process.exit(1);
    }

    const validCodes = new Set();
    data428.forEach(row => {
      const code = row['Mã V6'] || row['Mã nguồn'] || row['Mã'];
      if (code) validCodes.add(code.trim().toUpperCase());
    });
    console.log(`✅ Tìm thấy ${validCodes.size} mã hợp lệ trong danh mục.`);

    console.log("⏳ Đang đọc file 458 tình huống chi tiết...");
    const data458 = await readCSV(FILE_458_TINH_HUONG);
    
    if (data458.length > 0) {
      console.log("🔍 Các cột trong file 458 tình huống:", Object.keys(data458[0]));
    }

    let importedCount = 0;
    let skippedCount = 0;

    console.log("⏳ Bắt đầu nạp vào Database...");
    
    for (let row of data458) {
      const code = (row['Mã nguồn'] || row['Mã V6'] || row['Mã'] || '').trim().toUpperCase();
      if (!code) continue;

      // Chỉ import nếu mã nằm trong danh mục 428 mã chuẩn
      if (validCodes.has(code)) {
        const title = row['Tên tình huống bằng tiếng Việt'] || row['Tên V6 nguyên bản'] || 'Chưa có tên';
        const tags = row['Loại'] || row['Loại V6'] || '';
        
        const dataToCheck = row['Dữ liệu cần kiểm'] || 'Không có';
        const howToCheck = row['Cách kiểm tra cụ thể'] || 'Không có';
        const action = row['Biện pháp xử lý'] || 'Không có';
        const evidence = row['Bằng chứng hoàn thành'] || 'Không có';

        const steps = `1. Dữ liệu cần kiểm: ${dataToCheck}\n2. Cách kiểm tra: ${howToCheck}\n3. Biện pháp xử lý: ${action}\n4. Bằng chứng hoàn thành: ${evidence}`;
        const owner = 'Hệ thống V6';

        await pool.query(`
          INSERT INTO sop_docs (code, title, steps, tags, owner, visibility, approved)
          VALUES (?, ?, ?, ?, ?, 'internal', 1)
          ON DUPLICATE KEY UPDATE 
            title = VALUES(title), 
            steps = VALUES(steps), 
            tags = VALUES(tags),
            owner = VALUES(owner)
        `, [code, title, steps, tags, owner]);
        
        importedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`\n🎉 HOÀN TẤT!`);
    console.log(`✅ Đã nạp thành công: ${importedCount} quy trình SOP vào Database.`);
    console.log(`⏭️ Đã bỏ qua: ${skippedCount} tình huống (không nằm trong 428 mã chuẩn).`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi Import:", err.message);
    process.exit(1);
  }
})();
