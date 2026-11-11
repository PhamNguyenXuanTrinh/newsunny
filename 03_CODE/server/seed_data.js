require('dotenv').config(); // <--- THÊM DÒNG NÀY ĐỂ NẠP CẤU HÌNH AIVEN
const { pool } = require('./src/config/db');

const randomPhone = () => '09' + Math.floor(10000000 + Math.random() * 90000000);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function seedData() {
  console.log('⏳ Đang bơm dữ liệu mẫu (Seed Data)...');
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. Xóa dữ liệu cũ (chỉ xóa partners và items, giữ nguyên users)
    await connection.query('DELETE FROM partners');
    await connection.query('DELETE FROM items');
    await connection.query('ALTER TABLE partners AUTO_INCREMENT = 1');
    await connection.query('ALTER TABLE items AUTO_INCREMENT = 1');
    console.log('  - Đã dọn dẹp dữ liệu Partners và Items cũ.');

    // 2. Seed 20 Khách hàng
    const customers = [
      { name: 'Công ty TNHH Xây Dựng An Phát', cat: 'Nhà thầu' },
      { name: 'Công ty CP Nội Thất Hòa Phát', cat: 'Doanh nghiệp' },
      { name: 'Đại lý Vật Liệu Minh Khang', cat: 'Đại lý' },
      { name: 'Cửa hàng Trang Trí Sài Gòn', cat: 'Khách buôn' },
      { name: 'Công ty TNHH Kiến Trúc Nhà Đẹp', cat: 'Nhà thầu' },
      { name: 'Chị Nguyễn Thị Hồng (Khách lẻ)', cat: 'Khách lẻ' },
      { name: 'Anh Trần Văn Nam (Khách lẻ)', cat: 'Khách lẻ' },
      { name: 'Công ty CP Vật Liệu Xây Dựng Miền Nam', cat: 'Doanh nghiệp' },
      { name: 'Đại lý Thảm 3D Hoàng Gia', cat: 'Đại lý' },
      { name: 'Công ty TNHH Thiết Kế Nội Thất 24h', cat: 'Doanh nghiệp' }
    ];

    for (let i = 1; i <= 20; i++) {
      const c = customers[i % 10];
      await connection.query(
        `INSERT INTO partners (type, code, name, company_name, contact_person, phone, email, tax_code, address, category, credit_limit, payment_term) 
         VALUES ('customer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `KH${String(i).padStart(3, '0')}`, c.name, c.name, `Người liên hệ ${i}`, randomPhone(),
          `khachhang${i}@gmail.com`, `030${randomInt(1000000, 9999999)}`, `Số ${i} Đường Lê Lợi, TP.HCM`,
          c.cat, randomInt(10, 100) * 1000000, randomChoice([15, 30, 45])
        ]
      );
    }
    console.log('  - Đã tạo 20 Khách hàng.');

    // 3. Seed 10 Nhà cung cấp
    const suppliers = ['Công ty Nhựa Duy Tân', 'Tập đoàn Hóa chất Đức Giang', 'Công ty Bao Bì Tân Tiến', 'Công ty Sơn Jotun', 'NCC Vật Tư Phụ Liệu 1', 'Kho Sỉ Nhựa PET', 'Công ty Giấy Vĩnh Tiến', 'NCC Keo Dán 3M', 'Công ty Sắt Thép Hòa Phát', 'NCC Vật Tư Tổng Hợp'];
    for (let i = 1; i <= 10; i++) {
      await connection.query(
        `INSERT INTO partners (type, code, name, company_name, contact_person, phone, email, tax_code, address, category, payment_term) 
         VALUES ('supplier', ?, ?, ?, ?, ?, ?, ?, ?, 'Nhà cung cấp', ?)`,
        [
          `NCC${String(i).padStart(3, '0')}`, suppliers[i-1], suppliers[i-1], `Sale ${i}`, randomPhone(),
          `ncc${i}@gmail.com`, `010${randomInt(1000000, 9999999)}`, `Khu Công Nghiệp số ${i}`,
          randomChoice([15, 30])
        ]
      );
    }
    console.log('  - Đã tạo 10 Nhà cung cấp.');

    // 4. Seed 15 Vật tư
    for (let i = 1; i <= 15; i++) {
      const price = randomInt(10, 100) * 1000;
      await connection.query(
        `INSERT INTO items (type, code, name, unit, price_in, min_stock, location) 
         VALUES ('material', ?, ?, ?, ?, ?, ?)`,
        [
          `VT${String(i).padStart(3, '0')}`, `Vật tư nguyên liệu ${i}`, randomChoice(['kg', 'm', 'cuộn', 'bao']),
          price, randomInt(50, 500), `Kệ A-${i}`
        ]
      );
    }

    // 5. Seed 15 Thành phẩm (Thảm 3D)
    for (let i = 1; i <= 15; i++) {
      const thickness = randomChoice([6, 8, 10, 12, 15]);
      const priceOut = thickness * 100000 + randomInt(10, 50) * 10000;
      await connection.query(
        `INSERT INTO items (type, code, name, unit, price_out, price_floor, min_stock, spec_thickness, spec_width, spec_length, weight, location) 
         VALUES ('product', ?, ?, 'm2', ?, ?, ?, ?, ?, ?, ?, 'Kho TP')`,
        [
          `TP${String(i).padStart(3, '0')}`, `Thảm 3D FLEX ${thickness}mm - Mẫu ${i}`,
          priceOut, priceOut * 0.8, randomInt(10, 100), thickness, 1.5, 20, thickness * 0.5
        ]
      );
    }
    console.log('  - Đã tạo 15 Vật tư và 15 Thành phẩm.');

    await connection.commit();
    console.log('✅ HOÀN TẤT BƠM DỮ LIỆU MẪU!');
  } catch (err) {
    await connection.rollback();
    console.error('❌ Lỗi bơm dữ liệu:', err.message);
  } finally {
    connection.release();
    process.exit(0);
  }
}

seedData();
