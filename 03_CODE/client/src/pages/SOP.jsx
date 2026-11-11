import { useEffect, useState } from 'react';
import api from '../api';
import { Plus, X, BookOpen, Search, CheckCircle, Tag } from 'lucide-react';
import DataTable from '../components/DataTable';

export default function SOP() {
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // State Modal Thêm quy trình
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '', title: '', steps: '', owner: '', tags: ''
  });

  const fetchSOPs = () => {
    setLoading(true);
    api.get('/sop')
      .then(res => setSops(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => { fetchSOPs(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/sop', formData);
      setIsModalOpen(false);
      fetchSOPs();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  // Lọc theo thanh tìm kiếm
  const filteredSOPs = sops.filter(sop => 
    sop.title.toLowerCase().includes(search.toLowerCase()) || 
    sop.code.toLowerCase().includes(search.toLowerCase()) ||
    (sop.tags && sop.tags.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    { header: 'Mã quy trình', accessor: 'code', render: (r) => <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{r.code}</span> },
    { header: 'Tiêu đề quy trình', accessor: 'title', render: (r) => (
      <div>
        <p className="font-bold text-slate-800">{r.title}</p>
        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{r.steps}</p>
      </div>
    )},
    { header: 'Người/Bộ phận phụ trách', accessor: 'owner', render: (r) => r.owner || '-' },
    { header: 'Thẻ (Tags)', accessor: 'tags', render: (r) => (
      <div className="flex gap-1 flex-wrap">
        {r.tags ? r.tags.split(',').map((tag, idx) => (
          <span key={idx} className="flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            <Tag size={10} /> {tag.trim()}
          </span>
        )) : '-'}
      </div>
    )},
    { header: 'Trạng thái', accessor: 'approved', render: (r) => (
      r.approved 
        ? <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle size={14}/> Đã duyệt</span>
        : <span className="text-amber-600 text-xs font-bold">Chờ duyệt</span>
    )}
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="text-blue-600" /> Thư viện Quy trình (SOP)
          </h1>
          <p className="text-slate-500 text-sm mt-1">Tài liệu hướng dẫn vận hành dành cho nhân viên và Trợ lý AI.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input type="text" placeholder="Tìm mã, tên, tag..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
          </div>
          <button onClick={() => { setFormData({ code: '', title: '', steps: '', owner: '', tags: '' }); setIsModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm whitespace-nowrap">
            <Plus size={18} /> Thêm quy trình
          </button>
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <DataTable columns={columns} data={filteredSOPs} loading={loading} />

      {/* Modal Thêm Quy trình */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-[600px] overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Thêm Quy trình mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Mã quy trình *</label>
                  <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="VD: SOP-QC-01" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Bộ phận phụ trách</label>
                  <input type="text" value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="VD: Tổ QC, Kho..." />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Tiêu đề quy trình *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="VD: Quy trình kiểm tra chất lượng thảm 10mm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Nội dung các bước *</label>
                <textarea required rows="5" value={formData.steps} onChange={e => setFormData({...formData, steps: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Bước 1: ...&#10;Bước 2: ...&#10;Bước 3: ..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Thẻ tìm kiếm (Tags)</label>
                <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="VD: qc, tham-10mm, kiem-tra (Cách nhau bởi dấu phẩy)" />
                <p className="text-xs text-slate-500 mt-1">Mẹo: Thêm tags để AI dễ dàng tìm thấy quy trình này khi nhân viên đặt câu hỏi.</p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md">Lưu quy trình</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}