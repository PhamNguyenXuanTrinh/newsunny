import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { Plus, X, Receipt, TrendingDown, Wallet, Banknote, Landmark, Search, RefreshCw, CalendarDays, Loader2, Save, Activity } from 'lucide-react';
import DataTable from '../components/DataTable';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const EMPTY_FORM = { date: today(), category: 'Điện nước', amount: '', payment_method: 'transfer', invoice_no: '', description: '', source: 'Hóa đơn' };

export default function Costs() {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const fetchCosts = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await api.get('/costs');
      setCosts(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Fetch costs error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      api.get('/costs').then(res => {
        if (active) setCosts(Array.isArray(res.data?.data) ? res.data.data : []);
      }).catch(console.error).finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, []);

  const stats = useMemo(() => {
    const total = costs.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const cash = costs.filter(x => x.payment_method === 'cash').reduce((s,x) => s + (Number(x.amount)||0), 0);
    const transfer = costs.filter(x => x.payment_method === 'transfer').reduce((s,x) => s + (Number(x.amount)||0), 0);
    return { total, cash, transfer, count: costs.length };
  }, [costs]);

  const filteredCosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return costs;
    return costs.filter(x => [x.category,x.description,x.invoice_no,x.source].some(v => String(v||'').toLowerCase().includes(q)));
  }, [costs, search]);

  const money = n => (Number(n)||0).toLocaleString('vi-VN');

  const openAdd = () => {
    setFormData({ ...EMPTY_FORM, date: today() });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
  };

  const handleSave = async e => {
    e.preventDefault();
    if (saving) return;
    if (Number(formData.amount) <= 0) return alert('Số tiền phải lớn hơn 0.');
    setSaving(true);
    try {
      await api.post('/costs', { ...formData, amount: Number(formData.amount) });
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      await fetchCosts();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { header:'Ngày chi', accessor:'date', render:r => <span className="flex items-center gap-1.5 whitespace-nowrap text-slate-600"><CalendarDays size={14} className="text-slate-400"/>{r.date ? new Date(r.date).toLocaleDateString('vi-VN') : '-'}</span> },
    { header:'Hạng mục', accessor:'category', render:r => <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">{r.category}</span> },
    { header:'Số tiền', accessor:'amount', render:r => <span className="whitespace-nowrap font-bold text-red-600">- {money(r.amount)} đ</span> },
    { header:'Mô tả', accessor:'description', render:r => <span className="text-slate-600">{r.description || '-'}</span> },
    { header:'Hình thức', accessor:'payment_method', render:r => r.payment_method === 'cash' ? <span className="text-emerald-600 font-semibold">Tiền mặt</span> : <span className="text-blue-600 font-semibold">Chuyển khoản</span> },
    { header:'Số hóa đơn', accessor:'invoice_no', render:r => r.invoice_no || '-' },
    { header:'Nguồn', accessor:'source', render:r => r.source || '-' }
  ];

  const cards = [
    { label:'Tổng chi phí', value:`${money(stats.total)} đ`, icon:TrendingDown, color:'bg-red-50 text-red-600' },
    { label:'Tiền mặt', value:`${money(stats.cash)} đ`, icon:Banknote, color:'bg-emerald-50 text-emerald-600' },
    { label:'Chuyển khoản', value:`${money(stats.transfer)} đ`, icon:Landmark, color:'bg-blue-50 text-blue-600' },
    { label:'Số khoản chi', value:stats.count, icon:Receipt, color:'bg-violet-50 text-violet-600' }
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] animate-[pageIn_.4s_ease-out]">
      <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-blue-600"><Activity size={13}/> Tài chính doanh nghiệp</div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">Quản lý Chi phí</h1>
          <p className="mt-1 text-xs text-slate-500">Theo dõi và quản lý các khoản chi của doanh nghiệp.</p>
        </div>
        <button onClick={openAdd} className="group flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:shadow-xl"><Plus size={17} className="transition group-hover:rotate-90"/> Thêm chi phí</button>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c,i) => {
          const Icon = c.icon;
          return <div key={c.label} style={{animationDelay:`${i*60}ms`}} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm animate-[cardIn_.4s_ease-out_both] transition duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.color}`}><Icon size={20}/></div><div className="min-w-0"><p className="text-[10px] font-semibold text-slate-400">{c.label}</p><p className="mt-0.5 truncate text-lg font-black text-slate-900">{c.value}</p></div></div>
          </div>;
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div><h2 className="text-sm font-bold text-slate-900">Danh sách chi phí</h2><p className="mt-0.5 text-[10px] text-slate-400">Hiển thị {filteredCosts.length} / {costs.length} khoản chi</p></div>
          <div className="flex gap-2">
            <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm hạng mục, hóa đơn..." className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[11px] outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:w-60"/></div>
            <button onClick={()=>fetchCosts(true)} disabled={refreshing} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[11px] font-semibold text-slate-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"><RefreshCw size={14} className={refreshing?'animate-spin':''}/> <span className="hidden sm:inline">Làm mới</span></button>
          </div>
        </div>
        <div className="p-2"><DataTable columns={columns} data={filteredCosts} loading={loading}/></div>
      </section>

      {isModalOpen && <div onMouseDown={e=>e.target===e.currentTarget&&closeModal()} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm animate-[overlayIn_.2s_ease-out]">
        <div className="w-full max-w-[600px] overflow-hidden rounded-3xl bg-white shadow-2xl animate-[modalIn_.25s_ease-out]">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600"><Receipt size={19}/></div><div><h3 className="text-[15px] font-bold text-slate-900">Ghi nhận chi phí mới</h3><p className="text-[10px] text-slate-400">Nhập thông tin khoản chi thực tế</p></div></div>
            <button type="button" onClick={closeModal} className="p-2 text-slate-400 hover:text-red-500"><X size={18}/></button>
          </div>

          <form onSubmit={handleSave} className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ngày chi *"><input required type="date" value={formData.date} onChange={e=>setFormData({...formData,date:e.target.value})} className="cost-input"/></Field>
              <Field label="Hạng mục *"><select required value={formData.category} onChange={e=>setFormData({...formData,category:e.target.value})} className="cost-input"><option>Điện nước</option><option value="Lương">Lương nhân viên</option><option>Vận tải</option><option value="Vật tư">Mua vật tư</option><option>Bảo trì</option><option>Khác</option></select></Field>
              <Field label="Hình thức"><select value={formData.payment_method} onChange={e=>setFormData({...formData,payment_method:e.target.value})} className="cost-input"><option value="transfer">Chuyển khoản</option><option value="cash">Tiền mặt</option></select></Field>
              <Field label="Số hóa đơn"><input value={formData.invoice_no} onChange={e=>setFormData({...formData,invoice_no:e.target.value})} className="cost-input" placeholder="VD: HD000123"/></Field>
            </div>

            <Field label="Số tiền (VNĐ) *"><div className="relative"><Wallet size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"/><input required type="number" min="1" step="1000" value={formData.amount} onChange={e=>setFormData({...formData,amount:e.target.value})} className="cost-input pl-10 font-bold text-blue-600" placeholder="Nhập số tiền"/></div></Field>
            <Field label="Mô tả chi tiết *"><input required value={formData.description} onChange={e=>setFormData({...formData,description:e.target.value})} className="cost-input" placeholder="Nội dung khoản chi..."/></Field>
            <Field label="Nguồn / Chứng từ"><input value={formData.source} onChange={e=>setFormData({...formData,source:e.target.value})} className="cost-input" placeholder="Hóa đơn, phiếu chi..."/></Field>

            <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-4 sm:flex-row">
              <button type="button" onClick={closeModal} disabled={saving} className="h-10 rounded-xl px-4 text-xs font-semibold text-slate-500 hover:bg-slate-100">Hủy</button>
              <button type="submit" disabled={saving} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-xs font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 disabled:opacity-50">{saving?<Loader2 size={15} className="animate-spin"/>:<Save size={15}/>} {saving?'Đang lưu...':'Lưu chi phí'}</button>
            </div>
          </form>
        </div>
      </div>}

      <style>{`
        @keyframes pageIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes cardIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes overlayIn{from{opacity:0}to{opacity:1}}
        @keyframes modalIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
        .cost-input{width:100%;height:42px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:0 12px;font-size:12px;color:#334155;outline:none;transition:.2s}
        .cost-input:focus{border-color:#93c5fd;background:#fff;box-shadow:0 0 0 3px #dbeafe}
      `}</style>
    </div>
  );
}

function Field({label,children}) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}</span>{children}</label>;
}