import { useEffect, useState } from 'react';
import api from '../api';
import { Plus, X, Receipt, TrendingDown } from 'lucide-react';
import DataTable from '../components/DataTable';

export default function Costs() {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10), 
    category: 'Điện nước', amount: 0, payment_method: 'transfer', 
    invoice_no: '', description: '', source: 'Hóa đơn'
  });

  const fetchCosts = () => {
    setLoading(true);
    api.get('/costs')
      .then(res => setCosts(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => { fetchCosts(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/costs', { ...formData, amount: Number(formData.amount) });
      setIsModalOpen(false);
      fetchCosts();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const totalCost = costs.reduce((sum, item) => sum + Number(item.amount), 0);

  const columns = [
    { header: 'Ngày chi', accessor: 'date', render: (r) => new Date(r.date).toLocaleDateString('vi-VN') },
    { header: 'Hạng mục', accessor: 'category', render: (r) => (<span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold">{r.category}</span>)},
    { header: 'Số tiền', accessor: 'amount', render: (r) => (<span className="font-bold text-red-600">- {Number(r.amount).toLocaleString('vi-VN')} đ</span>)},
    { header: 'Mô tả', accessor: 'description' },
    { header: 'Hình thức', accessor: 'payment_method', render: (r) => r.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản' },
    { header: 'Số hóa đơn', accessor: 'invoice_no', render: (r) => r.invoice_no || '-' },
    { header: 'Nguồn', accessor: 'source', render: (r) => r.source || '-' }
  ];

  return (
    <div className="space-y-6">
      {/* HEADER: Mobile xếp dọc, Desktop xếp ngang */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Chi phí</h1>
          <p className="text-slate-500 text-sm mt-1">Theo dõi các khoản chi tiêu của doanh nghiệp.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          {/* Box tổng chi phí */}
          <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-red-100 text-red-600 p-2 rounded-lg"><TrendingDown size={20}/></div>
            <div>
              <p className="text-xs text-red-500 font-semibold uppercase">Tổng chi phí</p>
              <p className="text-lg font-bold text-red-700">{totalCost.toLocaleString('vi-VN')} đ</p>
            </div>
          </div>
          
          <button 
            onClick={() => { 
              setFormData({ date: new Date().toISOString().slice(0, 10), category: 'Điện nước', amount: 0, payment_method: 'transfer', invoice_no: '', description: '', source: 'Hóa đơn' }); 
              setIsModalOpen(true); 
            }} 
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition shadow-sm w-full sm:w-auto shrink-0"
          >
            <Plus size={18} /> Thêm chi phí
          </button>
        </div>
      </div>

      <DataTable columns={columns} data={costs} loading={loading} />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {/* Modal: Mobile full width trừ lề, Desktop 600px */}
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto flex flex-col">
            {/* Header Modal: Dính trên cùng khi cuộn */}
            <div className="bg-slate-50 px-4 sm:px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10 shrink-0">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Receipt size={20}/> Ghi nhận chi phí mới
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4">
              {/* Form: Mobile 1 cột, Desktop 2 cột */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ngày chi *</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hạng mục *</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="Điện nước">Điện nước</option>
                    <option value="Lương">Lương nhân viên</option>
                    <option value="Vận tải">Vận tải</option>
                    <option value="Vật tư">Mua vật tư</option>
                    <option value="Bảo trì">Bảo trì</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hình thức</label>
                  <select value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="transfer">Chuyển khoản</option>
                    <option value="cash">Tiền mặt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Số hóa đơn</label>
                  <input type="text" value={formData.invoice_no} onChange={e => setFormData({...formData, invoice_no: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                
                {/* Các trường col-span-2 sẽ full width cả trên mobile và desktop */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-blue-600 mb-1">Số tiền (VNĐ) *</label>
                  <input required type="number" min="0" step="1000" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg font-bold text-blue-600 text-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Mô tả chi tiết *</label>
                  <input required type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Nguồn / Chứng từ</label>
                  <input type="text" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Nút bấm: Mobile xếp dọc, Desktop xếp ngang */}
              <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg w-full sm:w-auto">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md w-full sm:w-auto">Lưu chi phí</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}