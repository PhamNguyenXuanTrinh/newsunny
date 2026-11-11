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
    { header: 'Mã', accessor: 'code', render: (r) => <span className="font-bold text-slate-700">{r.code}</span> },
    { header: 'Tên đối tác', accessor: 'name', render: (r) => <span className="font-medium text-slate-800">{r.name}</span> },
    { header: 'Loại', accessor: 'type', render: (r) => (<span className={`px-2 py-1 rounded-md text-xs font-semibold ${r.type === 'customer' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.type === 'customer' ? 'Khách hàng' : 'Nhà cung cấp'}</span>)},
    { header: 'Điện thoại', accessor: 'phone', render: (r) => r.phone || '-' },
    { header: 'Hạn mức nợ', accessor: 'credit_limit', render: (r) => r.credit_limit ? `${Number(r.credit_limit).toLocaleString()} đ` : 'Không có' },
    { header: 'Thao tác', accessor: 'id', render: (r) => (
      <div className="flex gap-2">
        <button onClick={() => handleEdit(r)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="Sửa"><Edit2 size={16} /></button>
        <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded" title="Khóa"><Trash2 size={16} /></button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Quản lý Đối tác</h1>
        <button onClick={handleAddNew} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"><Plus size={18} /> Thêm đối tác</button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setFilterType('all')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filterType === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Tất cả</button>
          <button onClick={() => setFilterType('customer')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filterType === 'customer' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Khách hàng</button>
          <button onClick={() => setFilterType('supplier')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filterType === 'supplier' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Nhà cung cấp</button>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input type="text" placeholder="Tìm theo tên hoặc mã..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <DataTable columns={columns} data={filteredPartners} loading={loading} />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-slate-800">{currentPartner ? 'Sửa đối tác' : 'Thêm đối tác mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div><label className="block text-sm font-medium mb-1">Phân loại *</label><select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="customer">Khách hàng</option><option value="supplier">Nhà cung cấp</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Mã đối tác *</label><input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Nhóm đối tác</label><input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="VD: Khách lẻ, Đại lý..." /></div>
                <div className="col-span-3"><label className="block text-sm font-medium mb-1">Tên đối tác *</label><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div className="col-span-3"><label className="block text-sm font-medium mb-1">Tên công ty (Xuất hóa đơn)</label><input type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Người liên hệ</label><input type="text" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Số điện thoại</label><input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Địa chỉ</label><input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Mã số thuế</label><input type="text" value={formData.tax_code} onChange={e => setFormData({...formData, tax_code: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Số tài khoản NH</label><input type="text" value={formData.bank_account} onChange={e => setFormData({...formData, bank_account: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Tên Ngân hàng</label><input type="text" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div className="col-span-3 border-t my-2 pt-4"></div>
                <div><label className="block text-sm font-medium text-blue-600 mb-1">Hạn mức công nợ (VNĐ)</label><input type="number" min="0" step="1000000" value={formData.credit_limit} onChange={e => setFormData({...formData, credit_limit: e.target.value})} className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg font-bold text-blue-600" /></div>
                <div><label className="block text-sm font-medium text-blue-600 mb-1">Số ngày được nợ</label><input type="number" min="0" value={formData.payment_term} onChange={e => setFormData({...formData, payment_term: e.target.value})} className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg font-bold text-blue-600" /></div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md font-bold">Lưu toàn bộ hồ sơ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
