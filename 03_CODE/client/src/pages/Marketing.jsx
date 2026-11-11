import { useEffect, useState } from 'react';
import api from '../api';
import { Plus, X, Megaphone, Target, TrendingUp } from 'lucide-react';
import DataTable from '../components/DataTable';

export default function Marketing() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State Modal Thêm chiến dịch
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '', channel: 'Facebook', budget: 0, kpi_target: 0
  });

  const fetchCampaigns = () => {
    setLoading(true);
    api.get('/marketing')
      .then(res => setCampaigns(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => { fetchCampaigns(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        budget: Number(formData.budget),
        kpi_target: Number(formData.kpi_target)
      };
      await api.post('/marketing', payload);
      setIsModalOpen(false);
      fetchCampaigns();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const columns = [
    { header: 'Tên chiến dịch', accessor: 'title', render: (r) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
          <Megaphone size={20} />
        </div>
        <span className="font-bold text-slate-800">{r.title}</span>
      </div>
    )},
    { header: 'Kênh', accessor: 'channel', render: (r) => (
      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold">{r.channel}</span>
    )},
    { header: 'Ngân sách', accessor: 'budget', render: (r) => (
      <span className="font-semibold text-slate-700">{Number(r.budget).toLocaleString('vi-VN')} đ</span>
    )},
    { header: 'Mục tiêu (Khách)', accessor: 'kpi_target', render: (r) => (
      <span className="flex items-center gap-1 text-sm text-slate-600"><Target size={14}/> {r.kpi_target}</span>
    )},
    { header: 'Kết quả đạt', accessor: 'result', render: (r) => {
      const percent = r.kpi_target > 0 ? Math.round((r.result / r.kpi_target) * 100) : 0;
      return (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-semibold text-emerald-600">{r.result} khách</span>
            <span className="text-slate-500">{percent}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${percent >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
          </div>
        </div>
      );
    }}
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-blue-600" /> Quản lý Tiếp thị
          </h1>
          <p className="text-slate-500 text-sm mt-1">Theo dõi hiệu quả các chiến dịch quảng cáo.</p>
        </div>
        
        <button onClick={() => { setFormData({ title: '', channel: 'Facebook', budget: 0, kpi_target: 0 }); setIsModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm">
          <Plus size={18} /> Tạo chiến dịch
        </button>
      </div>

      {/* Bảng Dữ liệu */}
      <DataTable columns={columns} data={campaigns} loading={loading} />

      {/* Modal Thêm Chiến dịch */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[500px] overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Tạo Chiến dịch mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Tên chiến dịch *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="VD: Khuyến mãi Thảm 3D mùa đông" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Kênh chạy *</label>
                  <select required value={formData.channel} onChange={e => setFormData({...formData, channel: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="Facebook">Facebook</option>
                    <option value="Google">Google Ads</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Zalo">Zalo</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Ngân sách dự kiến (đ) *</label>
                  <input required type="number" min="0" step="100000" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Mục tiêu (Số lượng khách hàng) *</label>
                <input required type="number" min="0" value={formData.kpi_target} onChange={e => setFormData({...formData, kpi_target: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md">Lưu chiến dịch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}