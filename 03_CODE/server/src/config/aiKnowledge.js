/**
 * BỘ NÃO CỦA AI (KNOWLEDGE BASE)
 * Chứa luật chung, quyền hạn và quy trình SOP của từng vị trí.
 * Được trích xuất từ tài liệu đặc tả nhân sự V3.0 và AI Agent V2.0.
 */

const AI_KNOWLEDGE_BASE = {
  // 1. LUẬT CHUNG CỦA CÔNG TY (Mọi nhân viên đều phải tuân thủ)
  general_rules: `
    - Bạn là Trợ lý AI thông minh của công ty SUNNY AI FLEX 3D. Thái độ: Lịch sự, chuyên nghiệp, ngắn gọn.
    - Tuyệt đối KHÔNG BỊA SỐ LIỆU. Nếu hệ thống không cung cấp số liệu, hãy trả lời "Chưa có dữ liệu, vui lòng chờ xác nhận".
    - AI KHÔNG ĐƯỢC tự động duyệt chi tiền, KHÔNG tự trừ lương, KHÔNG tự ra quyết định kỷ luật. Mọi quyết định tài chính/kỷ luật phải do con người duyệt.
    - Khi hướng dẫn nhân viên, luôn nhắc nhở họ phải nộp "Bằng chứng" (hình ảnh, checklist, ghi chú) theo đúng quy định.
    - Hướng dẫn nhân viên dựa trên đúng quy trình SOP và quyền hạn của vị trí đó.
  `,

  // 2. QUYỀN HẠN VÀ QUY TRÌNH (SOP) CỦA TỪNG VỊ TRÍ
  roles: {
    giam_doc: {
      title: "Giám đốc",
      permission: "Quyết định chiến lược, ngân sách, nhân sự. Có quyền duyệt chi tiền, duyệt bảng lương. Không được bỏ qua kiểm soát pháp lý.",
      sop_steps: `
        1. Kiểm tra dashboard, dữ liệu chưa đồng bộ và cảnh báo đầu ngày.
        2. Xem số dư khả dụng, dòng tiền dự kiến và các khoản đến hạn.
        3. Kiểm tra doanh số, đơn hàng, công nợ và mức độ thu tiền.
        4. Xem kế hoạch sản xuất, QC, tồn kho, giao hàng và nguồn lực.
        5. Xác định 3 điểm nghẽn ưu tiên và giao người xử lý.
        6. Duyệt các yêu cầu vượt hạn mức của bộ phận.
        7. Kiểm tra quyết định nhân sự và hồ sơ kỷ luật đúng thẩm quyền.
        8. Duyệt điều chỉnh mục tiêu, ngân sách, chiến lược có căn cứ.
        9. Đối chiếu báo cáo ngày và yêu cầu khắc phục dữ liệu sai.
        10. Đánh giá kế hoạch tuần, tháng, quý và mục tiêu giảm chi phí.
      `
    },

    ke_toan: {
      title: "Kế toán",
      permission: "Lập dự thảo bảng lương, đối soát thu chi, quản lý kho, lập báo giá. Tuyệt đối KHÔNG tự phê duyệt chi hoặc sửa dữ liệu đã khóa mà không có dấu vết.",
      sop_steps: `
        1. Tiếp nhận chứng từ điện tử/giấy, kiểm tra tính hợp lệ.
        2. Đối chiếu chứng từ với đơn hàng, giao hàng, nhập kho.
        3. Phân loại khoản thu/chi theo hệ thống tài khoản.
        4. Ghi nhận bút toán có truy vết người và nguồn.
        5. Đối chiếu ngân hàng, tiền mặt, công nợ.
        6. Lập danh sách chứng từ sai/thiếu và yêu cầu bổ sung.
        7. Đối soát chấm công, KPI, chính sách lương.
        8. Lập bảng lương dự thảo, trình Giám đốc duyệt.
        9. Khóa kỳ sau đối chiếu, kiểm soát điều chỉnh hồi tố.
        10. Báo cáo tài chính, dòng tiền và chi phí đúng hạn.
      `
    },

    to_truong: {
      title: "Tổ trưởng kiểm KCS",
      permission: "Phân công trong ca, tạm dừng thao tác nguy hiểm, cách ly hàng lỗi. KHÔNG tự phạt tiền hoặc chốt lương của công nhân.",
      sop_steps: `
        1. Nhận lệnh sản xuất và danh sách công nhân trong ca.
        2. Điểm danh, xác minh người đủ năng lực cho từng công đoạn.
        3. Họp đầu ca: mục tiêu, rủi ro, điểm kiểm soát chất lượng.
        4. Kiểm tra điều kiện an toàn và checklist trước khởi động.
        5. Xác nhận nguyên liệu, công thức, khổ, độ dày theo lệnh.
        6. Giao công việc từng người, xác nhận họ đã nhận việc.
        7. Theo dõi cấp liệu, máy, cuộn thành phẩm, số lượng theo mẻ/lô.
        8. Lấy mẫu, kiểm tra QC theo tiêu chuẩn, ghi bằng chứng.
        9. Cách ly hàng nghỉ lỗi, mở phiếu bất thường, báo Quản lý.
        10. Xác nhận sản lượng đạt, phế phẩm, nguyên nhân, bàn giao cuối ca.
      `
    },

    cong_nhan: {
      title: "Công nhân vận hành máy",
      permission: "Dừng công việc nguy hiểm khi cần thiết. KHÔNG được tự sửa điện, tự đổi công thức hay thay đổi thông số an toàn.",
      sop_steps: `
        1. Đăng nhập, chấm công, xác nhận công việc được giao.
        2. Đọc hướng dẫn SOP và cảnh báo của thiết bị phụ trách.
        3. Kiểm tra che chắn, nút dừng khẩn, khu vực nguy hiểm.
        4. Kiểm tra thông số được phép xem/chỉnh theo phân quyền.
        5. Xác nhận vật tư đầu vào và lệnh sản xuất.
        6. Vận hành theo bước SOP, không bỏ qua liên động an toàn.
        7. Ghi sản lượng, thời gian dừng, mã lỗi và ảnh bằng chứng.
        8. Báo ngay bất thường về tiếng ồn, bụi, kẹt, sai định lượng.
        9. Dừng an toàn và chờ hướng dẫn khi vượt quyền.
        10. Vệ sinh, bàn giao máy, ghi nhật ký cuối ca.
      `
    },

    ctv: {
      title: "Cộng tác viên kinh doanh",
      permission: "Quản lý khách hàng của mình, lên đơn, xem hoa hồng. KHÔNG tự thay đổi giá sàn, không tự hứa hẹn tiến độ giao hàng ngoài hệ thống.",
      sop_steps: `
        1. Nhận khách tiềm năng và xác minh thông tin.
        2. Tạo CRM, kiểm tra trùng, ghi nguồn lead.
        3. Liên hệ khách, ghi nhu cầu, ứng dụng, số lượng.
        4. Xác nhận thông số sản phẩm và năng lực giao hàng.
        5. Lập báo giá theo bảng giá, chính sách được duyệt.
        6. Theo dõi phản hồi và hẹn bước tiếp theo có thời hạn.
        7. Tạo đơn khi có xác nhận, chuyển duyệt đúng cấp.
        8. Theo dõi giao hàng và phản hồi khách.
        9. Nhắc công nợ theo quy trình, không nhận tiền ngoài luồng.
        10. Cập nhật lý do thắng/thua và báo cáo cuối ngày.
      `
    }
  }
};

module.exports = AI_KNOWLEDGE_BASE;