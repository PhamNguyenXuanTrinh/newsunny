import { useEffect, useState } from 'react';
import api from '../api';
import { Search, Plus, Edit2, X, Trash2 } from 'lucide-react';
import DataTable from '../components/DataTable';

export default function Items() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({
    type: 'product', code: '', barcode: '', name: '', unit: 'm2', 
    price_in: 0, price_out: 0, price_floor: 0, min_stock: 0, max_stock: 0,
    spec_thickness: '', spec_width: '', spec_length: '', weight: '', location: ''
  });

  const fetchItems = () => {
    setLoading(true);
    api.get('/items')
      .then(res => setItems(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Giữ nguyên setTimeout để tránh cảnh báo setState đồng bộ trong React 18
    const timer = setTimeout(() => { fetchItems(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  const filteredItems = items.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.code.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || item.type === filterType;
    return matchSearch && matchType;
  });

  const handleAddNew = () => {
    setCurrentItem(null);
    setFormData({ type: 'product', code: '', barcode: '', name: '', unit: 'm2', price_in: 0, price_out: 0, price_floor: 0, min_stock: 0, max_stock: 0, spec_thickness: '', spec_width: '', spec_length: '', weight: '', location: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (item) => {
    setCurrentItem(item);
    setFormData({
      type: item.type, code: item.code, barcode: item.barcode || '', name: item.name, unit: item.unit,
      price_in: item.price_in || 0, price_out: item.price_out || 0, price_floor: item.price_floor || 0, 
      min_stock: item.min_stock || 0, max_stock: item.max_stock || 0,
      spec_thickness: item.spec_thickness || '', spec_width: item.spec_width || '', spec_length: item.spec_length || '', 
      weight: item.weight || '', location: item.location || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData, 
        price_in: Number(formData.price_in), price_out: Number(formData.price_out), price_floor: Number(formData.price_floor),
        min_stock: Number(formData.min_stock), max_stock: Number(formData.max_stock),
        spec_thickness: formData.spec_thickness ? Number(formData.spec_thickness) : null,
        spec_width: formData.spec_width ? Number(formData.spec_width) : null,
        spec_length: formData.spec_length ? Number(formData.spec_length) : null,
        weight: formData.weight ? Number(formData.weight) : null,
      };
      if (currentItem) await api.patch(`/items/${currentItem.id}`, payload);
      else await api.post('/items', payload);
      setIsModalOpen(false);
      fetchItems();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Ngừng kinh doanh mặt hàng này?')) return;
    try {
      await api.delete(`/items/${id}`);
      fetchItems();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const columns = [
    { header: 'Mã hàng', accessor: 'code', render: (r) => <span className="font-bold text-slate-700">{r.code}</span> },
    { header: 'Tên hàng hóa', accessor: 'name', render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    { header: 'Phân loại', accessor: 'type', render: (r) => (<span className={`px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${r.type === 'product' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{r.type === 'product' ? 'Thành phẩm' : 'Vật tư'}</span>)},
    { header: 'ĐVT', accessor: 'unit' },
    { header: 'Giá nhập', accessor: 'price_in', render: (r) => r.price_in > 0 ? `${Number(r.price_in).toLocaleString()} đ` : '-' },
    { header: 'Giá bán', accessor: 'price_out', render: (r) => r.price_out > 0 ? <span className="text-emerald-600 font-semibold whitespace-nowrap">{Number(r.price_out).toLocaleString()} đ</span> : '-' },
    { header: 'Thao tác', accessor: 'id', render: (r) => (
      <div className="flex gap-2">
        <button onClick={() => handleEdit(r)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded"><Edit2 size={16} /></button>
        <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16} /></button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      {/* HEADER: Mobile xếp dọc */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý Hàng hóa</h1>
        <button 
          onClick={handleAddNew} 
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm w-full sm:w-auto shrink-0"
        >
          <Plus size={18} /> Thêm hàng hóa
        </button>
      </div>

      {/* BỘ LỌC & TÌM KIẾM: Mobile rớt dòng */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
          <button onClick={() => setFilterType('all')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filterType === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Tất cả</button>
          <button onClick={() => setFilterType('product')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filterType === 'product' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Thành phẩm</button>
          <button onClick={() => setFilterType('material')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filterType === 'material' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Vật tư</button>
        </div>
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input type="text" placeholder="Tìm theo tên hoặc mã..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <DataTable columns={columns} data={filteredItems} loading={loading} />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {/* Modal: Mobile full width trừ lề, Desktop 800px. Có thanh cuộn dọc */}
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-4 sm:px-6 py-4 border-b flex justify-between items-center shrink-0 sticky top-0 z-10">
              <h3 className="font-bold text-lg text-slate-800">{currentItem ? 'Sửa hàng hóa' : 'Thêm hàng hóa mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 p-1"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto flex-1">
              {/* Form Grid: Mobile 1 cột, Tablet 2 cột, Desktop 4 cột */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phân loại *</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="product">Thành phẩm</option>
                    <option value="material">Vật tư</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mã hàng *</label>
                  <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Tên hàng hóa *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Đơn vị tính *</label>
                  <input required type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="m2, kg..." />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mã vạch (Barcode)</label>
                  <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Vị trí lưu kho</label>
                  <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="VD: Kệ A1, Kho B..." />
                </div>

                <div className="sm:col-span-2 md:col-span-4 border-t my-2 pt-4"></div>

                <div>
                  <label className="block text-sm font-medium mb-1">Giá nhập (VNĐ)</label>
                  <input type="number" min="0" step="1000" value={formData.price_in} onChange={e => setFormData({...formData, price_in: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-emerald-600 mb-1">Giá bán (VNĐ)</label>
                  <input type="number" min="0" step="1000" value={formData.price_out} onChange={e => setFormData({...formData, price_out: e.target.value})} className="w-full px-3 py-2 border-2 border-emerald-200 rounded-lg font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-red-600 mb-1">Giá sàn (VNĐ)</label>
                  <input type="number" min="0" step="1000" value={formData.price_floor} onChange={e => setFormData({...formData, price_floor: e.target.value})} className="w-full px-3 py-2 border-2 border-red-200 rounded-lg font-bold text-red-600 focus:ring-2 focus:ring-red-500" />
                </div>
                <div className="hidden md:block"></div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tồn kho tối thiểu</label>
                  <input type="number" min="0" step="0.1" value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tồn kho tối đa</label>
                  <input type="number" min="0" step="0.1" value={formData.max_stock} onChange={e => setFormData({...formData, max_stock: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Trọng lượng (kg)</label>
                  <input type="number" min="0" step="0.001" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Nút bấm: Mobile xếp dọc */}
              <div className="pt-6 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg w-full sm:w-auto">Hủy</button>
                <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md font-bold w-full sm:w-auto">Lưu toàn bộ hồ sơ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}