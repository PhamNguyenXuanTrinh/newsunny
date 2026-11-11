import { useEffect, useState } from 'react';
import api from '../api';
import { Search, Plus, Edit2, X, Trash2 } from 'lucide-react';
import DataTable from '../components/DataTable';

export default function Partners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPartner, setCurrentPartner] = useState(null);
  const [formData, setFormData] = useState({
    type: 'customer', code: '', name: '', company_name: '', contact_person: '', 
    phone: '', email: '', tax_code: '', address: '', category: 'Khách lẻ', 
    bank_account: '', bank_name: '', credit_limit: 0, payment_term: 0
  });

  const fetchPartners = () => {
    setLoading(true);
    api.get('/partners')
      .then(res => setPartners(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Bọc setTimeout để tránh cảnh báo setState đồng bộ trong React 18
    const timer = setTimeout(() => { fetchPartners(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  const filteredPartners = partners.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || p.type === filterType;
    return matchSearch && matchType;
  });

  const handleAddNew = () => {
    setCurrentPartner(null);
    setFormData({
      type: 'customer', code: '', name: '', company_name: '', contact_person: '', 
      phone: '', email: '', tax_code: '', address: '', category: 'Khách lẻ', 
      bank_account: '', bank_name: '', credit_limit: 0, payment_term: 0
    });
    setIsModalOpen(true);
  };

  const handleEdit = (partner) => {
    setCurrentPartner(partner);
    setFormData({
      type: partner.type, code: partner.code, name: partner.name, company_name: partner.company_name || '', 
      contact_person: partner.contact_person || '', phone: partner.phone || '', email: partner.email || '', 
      tax_code: partner.tax_code || '', address: partner.address || '', category: partner.category || 'Khách lẻ', 
      bank_account: partner.bank_account || '', bank_name: partner.bank_name || '', 
      credit_limit: partner.credit_limit || 0, payment_term: partner.payment_term || 0
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, credit_limit: Number(formData.credit_limit), payment_term: Number(formData.payment_term) };
      if (currentPartner) await api.patch(`/partners/${currentPartner.id}`, payload);
      else await api.post('/partners', payload);
      setIsModalOpen(false);
      fetchPartners();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn khóa đối tác này?')) return;
    try {
      await api.delete(`/partners/${id}`);
      fetchPartners();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const columns = [
    { header: 'Mã', accessor: 'code', render: (r) => <span className="font-bold text-slate-700 whitespace-nowrap">{r.code}</span> },
    { header: 'Tên đối tác', accessor: 'name', render: (r) => <span className="font-medium text-slate-800 min-w-[150px] block">{r.name}</span> },
    { header: 'Loại', accessor: 'type', render: (r) => (<span className={`px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${r.type === 'customer' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.type === 'customer' ? 'Khách hàng' : 'Nhà cung cấp'}</span>)},
    { header: 'Điện thoại', accessor: 'phone', render: (r) => <span className="whitespace-nowrap">{r.phone || '-'}</span> },
    { header: 'Hạn mức nợ', accessor: 'credit_limit', render: (r) => <span className="whitespace-nowrap">{r.credit_limit ? `${Number(r.credit_limit).toLocaleString()} đ` : 'Không có'}</span> },
    { header: 'Thao tác', accessor: 'id', render: (r) => (
      <div className="flex gap-2">
        <button onClick={() => handleEdit(r)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="Sửa"><Edit2 size={16} /></button>
        <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded" title="Khóa"><Trash2 size={16} /></button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      {/* HEADER: Mobile xếp dọc */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý Đối tác</h1>
        <button 
          onClick={handleAddNew} 
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm w-full sm:w-auto shrink-0"
        >
          <Plus size={18} /> Thêm đối tác
        </button>
      </div>

      {/* BỘ LỌC & TÌM KIẾM: Mobile rớt dòng */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
          <button onClick={() => setFilterType('all')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filterType === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Tất cả</button>
          <button onClick={() => setFilterType('customer')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filterType === 'customer' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Khách hàng</button>
          <button onClick={() => setFilterType('supplier')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filterType === 'supplier' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Nhà cung cấp</button>
        </div>
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input type="text" placeholder="Tìm theo tên hoặc mã..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <DataTable columns={columns} data={filteredPartners} loading={loading} />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {/* Modal: Mobile full width, Desktop 800px */}
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-4 sm:px-6 py-4 border-b flex justify-between items-center shrink-0 sticky top-0 z-10">
              <h3 className="font-bold text-lg text-slate-800">{currentPartner ? 'Sửa đối tác' : 'Thêm đối tác mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 p-1"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto flex-1">
              {/* Form Grid: 1 cột Mobile, 2 cột Tablet, 3 cột Desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Phân loại *</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="customer">Khách hàng</option>
                    <option value="supplier">Nhà cung cấp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mã đối tác *</label>
                  <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nhóm đối tác</label>
                  <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="VD: Khách lẻ, Đại lý..." />
                </div>
                
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-sm font-medium mb-1">Tên đối tác *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                
                <div className="sm:col-span-2 md:col-span-3">
                  <label className="block text-sm font-medium mb-1">Tên công ty (Xuất hóa đơn)</label>
                  <input type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Người liên hệ</label>
                  <input type="text" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Mã số thuế</label>
                  <input type="text" value={formData.tax_code} onChange={e => setFormData({...formData, tax_code: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Số tài khoản NH</label>
                  <input type="text" value={formData.bank_account} onChange={e => setFormData({...formData, bank_account: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tên Ngân hàng</label>
                  <input type="text" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="hidden md:block"></div>

                <div className="sm:col-span-2 md:col-span-3 border-t my-2 pt-4"></div>

                <div>
                  <label className="block text-sm font-medium text-blue-600 mb-1">Hạn mức công nợ (VNĐ)</label>
                  <input type="number" min="0" step="1000000" value={formData.credit_limit} onChange={e => setFormData({...formData, credit_limit: e.target.value})} className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg font-bold text-blue-600 focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-600 mb-1">Số ngày được nợ</label>
                  <input type="number" min="0" value={formData.payment_term} onChange={e => setFormData({...formData, payment_term: e.target.value})} className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg font-bold text-blue-600 focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Nút bấm: Mobile xếp dọc */}
              <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg w-full sm:w-auto">Hủy</button>
                <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md font-bold w-full sm:w-auto">Lưu hồ sơ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}