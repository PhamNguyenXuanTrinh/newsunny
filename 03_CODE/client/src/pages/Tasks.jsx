import { useEffect, useState } from 'react';
import api from '../api';
import { Plus, X, Upload, AlertTriangle, Target, TrendingUp } from 'lucide-react';
import DataTable from '../components/DataTable';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [period, setPeriod] = useState('month');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', assignee_id: '', task_type: 'kpi', kpi_weight: 10, revenue_value: 0, start_date: '', due: '' 
  });

  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [evidenceText, setEvidenceText] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(currentUser.role);
      
      const resTasks = await api.get(`/tasks?period=${period}`);
      setTasks(resTasks.data.data);
      
      if (['giam_doc', 'ke_toan', 'to_truong'].includes(currentUser.role)) {
        try { 
          const resUsers = await api.get('/users'); 
          setUsers(resUsers.data); 
        } catch {
          console.log("Không có quyền lấy danh sách users");
        }
      }
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  // Bọc trong setTimeout để tránh lỗi setState đồng bộ trong useEffect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [period]);

  const handleAssignTask = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData, 
        assignee_id: Number(formData.assignee_id), 
        kpi_weight: formData.task_type === 'kpi' ? Number(formData.kpi_weight) : 0, 
        revenue_value: formData.task_type === 'revenue' ? Number(formData.revenue_value) : 0,
        start_date: formData.start_date === '' ? null : formData.start_date
      };
      await api.post('/tasks', payload);
      setIsModalOpen(false);
      fetchData();
    } catch (err) { 
      alert('Lỗi: ' + (err.response?.data?.error || err.message)); 
    }
  };

  const handleSubmitEvidence = async (e) => {
    e.preventDefault();
    if (!evidenceText.trim()) return alert('Vui lòng nhập bằng chứng');
    try {
      await api.patch(`/tasks/${currentTaskId}`, { status: 'done', evidence: evidenceText });
      setIsEvidenceOpen(false);
      setEvidenceText('');
      fetchData();
    } catch (err) { 
      alert('Lỗi: ' + (err.response?.data?.error || err.message)); 
    }
  };

  const getStatusBadge = (status, dueDate) => {
    const isLate = new Date(dueDate) < new Date() && status !== 'done';
    if (status === 'done') return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold whitespace-nowrap">Hoàn thành</span>;
    if (isLate) return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold flex items-center gap-1 whitespace-nowrap"><AlertTriangle size={12}/> Trễ hạn</span>;
    if (status === 'doing') return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold whitespace-nowrap">Đang làm</span>;
    return <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold whitespace-nowrap">Chờ làm</span>;
  };

  const columns = [
    { header: 'Công việc', accessor: 'title', render: (r) => <span className="font-medium text-slate-800 min-w-[200px] block">{r.title}</span> },
    { header: 'Người nhận', accessor: 'assignee_name', render: (r) => <span className="whitespace-nowrap">{r.assignee_name || `ID: ${r.assignee_id}`}</span> },
    { header: 'Loại', accessor: 'task_type', render: (r) => <span className={`px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${r.task_type === 'revenue' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>{r.task_type === 'revenue' ? `Doanh thu: ${Number(r.revenue_value).toLocaleString()} đ` : `KPI (x${r.kpi_weight})`}</span> },
    { header: 'Hạn chót', accessor: 'due', render: (r) => <span className="whitespace-nowrap">{new Date(r.due).toLocaleDateString('vi-VN')}</span> },
    { header: 'Trạng thái', accessor: 'status', render: (r) => getStatusBadge(r.status, r.due) },
    { header: 'Thao tác', accessor: 'id', render: (r) => (
      r.status !== 'done' ? <button onClick={() => { setCurrentTaskId(r.id); setIsEvidenceOpen(true); }} className="flex items-center gap-1 text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 whitespace-nowrap"><Upload size={14}/> Báo cáo</button> : null
    )}
  ];

  return (
    <div className="space-y-6">
      {/* HEADER: Mobile xếp dọc */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Công việc & KPI</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý công việc và đánh giá năng suất.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          {/* Bộ lọc thời gian: cuộn ngang trên mobile */}
          <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <div className="flex bg-slate-100 p-1 rounded-xl w-max">
              {[
                { key: 'day', label: 'Hôm nay' }, { key: 'week', label: 'Tuần này' },
                { key: 'month', label: 'Tháng này' }, { key: 'quarter', label: 'Quý này' }, { key: 'year', label: 'Năm nay' }
              ].map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)} className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${period === p.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{p.label}</button>
              ))}
            </div>
          </div>

          {['giam_doc', 'ke_toan', 'to_truong'].includes(userRole) && (
            <button 
              onClick={() => { setFormData({ title: '', assignee_id: '', task_type: 'kpi', kpi_weight: 10, revenue_value: 0, start_date: '', due: '' }); setIsModalOpen(true); }} 
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto shrink-0"
            >
              <Plus size={18} /> Giao việc mới
            </button>
          )}
        </div>
      </div>

      <DataTable columns={columns} data={tasks} loading={loading} />

      {/* Modal Giao việc thông minh */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[550px] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-4 sm:px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">Giao việc mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 p-1"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAssignTask} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên công việc *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="VD: Kiểm tra máy dệt, Thu nợ khách hàng..." />
              </div>

              {/* Form 3 cột trên desktop, 1 cột mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Người nhận *</label>
                  <select required value={formData.assignee_id} onChange={e => setFormData({...formData, assignee_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Chọn --</option>
                    {users.filter(u => u.role !== 'giam_doc').map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày bắt đầu</label>
                  <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hạn chót *</label>
                  <input required type="date" value={formData.due} onChange={e => setFormData({...formData, due: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="bg-blue-50 p-3 sm:p-4 rounded-xl border border-blue-100">
                <label className="block text-sm font-bold text-blue-800 mb-3">Sếp muốn giao loại việc gì?</label>
                {/* Radio cards: 1 cột mobile, 2 cột desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <label className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.task_type === 'kpi' ? 'border-blue-500 bg-white shadow-sm' : 'border-transparent hover:bg-blue-100'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <input type="radio" name="task_type" value="kpi" checked={formData.task_type === 'kpi'} onChange={() => setFormData({...formData, task_type: 'kpi'})} className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-slate-800 text-sm flex items-center gap-1"><Target size={14}/> Việc tính KPI</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-6">Đánh giá năng suất, tính lương thưởng.</p>
                  </label>

                  <label className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${formData.task_type === 'revenue' ? 'border-emerald-500 bg-white shadow-sm' : 'border-transparent hover:bg-blue-100'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <input type="radio" name="task_type" value="revenue" checked={formData.task_type === 'revenue'} onChange={() => setFormData({...formData, task_type: 'revenue'})} className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-800 text-sm flex items-center gap-1"><TrendingUp size={14}/> Việc mang lại tiền</span>
                    </div>
                    <p className="text-xs text-slate-500 ml-6">Thu nợ, chốt đơn, mang về doanh thu.</p>
                  </label>
                </div>

                <div className="mt-4 pt-4 border-t border-blue-200">
                  {formData.task_type === 'kpi' ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Mức độ quan trọng (Trọng số) *</label>
                      <select required value={formData.kpi_weight} onChange={e => setFormData({...formData, kpi_weight: e.target.value})} className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="1">1 - Việc phụ, không quan trọng</option>
                        <option value="5">5 - Việc bình thường</option>
                        <option value="10">10 - Việc quan trọng</option>
                        <option value="20">20 - Việc cực kỳ quan trọng</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền dự kiến mang lại (VNĐ) *</label>
                      <input required type="number" min="0" step="100000" value={formData.revenue_value} onChange={e => setFormData({...formData, revenue_value: e.target.value})} className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white font-bold text-emerald-600" placeholder="VD: 50000000" />
                    </div>
                  )}
                </div>
              </div>

              {/* Nút: mobile xếp dọc */}
              <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg w-full sm:w-auto">Hủy</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md font-bold w-full sm:w-auto">Giao việc</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Báo cáo */}
      {isEvidenceOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[450px] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-4 sm:px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10 shrink-0">
              <h3 className="font-bold text-lg">Báo cáo hoàn thành</h3>
              <button onClick={() => setIsEvidenceOpen(false)} className="text-slate-400 hover:text-red-500 p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmitEvidence} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium mb-1">Bằng chứng *</label>
                <textarea required rows="4" value={evidenceText} onChange={e => setEvidenceText(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Nhập ghi chú hoặc link ảnh..."></textarea>
              </div>
              <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsEvidenceOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg w-full sm:w-auto">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 w-full sm:w-auto">Gửi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}