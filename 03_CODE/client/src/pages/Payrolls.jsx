import { useEffect, useState } from 'react';
import api from '../api';
import { Calculator, CheckCircle, RefreshCw } from 'lucide-react';
import DataTable from '../components/DataTable';

export default function Payrolls() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  
  // Mặc định lấy tháng hiện tại (YYYY-MM)
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); 

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(currentUser.role);
      
      const res = await api.get(`/payrolls?period=${period}`);
      
      if (res.data && res.data.data) {
        setPayrolls(res.data.data);
      } else {
        setPayrolls([]);
      }
    } catch (err) {
      console.error("Lỗi khi load danh sách lương:", err);
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Bọc setTimeout để tránh cảnh báo setState đồng bộ trong React 18
    const timer = setTimeout(() => {
      fetchPayrolls();
    }, 0);
    return () => clearTimeout(timer);
  }, [period]);

  // 1. Tính lương toàn bộ
  const handleGenerateAll = async () => {
    if (!window.confirm(`Hệ thống sẽ tính lương cho TẤT CẢ nhân viên trong kỳ ${period}. Bạn chắc chắn chứ?`)) return;
    try {
      const res = await api.post('/payrolls/generate', { period });
      alert(res.data.message);
      fetchPayrolls();
    } catch (err) {
      alert('Lỗi tính lương: ' + (err.response?.data?.error || err.message));
    }
  };

  // 2. Tính lại riêng 1 người (Dành cho Kế toán)
  const handleGenerateSingle = async (userId, userName) => {
    if (!window.confirm(`Tính lại lương kỳ ${period} cho nhân viên: ${userName}?`)) return;
    try {
      const res = await api.post('/payrolls/generate', { period, user_id: userId });
      alert(res.data.message);
      fetchPayrolls();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  // 3. Duyệt lương (Dành cho Giám đốc)
  const handleApprove = async (id) => {
    if (!window.confirm('Duyệt bảng lương này? Nhân viên sẽ nhìn thấy tiền lương sau khi duyệt.')) return;
    try {
      await api.post(`/payrolls/${id}/approve`);
      fetchPayrolls();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const columns = [
    { header: 'Nhân viên', accessor: 'full_name', render: (r) => <span className="font-bold text-slate-800 whitespace-nowrap">{r.full_name}</span> },
    { header: 'Kỳ lương', accessor: 'period', render: (r) => <span className="whitespace-nowrap">{r.period}</span> },
    { header: 'Lương CB', accessor: 'salary_base', render: (r) => <span className="whitespace-nowrap">{Number(r.salary_base).toLocaleString('vi-VN')} đ</span> },
    { header: 'Lương theo giờ', accessor: 'work_pay', render: (r) => <span className="whitespace-nowrap">{Math.round(Number(r.work_pay)).toLocaleString('vi-VN')} đ</span> },
    { header: 'Thưởng KPI', accessor: 'kpi_bonus', render: (r) => <span className="text-emerald-600 font-semibold whitespace-nowrap">+{Number(r.kpi_bonus).toLocaleString('vi-VN')} đ</span> },
    { header: 'Khấu trừ (BHXH)', accessor: 'bhxh_deduction', render: (r) => <span className="text-red-500 whitespace-nowrap">-{Math.round(Number(r.bhxh_deduction)).toLocaleString('vi-VN')} đ</span> },
    { header: 'Thực lĩnh', accessor: 'net_salary', render: (r) => <span className="font-extrabold text-blue-600 text-base whitespace-nowrap">{Math.round(Number(r.net_salary)).toLocaleString('vi-VN')} đ</span> },
    { header: 'Trạng thái', accessor: 'status', render: (r) => {
      if (r.status === 'paid') return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold whitespace-nowrap">Đã trả</span>;
      if (r.status === 'approved') return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold whitespace-nowrap">Đã duyệt</span>;
      return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold whitespace-nowrap">Chờ duyệt</span>;
    }},
    { header: 'Thao tác', accessor: 'id', render: (r) => (
      <div className="flex gap-2">
        {/* Nút Duyệt cho GĐ */}
        {r.status === 'draft' && userRole === 'giam_doc' && (
          <button onClick={() => handleApprove(r.id)} className="flex items-center gap-1 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition whitespace-nowrap">
            <CheckCircle size={14} /> Duyệt
          </button>
        )}
        {/* Nút tính lại cho Kế toán */}
        {userRole === 'ke_toan' && (
          <button onClick={() => handleGenerateSingle(r.user_id, r.full_name)} className="text-slate-500 hover:bg-slate-100 p-1.5 rounded" title="Tính lại cho người này">
            <RefreshCw size={16} />
          </button>
        )}
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      {/* HEADER: Mobile xếp dọc */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bảng lương nhân sự</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý thu nhập của nhân viên theo kỳ.</p>
        </div>
        
        {/* Cụm điều khiển: Mobile xếp dọc, Desktop xếp ngang */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <input 
            type="month" 
            value={period} 
            onChange={e => setPeriod(e.target.value)} 
            className="px-3 py-2 border rounded-lg bg-white shadow-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
          />
          
          {['giam_doc', 'ke_toan'].includes(userRole) && (
            <button 
              onClick={handleGenerateAll} 
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-semibold w-full sm:w-auto shrink-0"
            >
              <Calculator size={18} /> Tính lương toàn công ty
            </button>
          )}
        </div>
      </div>

      {/* DataTable đã có phân trang */}
      <DataTable columns={columns} data={payrolls} loading={loading} />
      
      {/* Hướng dẫn */}
      <div className="text-sm text-slate-500 bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
        <div className="bg-amber-200 text-amber-800 p-1 rounded-full mt-0.5 shrink-0">💡</div>
        <div>
          <p><b>Hướng dẫn:</b></p>
          <p>- Chọn kỳ lương (Ví dụ: Tháng 11/2026).</p>
          <p>- Bấm <b>"Tính lương toàn công ty"</b> để hệ thống tự động quét Chấm công + KPI và tính ra tiền.</p>
          <p>- Giám đốc bấm <b>"Duyệt"</b> để chốt bảng lương.</p>
        </div>
      </div>
    </div>
  );
}