import { useEffect, useState } from 'react';
import api from '../api';
import { Plus, Edit2, X, Wrench, AlertTriangle } from 'lucide-react';
import DataTable from '../components/DataTable';

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAsset, setCurrentAsset] = useState(null);
  const [formData, setFormData] = useState({
    code: '', name: '', brand: '', purchase_date: '', price: 0, status: 'active'
  });

  const fetchAssets = () => {
    setLoading(true);
    api.get('/assets')
      .then(res => setAssets(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Giữ nguyên cách bọc setTimeout để tránh cảnh báo setState đồng bộ trong useEffect
    const timer = setTimeout(() => {
      fetchAssets();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleAddNew = () => {
    setCurrentAsset(null);
    setFormData({ code: '', name: '', brand: '', purchase_date: '', price: 0, status: 'active' });
    setIsModalOpen(true);
  };

  const handleEdit = (asset) => {
    setCurrentAsset(asset);
    setFormData({
      code: asset.code,
      name: asset.name,
      brand: asset.brand || '',
      purchase_date: asset.purchase_date ? asset.purchase_date.slice(0, 10) : '',
      price: asset.price || 0,
      status: asset.status
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, price: Number(formData.price) };
      if (currentAsset) {
        await api.patch(`/assets/${currentAsset.id}`, payload);
      } else {
        await api.post('/assets', payload);
      }
      setIsModalOpen(false);
      fetchAssets();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const columns = [
    { header: 'Mã TS', accessor: 'code', render: (r) => <span className="font-bold text-slate-800">{r.code}</span> },
    { header: 'Tên thiết bị', accessor: 'name', render: (r) => <span className="font-medium text-slate-700">{r.name}</span> },
    { header: 'Hãng SX', accessor: 'brand', render: (r) => r.brand || '-' },
    { header: 'Ngày mua', accessor: 'purchase_date', render: (r) => r.purchase_date ? new Date(r.purchase_date).toLocaleDateString('vi-VN') : '-' },
    { header: 'Nguyên giá', accessor: 'price', render: (r) => <span className="font-semibold text-blue-600">{Number(r.price).toLocaleString('vi-VN')} đ</span> },
    {
      header: 'Trạng thái',
      accessor: 'status',
      render: (r) => {
        if (r.status === 'broken') {
          return <span className="flex items-center gap-1 text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded w-max"><AlertTriangle size={14}/> Đang hỏng</span>;
        }
        if (r.status === 'maintenance') {
          return <span className="flex items-center gap-1 text-amber-600 font-bold text-xs bg-amber-50 px-2 py-1 rounded w-max"><Wrench size={14}/> Bảo trì</span>;
        }
        return <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded w-max">● Hoạt động</span>;
      }
    },
    {
      header: 'Thao tác',
      accessor: 'id',
      render: (r) => (
        <button onClick={() => handleEdit(r)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition">
          <Edit2 size={16} />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* HEADER: mobile xếp dọc, desktop xếp ngang */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Tài sản / Máy móc</h1>
          <p className="text-slate-500 text-sm mt-1">Theo dõi thiết bị và lịch bảo trì nhà xưởng.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm w-full sm:w-auto"
        >
          <Plus size={18} /> Thêm tài sản
        </button>
      </div>

      <DataTable columns={columns} data={assets} loading={loading} />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {/* Modal: mobile full chiều rộng trừ lề, desktop 500px */}
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[500px] max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-50 px-4 sm:px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-lg text-slate-800">
                {currentAsset ? 'Sửa thông tin tài sản' : 'Thêm tài sản mới'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4">
              {/* Form: mobile 1 cột, desktop 2 cột */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Mã tài sản *</label>
                  <input
                    required
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: MAY-01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="maintenance">Đang bảo trì</option>
                    <option value="broken">Đang hỏng</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Tên thiết bị *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Máy dệt vòng tròn"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Hãng sản xuất</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={e => setFormData({...formData, brand: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Ngày mua</label>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={e => setFormData({...formData, purchase_date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nguyên giá (VNĐ) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="100000"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-blue-600"
                />
              </div>

              <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg w-full sm:w-auto"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md w-full sm:w-auto"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}