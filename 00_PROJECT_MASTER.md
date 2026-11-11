# PROJECT MASTER - HỆ THỐNG QUẢN TRỊ SUNNY AI FLEX 3D
Cập nhật lần cuối: 2026-11-11
Tech stack: Node.js (Express) + ReactJS (Vite) + MySQL (Aiven Cloud) + OpenAI (tùy chọn)

## 1. QUY ĐỊNH CHUNG
- **Hợp đồng:** 17.000.000đ, thời gian 15-18 ngày. Bắt đầu dữ liệu mới, không import Excel cũ.
- **5 Vai trò (Roles):** 
  - `giam_doc` (Toàn quyền, duyệt cuối)
  - `ke_toan` (Tiền, kho, đơn, lương, công nợ)
  - `to_truong` (Quản lý công nhân trong tổ, xem KPI tổ, không xem lương)
  - `cong_nhan` (Chấm công, báo cáo ca, nhận việc, xem lương cá nhân)
  - `ctv` (Quản lý khách, đơn hàng của mình, xem hoa hồng)
- **Quy tắc AI:** AI chỉ đọc dữ liệu (qua API có phân quyền) để tư vấn, viết báo cáo, trả lời SOP. Tuyệt đối KHÔNG tự động duyệt, KHÔNG tự tính lương, KHÔNG sửa dữ liệu.
- **Quy tắc kế toán:** Code backend tự động tính KPI/Lương, lưu vết (audit), không dùng AI để tính toán con số tài chính.

## 2. CẤU TRÚC 17 BẢNG CƠ SỞ DỮ LIỆU (MYSQL - FULL TRƯỜNG)
*(Ghi chú: Lưu ý kiểu dữ liệu DECIMAL cho số thập phân, INT cho tiền VNĐ, JSON cho dữ liệu linh hoạt).*

### NHÓM 1: HỆ THỐNG & NHÂN SỰ
**1. Bảng `users` (25 trường) - Hồ sơ nhân sự**
- id (INT, PK), username (VARCHAR), password_hash (VARCHAR), role (ENUM 5 quyền), status (ENUM: active, resigned, suspended)
- full_name (VARCHAR), dob (DATE), gender (ENUM), cccd (VARCHAR), cccd_date (DATE), cccd_place (VARCHAR), phone (VARCHAR), email (VARCHAR), permanent_address (VARCHAR), current_address (VARCHAR), emergency_contact (VARCHAR)
- team_id (VARCHAR), position (VARCHAR), join_date (DATE), contract_type (ENUM)
- salary_base (INT), bank_account (VARCHAR), bank_name (VARCHAR), tax_code (VARCHAR), bhxh_code (VARCHAR)
- created_at, updated_at (DATETIME)

**2. Bảng `attendance` (11 trường) - Chấm công**
- id (INT), user_id (INT), date (DATE), check_in (DATETIME), check_out (DATETIME), work_hours (DECIMAL), ot_hours (DECIMAL), late_minutes (INT), shift (ENUM: Hành chính, Sáng, Chiều, Đêm), note (VARCHAR), created_at, updated_at

**3. Bảng `payrolls` (22 trường) - Bảng lương**
- id (INT), period (VARCHAR), user_id (INT), salary_base (INT), work_pay (INT), ot_pay (INT), allowances (INT), kpi_bonus (INT), other_bonus (INT), bhxh_deduction (INT), union_fee (INT), pit_tax (INT), advance_payment (INT), other_deduction (INT), net_salary (INT), status (ENUM: draft, approved, paid), approved_by (INT), approved_at (DATETIME), paid_at (DATETIME), note (VARCHAR), created_at, updated_at

**4. Bảng `tasks` (16 trường) - Công việc & KPI**
- id (INT), code (VARCHAR), title (VARCHAR), description (TEXT), assignee_id (INT), assigned_by (INT), team_id (VARCHAR), priority (ENUM), status (ENUM: todo, doing, done, blocked), due (DATETIME), kpi_weight (DECIMAL), evidence_required (BOOLEAN), evidence (TEXT), done_at (DATETIME), created_at, updated_at

### NHÓM 2: KINH DOANH & MUA HÀNG
**5. Bảng `partners` (18 trường) - Khách hàng / NCC**
- id (INT), type (ENUM: customer, supplier), code (VARCHAR), name (VARCHAR), company_name (VARCHAR), contact_person (VARCHAR), phone (VARCHAR), email (VARCHAR), tax_code (VARCHAR), address (VARCHAR), category (VARCHAR), bank_account (VARCHAR), bank_name (VARCHAR), credit_limit (INT), payment_term (INT), owner_id (INT), is_active (BOOLEAN), created_at, updated_at

**6. Bảng `items` (18 trường) - Vật tư / Thành phẩm**
- id (INT), type (ENUM: material, product), code (VARCHAR), barcode (VARCHAR), name (VARCHAR), unit (VARCHAR), price_in (INT), price_out (INT), price_floor (INT), min_stock (DECIMAL), max_stock (DECIMAL), spec_thickness (DECIMAL), spec_width (DECIMAL), spec_length (DECIMAL), weight (DECIMAL), location (VARCHAR), is_active (BOOLEAN), created_at, updated_at

**7. Bảng `orders` (18 trường) - Đơn hàng**
- id (INT), type (ENUM: sale, purchase), code (VARCHAR), partner_id (INT), sub_total (INT), discount (INT), tax_amount (INT), shipping_fee (INT), total (INT), paid_amount (INT), payment_status (ENUM), payment_method (ENUM), status (ENUM), delivery_address (VARCHAR), due_date (DATETIME), note (TEXT), created_by (INT), approved_by (INT), created_at, updated_at

**8. Bảng `order_items` (7 trường) - Chi tiết đơn**
- id (INT), order_id (INT), item_id (INT), qty (DECIMAL), unit_price (INT), amount (INT), created_at

**9. Bảng `marketing` (10 trường) - Chiến dịch**
- id (INT), title (VARCHAR), channel (VARCHAR), budget (INT), spent (INT), start_date (DATETIME), end_date (DATETIME), kpi_target (INT), result (INT), created_at, updated_at

### NHÓM 3: KHO & SẢN XUẤT
**10. Bảng `stock_ledger` (13 trường) - Sổ kho**
- id (INT), item_id (INT), type (ENUM: in, out, adjust), qty (DECIMAL), signed_qty (DECIMAL), unit_cost (INT), batch_no (VARCHAR), ref_type (VARCHAR), ref_id (INT), note (VARCHAR), created_by (INT), created_at

**11. Bảng `work_orders` (14 trường) - Lệnh SX**
- id (INT), code (VARCHAR), product_id (INT), team_id (VARCHAR), supervisor_id (INT), qty_target (DECIMAL), qty_done (DECIMAL), qty_scrap (DECIMAL), priority (ENUM), status (ENUM), start_date (DATETIME), end_date (DATETIME), created_by (INT), created_at, updated_at

**12. Bảng `shift_reports` (16 trường) - Báo cáo ca & QC**
- id (INT), work_order_id (INT), team_id (VARCHAR), day (DATE), shift (ENUM), good_qty (DECIMAL), scrap_qty (DECIMAL), downtime_min (DECIMAL), qc_result (ENUM), qc_note (TEXT), status (ENUM), created_by (INT), approved_by (INT), approved_at (DATETIME), created_at, updated_at

**13. Bảng `assets` (14 trường) - Thiết bị**
- id (INT), code (VARCHAR), serial_no (VARCHAR), name (VARCHAR), brand (VARCHAR), purchase_date (DATE), price (INT), warranty_until (DATE), depreciation (INT), location (VARCHAR), last_maintenance (DATE), next_maintenance (DATE), status (ENUM), created_at, updated_at

### NHÓM 4: TÀI CHÍNH, AI & HỆ THỐNG
**14. Bảng `costs` (11 trường) - Chi phí**
- id (INT), date (DATE), category (VARCHAR), amount (INT), payment_method (ENUM), invoice_no (VARCHAR), description (TEXT), source (VARCHAR), created_by (INT), created_at, updated_at

**15. Bảng `sop_docs` (12 trường) - Quy trình**
- id (INT), code (VARCHAR), title (VARCHAR), steps (TEXT), owner (VARCHAR), tags (VARCHAR), visibility (ENUM), approved (BOOLEAN), version (VARCHAR), created_by (INT), created_at, updated_at

**16. Bảng `audit_logs` (11 trường) - Lịch sử**
- id (INT), user_id (INT), action (VARCHAR), resource (VARCHAR), ref_id (INT), before_data (JSON), after_data (JSON), note (VARCHAR), ip (VARCHAR), user_agent (VARCHAR), at (DATETIME)

**17. Bảng `notifications` (10 trường) - Báo cáo 19h**
- id (INT), type (ENUM), for_role (VARCHAR), for_user_id (INT), title (VARCHAR), data (JSON), narrative (TEXT), read_by (INT), read_at (DATETIME), at (DATETIME)

## 3. TỔNG SỐ 58 API ENDPOINT
**A. Hệ thống & Nhân sự (17 API)**
- Auth: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
- Users: GET /api/users, POST /api/users, PATCH /api/users/:id
- Tasks: GET /api/tasks, POST /api/tasks, PATCH /api/tasks/:id
- Attendance: POST /api/attendance/checkin, POST /api/attendance/checkout, GET /api/attendance
- Payrolls: POST /api/payrolls/generate, POST /api/payrolls/:id/approve, GET /api/payrolls
- Báo cáo: GET /api/kpi (hỗ trợ ?period=day/week/month/quarter/year), GET /api/audit-logs

**B. Kinh doanh & Mua hàng (14 API)**
- Partners: GET /api/partners, POST /api/partners, PATCH /api/partners/:id
- Items: GET /api/items, POST /api/items, PATCH /api/items/:id
- Orders: GET /api/orders, POST /api/orders, PATCH /api/orders/:id, POST /api/orders/:id/approve, POST /api/orders/:id/payment
- Marketing: GET /api/marketing, POST /api/marketing, PATCH /api/marketing/:id

**C. Kho & Sản xuất (12 API)**
- Stock: GET /api/stock/balance, POST /api/stock/in, POST /api/stock/out
- Work Orders: GET /api/work-orders, POST /api/work-orders, PATCH /api/work-orders/:id
- Shift Reports: GET /api/shift-reports, POST /api/shift-reports, POST /api/shift-reports/:id/approve
- Assets: GET /api/assets, POST /api/assets, PATCH /api/assets/:id

**D. Tài chính & Chi phí (3 API)**
- Costs: GET /api/costs, POST /api/costs, DELETE /api/costs/:id

**E. Trí tuệ nhân tạo & Hệ thống (12 API)**
- SOP: GET /api/sop, POST /api/sop, PATCH /api/sop/:id
- AI: POST /api/ai/ask, POST /api/ai/extract-doc
- Notifications: GET /api/notifications, PATCH /api/notifications/:id/read
- Dashboard: GET /api/dashboard
- Settings: GET /api/settings, PATCH /api/settings
- Teams: GET /api/teams
- Export: GET /api/export

## 4. TIẾN ĐỘ HIỆN TẠI (ĐÃ LÀM XONG)
- [x] Tạo cấu trúc thư mục Backend (Node.js + Express).
- [x] Cài đặt MySQL (Dùng dịch vụ Aiven Cloud) thay cho MongoDB.
- [x] Code xong **Module Users & Auth** (Bảng 1). Bao gồm: Đăng nhập (JWT), Phân quyền (RBAC), Tạo tài khoản, Lấy danh sách, Sửa quyền.
- [x] Đã test 6/6 API thành công (tài khoản admin có ID=1 đã lưu trên mây).
- [x] Đã tạo cấu trúc 12 thư mục rỗng đón chờ code.

## 5. VIỆC CẦN LÀM TIẾP THEO (DÀNH CHO CHAT MỚI)
**Nhiệm vụ Ngày 2: Code Module Danh mục (Partners, Items, Audit_Logs)**
1. Tạo bảng `partners`, `items`, `audit_logs` bằng MySQL.
2. Viết API CRUD cho Partners và Items.
3. Viết Middleware tự động ghi log vào bảng `audit_logs` (Lưu ai làm gì, trước/sau khi sửa).
4. Viết file test PowerShell tự động test 3 module này.
*(Yêu cầu AI viết 1 lệnh PowerShell duy nhất chứa toàn bộ code của 3 module này).*