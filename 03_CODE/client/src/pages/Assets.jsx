import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { Plus, Edit3, X, Wrench, AlertTriangle, CheckCircle2, PackageOpen, Wallet, Activity, Search, RefreshCw, CalendarDays, Building2, Save, Loader2 } from 'lucide-react';
import DataTable from '../components/DataTable';

const EMPTY_FORM = { name: '', brand: '', purchase_date: '', price: '', status: 'active' };

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAsset, setCurrentAsset] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const fetchAssets = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await api.get('/assets');
      setAssets(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      api.get('/assets').then(res => {
        if (active) setAssets(Array.isArray(res.data?.data) ? res.data.data : []);
      }).catch(console.error).finally(() => {
        if (active) setLoading(false);
      });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, []);

  const stats = useMemo(() => ({
    total: assets.length,
    active: assets.filter(a => a.status === 'active').length,
    maintenance: assets.filter(a => a.status === 'maintenance').length,
    broken: assets.filter(a => a.status === 'broken').length,
    value: assets.reduce((sum, a) => sum + (Number(a.price) || 0), 0)
  }), [assets]);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(a => String(a.code || '').toLowerCase().includes(q) || String(a.name || '').toLowerCase().includes(q) || String(a.brand || '').toLowerCase().includes(q));
  }, [assets, search]);

  const formatMoney = value => (Number(value) || 0).toLocaleString('vi-VN');

  const handleAddNew = () => {
    setCurrentAsset(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleEdit = asset => {
    setCurrentAsset(asset);
    setFormData({
      name: asset.name || '',
      brand: asset.brand || '',
      purchase_date: asset.purchase_date ? String(asset.purchase_date).slice(0, 10) : '',
      price: asset.price ?? '',
      status: asset.status || 'active'
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setCurrentAsset(null);
  };

  const handleSave = async e => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = { name: formData.name.trim(), brand: formData.brand.trim(), purchase_date: formData.purchase_date || null, price: Number(formData.price) || 0, status: formData.status };
      if (currentAsset) await api.patch(`/assets/${currentAsset.id}`, payload);
      else await api.post('/assets', payload); // Không gửi code -> backend tự sinh TSxxx
      setIsModalOpen(false);
      setCurrentAsset(null);
      setFormData(EMPTY_FORM);
      await fetchAssets();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { header: 'Mã TS', accessor: 'code', render: r => <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-700">{r.code}</span> },
    { header: 'Tên thiết bị', accessor: 'name', render: r => <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Wrench size={16}/></div><div><p className="font-semibold text-slate-800">{r.name}</p><p className="text-[10px] text-slate-400">{r.brand || 'Chưa có hãng'}</p></div></div> },
    { header: 'Hãng SX', accessor: 'brand', render: r => r.brand || '-' },
    { header: 'Ngày mua', accessor: 'purchase_date', render: r => <span className="flex items-center gap-1.5 whitespace-nowrap"><CalendarDays size={14} className="text-slate-400"/>{r.purchase_date ? new Date(r.purchase_date).toLocaleDateString('vi-VN') : '-'}</span> },
    { header: 'Nguyên giá', accessor: 'price', render: r => <span className="font-bold text-slate-800">{formatMoney(r.price)} <small className="text-slate-400">đ</small></span> },
    { header: 'Trạng thái', accessor: 'status', render: r => r.status === 'broken' ? <Badge color="red" icon={<AlertTriangle size={12}/>} text="Đang hỏng"/> : r.status === 'maintenance' ? <Badge color="amber" icon={<Wrench size={12}/>} text="Bảo trì"/> : <Badge color="emerald" icon={<CheckCircle2 size={12}/>} text="Hoạt động"/> },
    { header: '', accessor: 'id', render: r => <button onClick={() => handleEdit(r)} className="p-2 text-slate-400 hover:text-blue-600"><Edit3 size={16}/></button> }
  ];

  const cards = [
    ['Tổng tài sản', stats.total, PackageOpen, 'bg-blue-50 text-blue-600'],
    ['Đang hoạt động', stats.active, CheckCircle2, 'bg-emerald-50 text-emerald-600'],
    ['Đang bảo trì', stats.maintenance, Wrench, 'bg-amber-50 text-amber-600'],
    ['Đang hỏng', stats.broken, AlertTriangle, 'bg-red-50 text-red-600']
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] animate-[pageIn_.4s_ease-out]">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-600"><Activity size={13}/> Quản lý vận hành</div>
          <h1 className="text-2xl font-black text-slate-900">Tài sản & Máy móc</h1>
          <p className="mt-1 text-xs text-slate-500">Quản lý thiết bị, nguyên giá và trạng thái vận hành.</p>
        </div>
        <button onClick={handleAddNew} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5"><Plus size={17}/> Thêm tài sản</button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map(([label, value, Icon, color], i) => (
          <div key={label} style={{animationDelay:`${i*60}ms`}} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm animate-[cardIn_.4s_ease-out_both] transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-center gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}><Icon size={20}/></div><div><p className="text-[10px] font-semibold text-slate-400">{label}</p><p className="text-2xl font-black text-slate-900">{value}</p></div></div>
          </div>
        ))}
      </div>

      <div className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Wallet size={20}/></div><div><p className="text-[10px] font-semibold uppercase text-slate-400">Tổng nguyên giá</p><p className="text-xl font-black text-slate-900">{formatMoney(stats.value)} <small className="text-slate-400">VNĐ</small></p></div></div>
        <div className="hidden items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[10px] text-slate-500 sm:flex"><Building2 size={14}/>{stats.total} tài sản</div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b p-4 sm:flex-row sm:items-center">
          <div><h2 className="text-sm font-bold text-slate-900">Danh sách tài sản</h2><p className="text-[10px] text-slate-400">{filteredAssets.length} / {assets.length} tài sản</p></div>
          <div className="flex gap-2">
            <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã, tên, hãng..." className="h-9 w-full rounded-xl border bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-blue-400 sm:w-60"/></div>
            <button onClick={() => fetchAssets(true)} className="flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold text-slate-500 hover:bg-blue-50 hover:text-blue-600"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''}/> Làm mới</button>
          </div>
        </div>
        <div className="p-2"><DataTable columns={columns} data={filteredAssets} loading={loading}/></div>
      </div>

      {isModalOpen && (
        <div onMouseDown={e => e.target === e.currentTarget && closeModal()} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-3xl bg-white shadow-2xl animate-[modalIn_.25s_ease-out]">
            <div className="flex items-center justify-between border-b p-5">
              <div><h3 className="font-bold text-slate-900">{currentAsset ? 'Cập nhật tài sản' : 'Thêm tài sản mới'}</h3><p className="mt-1 text-[10px] text-slate-400">{currentAsset ? `Mã ${currentAsset.code} · Mã không thể chỉnh sửa` : 'Mã tài sản sẽ được hệ thống tự động tạo'}</p></div>
              <button onClick={closeModal} className="p-2 text-slate-400 hover:text-red-500"><X size={18}/></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 p-5">
              <Field label="Tên thiết bị *"><input required value={formData.name} onChange={e => setFormData({...formData,name:e.target.value})} className="asset-input" placeholder="VD: Máy dệt vòng tròn"/></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Hãng sản xuất"><input value={formData.brand} onChange={e => setFormData({...formData,brand:e.target.value})} className="asset-input" placeholder="VD: Samsung"/></Field>
                <Field label="Ngày mua"><input type="date" value={formData.purchase_date} onChange={e => setFormData({...formData,purchase_date:e.target.value})} className="asset-input"/></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nguyên giá (VNĐ) *"><input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData,price:e.target.value})} className="asset-input font-bold text-blue-600"/></Field>
                <Field label="Trạng thái"><select value={formData.status} onChange={e => setFormData({...formData,status:e.target.value})} className="asset-input"><option value="active">Đang hoạt động</option><option value="maintenance">Đang bảo trì</option><option value="broken">Đang hỏng</option></select></Field>
              </div>

              {!currentAsset && <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[11px] text-blue-700">Mã tài sản sẽ tự sinh khi lưu, ví dụ <b>TS008</b>, <b>TS009</b>...</div>}

              <div className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={closeModal} className="h-10 rounded-xl px-4 text-xs font-semibold text-slate-500 hover:bg-slate-100">Hủy</button>
                <button disabled={saving} className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-xs font-bold text-white shadow-lg disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>} {saving ? 'Đang lưu...' : currentAsset ? 'Lưu thay đổi' : 'Thêm tài sản'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pageIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes cardIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes modalIn{from{opacity:0;transform:translateY(15px) scale(.97)}to{opacity:1;transform:none}}
        .asset-input{width:100%;height:42px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:0 12px;font-size:12px;outline:none;transition:.2s}
        .asset-input:focus{background:white;border-color:#93c5fd;box-shadow:0 0 0 3px #dbeafe}
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}</span>{children}</label>;
}

function Badge({ color, icon, text }) {
  const styles = { red:'bg-red-50 text-red-600 border-red-100', amber:'bg-amber-50 text-amber-600 border-amber-100', emerald:'bg-emerald-50 text-emerald-600 border-emerald-100' };
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold ${styles[color]}`}>{icon}{text}</span>;
}