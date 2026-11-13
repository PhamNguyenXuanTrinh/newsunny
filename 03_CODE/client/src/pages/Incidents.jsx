import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { Plus, X, AlertTriangle, CheckCircle2, XCircle, FileText, Search, RefreshCw, Loader2, Save, ShieldAlert, Clock3, Activity, Edit2, Trash2 } from 'lucide-react';
import DataTable from '../components/DataTable';

const EMPTY_FORM = { user_id:'', violation_codes:'VP001', evidence:'' };

export default function Incidents() {
  const [incidents,setIncidents] = useState([]);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [saving,setSaving] = useState(false);
  const [deletingId,setDeletingId] = useState(null);
  const [isModalOpen,setIsModalOpen] = useState(false);
  const [isExplainOpen,setIsExplainOpen] = useState(false);
  const [selectedIncident,setSelectedIncident] = useState(null);
  const [currentIncident,setCurrentIncident] = useState(null);
  const [formData,setFormData] = useState(EMPTY_FORM);
  const [explanation,setExplanation] = useState('');
  const [search,setSearch] = useState('');

  const fetchIncidents = async (manual=false) => {
    if(manual)setRefreshing(true);
    try{
      const res=await api.get('/incidents');
      setIncidents(Array.isArray(res.data?.data)?res.data.data:[]);
    }catch(err){console.error('Fetch incidents error:',err);}
    finally{setLoading(false);setRefreshing(false);}
  };

  useEffect(()=>{
    let active=true;
    const timer=setTimeout(()=>{
      api.get('/incidents').then(res=>{if(active)setIncidents(Array.isArray(res.data?.data)?res.data.data:[]);}).catch(console.error).finally(()=>{if(active)setLoading(false);});
    },0);
    return()=>{active=false;clearTimeout(timer);};
  },[]);

  const stats=useMemo(()=>({
    total:incidents.length,
    pending:incidents.filter(x=>x.status==='pending_explanation').length,
    explained:incidents.filter(x=>x.status==='explained').length,
    approved:incidents.filter(x=>x.status==='approved').length,
    rejected:incidents.filter(x=>x.status==='rejected').length
  }),[incidents]);

  const filteredIncidents=useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q)return incidents;
    return incidents.filter(x=>[x.code,x.user_name,x.username,x.violation_codes,x.status,x.evidence].some(v=>String(v||'').toLowerCase().includes(q)));
  },[incidents,search]);

  const parseCodes=value=>{
    if(Array.isArray(value))return value.join(', ');
    try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.join(', '):String(parsed);}
    catch{return value||'-';}
  };

  const firstCode=value=>{
    if(Array.isArray(value))return value[0]||'VP001';
    try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed[0]||'VP001':String(parsed||'VP001');}
    catch{return value||'VP001';}
  };

  const openCreate=()=>{
    setCurrentIncident(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit=incident=>{
    setCurrentIncident(incident);
    setFormData({ user_id:String(incident.user_id||''), violation_codes:firstCode(incident.violation_codes), evidence:incident.evidence||'' });
    setIsModalOpen(true);
  };

  const closeForm=()=>{
    if(saving)return;
    setIsModalOpen(false);
    setCurrentIncident(null);
    setFormData(EMPTY_FORM);
  };

  const openExplain=incident=>{
    setSelectedIncident(incident);
    setExplanation('');
    setIsExplainOpen(true);
  };

  const closeExplain=()=>{
    if(saving)return;
    setIsExplainOpen(false);
    setSelectedIncident(null);
    setExplanation('');
  };

  const handleSave=async e=>{
    e.preventDefault();
    if(saving)return;
    if(!formData.user_id||Number(formData.user_id)<=0)return alert('Vui lòng nhập ID nhân viên hợp lệ.');
    setSaving(true);
    try{
      const payload={ user_id:Number(formData.user_id), violation_codes:[formData.violation_codes], evidence:formData.evidence.trim() };
      if(currentIncident)await api.patch(`/incidents/${currentIncident.id}`,payload);
      else await api.post('/incidents',payload);
      setIsModalOpen(false);
      setCurrentIncident(null);
      setFormData(EMPTY_FORM);
      await fetchIncidents();
    }catch(err){alert('Lỗi: '+(err.response?.data?.error||err.message));}
    finally{setSaving(false);}
  };

  const handleDelete=async incident=>{
    if(!window.confirm(`Xóa phiếu ${incident.code}?\n\nThao tác này không thể hoàn tác.`))return;
    setDeletingId(incident.id);
    try{
      await api.delete(`/incidents/${incident.id}`);
      await fetchIncidents();
    }catch(err){alert('Lỗi: '+(err.response?.data?.error||err.message));}
    finally{setDeletingId(null);}
  };

  const handleExplain=async e=>{
    e.preventDefault();
    if(saving||!selectedIncident)return;
    if(!explanation.trim())return alert('Vui lòng nhập nội dung giải trình.');
    setSaving(true);
    try{
      await api.patch(`/incidents/${selectedIncident.id}/explain`,{explanation:explanation.trim()});
      setIsExplainOpen(false);
      setSelectedIncident(null);
      setExplanation('');
      await fetchIncidents();
    }catch(err){alert('Lỗi: '+(err.response?.data?.error||err.message));}
    finally{setSaving(false);}
  };

  const handleDecision=async(id,decision)=>{
    const note=window.prompt(decision==='approve'?'Nhập lý do xác nhận vi phạm:':'Nhập lý do bác bỏ:');
    if(!note?.trim())return;
    try{
      await api.patch(`/incidents/${id}/decide`,{decision,note:note.trim()});
      await fetchIncidents();
    }catch(err){alert('Lỗi: '+(err.response?.data?.error||err.message));}
  };

  const getStatusBadge=status=>{
    const badges={
      pending_explanation:['Chờ giải trình','bg-amber-50 text-amber-700 border-amber-100'],
      explained:['Đã giải trình','bg-blue-50 text-blue-700 border-blue-100'],
      approved:['Vi phạm','bg-red-50 text-red-700 border-red-100'],
      rejected:['Bác bỏ','bg-emerald-50 text-emerald-700 border-emerald-100'],
      new:['Mới','bg-slate-100 text-slate-700 border-slate-200']
    };
    const b=badges[status]||badges.new;
    return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold ${b[1]}`}>{b[0]}</span>;
  };

  const columns=[
    {header:'Mã phiếu',accessor:'code',render:r=><span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-[11px] font-bold text-blue-700">{r.code||'-'}</span>},
    {header:'Nhân viên',accessor:'user_name',render:r=><div><p className="font-semibold text-slate-800">{r.user_name||`ID ${r.user_id}`}</p>{r.username&&<p className="text-[10px] text-slate-400">@{r.username}</p>}</div>},
    {header:'Mã vi phạm',accessor:'violation_codes',render:r=><span className="text-[11px] font-semibold text-slate-600">{parseCodes(r.violation_codes)}</span>},
    {header:'Trạng thái',accessor:'status',render:r=>getStatusBadge(r.status)},
    {header:'Thao tác',accessor:'id',render:r=>{
      const editable=['new','pending_explanation'].includes(r.status);
      return <div className="flex flex-wrap items-center gap-1">
        {editable&&<button title="Sửa" onClick={()=>openEdit(r)} className="rounded-lg p-1.5 text-indigo-600 transition hover:bg-indigo-50"><Edit2 size={14}/></button>}
        {editable&&<button title="Xóa" disabled={deletingId===r.id} onClick={()=>handleDelete(r)} className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50 disabled:opacity-40">{deletingId===r.id?<Loader2 size={14} className="animate-spin"/>:<Trash2 size={14}/>}</button>}
        {r.status==='pending_explanation'&&<button onClick={()=>openExplain(r)} className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-100"><FileText size={12}/> Giải trình</button>}
        {r.status==='explained'&&<><button onClick={()=>handleDecision(r.id,'approve')} className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-100"><CheckCircle2 size={12}/> Vi phạm</button><button onClick={()=>handleDecision(r.id,'reject')} className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-600 hover:bg-emerald-100"><XCircle size={12}/> Bác bỏ</button></>}
        {!editable&&!['pending_explanation','explained'].includes(r.status)&&<span className="text-[10px] font-medium text-slate-400">Đã xử lý</span>}
      </div>;
    }}
  ];

  const cards=[
    {label:'Tổng phiếu',value:stats.total,icon:ShieldAlert,color:'bg-slate-100 text-slate-600'},
    {label:'Chờ giải trình',value:stats.pending,icon:Clock3,color:'bg-amber-50 text-amber-600'},
    {label:'Đã giải trình',value:stats.explained,icon:FileText,color:'bg-blue-50 text-blue-600'},
    {label:'Xác nhận vi phạm',value:stats.approved,icon:AlertTriangle,color:'bg-red-50 text-red-600'}
  ];

  return <div className="mx-auto w-full max-w-[1600px] animate-[pageIn_.4s_ease-out]">
    <section className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-blue-600"><Activity size={13}/> Quản lý vận hành</div><h1 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">Phiếu xử lý vi phạm</h1><p className="mt-1 text-xs text-slate-500">Theo dõi nghi vấn, giải trình và kết quả xử lý vi phạm nhân sự.</p></div>
      <button onClick={openCreate} className="group flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:shadow-xl"><Plus size={17} className="transition group-hover:rotate-90"/> Tạo phiếu nghi vấn</button>
    </section>

    <section className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((c,i)=>{const Icon=c.icon;return <div key={c.label} style={{animationDelay:`${i*60}ms`}} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm animate-[cardIn_.4s_ease-out_both] transition duration-300 hover:-translate-y-1 hover:shadow-lg"><div className="flex items-center gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.color}`}><Icon size={20}/></div><div><p className="text-[10px] font-semibold text-slate-400">{c.label}</p><p className="mt-0.5 text-2xl font-black text-slate-900">{c.value}</p></div></div></div>;})}
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
        <div><h2 className="text-sm font-bold text-slate-900">Danh sách phiếu</h2><p className="mt-0.5 text-[10px] text-slate-400">Hiển thị {filteredIncidents.length} / {incidents.length} phiếu</p></div>
        <div className="flex gap-2"><div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm mã phiếu, nhân viên..." className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[11px] outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:w-60"/></div><button onClick={()=>fetchIncidents(true)} disabled={refreshing} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[11px] font-semibold text-slate-500 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"><RefreshCw size={14} className={refreshing?'animate-spin':''}/><span className="hidden sm:inline">Làm mới</span></button></div>
      </div>
      <div className="p-2"><DataTable columns={columns} data={filteredIncidents} loading={loading}/></div>
    </section>

    {isModalOpen&&<div onMouseDown={e=>e.target===e.currentTarget&&closeForm()} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm animate-[overlayIn_.2s_ease-out]">
      <div className="w-full max-w-[520px] overflow-hidden rounded-3xl bg-white shadow-2xl animate-[modalIn_.25s_ease-out]">
        <div className="flex items-center justify-between border-b border-slate-100 p-5"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${currentIncident?'bg-indigo-50 text-indigo-600':'bg-amber-50 text-amber-600'}`}>{currentIncident?<Edit2 size={19}/>:<AlertTriangle size={19}/>}</div><div><h3 className="text-[15px] font-bold text-slate-900">{currentIncident?'Sửa phiếu nghi vấn':'Tạo phiếu nghi vấn'}</h3><p className="text-[10px] text-slate-400">{currentIncident?`Phiếu ${currentIncident.code}`:'Ghi nhận vi phạm cần nhân viên giải trình'}</p></div></div><button onClick={closeForm} disabled={saving} className="p-2 text-slate-400 hover:text-red-500"><X size={18}/></button></div>
        <form onSubmit={handleSave} className="space-y-4 p-5">
          <Field label="ID nhân viên *"><input required type="number" min="1" value={formData.user_id} onChange={e=>setFormData({...formData,user_id:e.target.value})} className="incident-input" placeholder="VD: 5"/></Field>
          <Field label="Mã vi phạm *"><select value={formData.violation_codes} onChange={e=>setFormData({...formData,violation_codes:e.target.value})} className="incident-input"><option value="VP001">VP001 - Đi muộn dưới 15 phút</option><option value="VP002">VP002 - Đi muộn 15-30 phút</option><option value="VP003">VP003 - Đi muộn trên 30 phút</option><option value="VP004">VP004 - Về sớm dưới 15 phút</option><option value="VP005">VP005 - Về sớm trên 15 phút</option></select></Field>
          <Field label="Bằng chứng / Mô tả"><textarea rows="3" value={formData.evidence} onChange={e=>setFormData({...formData,evidence:e.target.value})} className="incident-textarea" placeholder="VD: Máy chấm công ghi nhận lúc 08:20..."/></Field>
          <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-4 sm:flex-row"><button type="button" onClick={closeForm} disabled={saving} className="h-10 rounded-xl px-4 text-xs font-semibold text-slate-500 hover:bg-slate-100">Hủy</button><button type="submit" disabled={saving} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-xs font-bold text-white shadow-lg shadow-blue-200 disabled:opacity-50">{saving?<Loader2 size={15} className="animate-spin"/>:<Save size={15}/>} {saving?'Đang lưu...':currentIncident?'Lưu thay đổi':'Tạo phiếu'}</button></div>
        </form>
      </div>
    </div>}

    {isExplainOpen&&<div onMouseDown={e=>e.target===e.currentTarget&&closeExplain()} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm animate-[overlayIn_.2s_ease-out]">
      <div className="w-full max-w-[520px] overflow-hidden rounded-3xl bg-white shadow-2xl animate-[modalIn_.25s_ease-out]">
        <div className="flex items-center justify-between border-b border-slate-100 p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FileText size={19}/></div><div><h3 className="text-[15px] font-bold text-slate-900">Gửi giải trình</h3><p className="text-[10px] text-slate-400">{selectedIncident?.code||'Phiếu vi phạm'}</p></div></div><button onClick={closeExplain} disabled={saving} className="p-2 text-slate-400 hover:text-red-500"><X size={18}/></button></div>
        <form onSubmit={handleExplain} className="space-y-4 p-5">
          <Field label="Nội dung giải trình *"><textarea required rows="5" value={explanation} onChange={e=>setExplanation(e.target.value)} className="incident-textarea" placeholder="Nhập lý do và bằng chứng giải trình..."/></Field>
          <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-4 sm:flex-row"><button type="button" onClick={closeExplain} disabled={saving} className="h-10 rounded-xl px-4 text-xs font-semibold text-slate-500 hover:bg-slate-100">Hủy</button><button type="submit" disabled={saving} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-xs font-bold text-white shadow-lg shadow-blue-200 disabled:opacity-50">{saving?<Loader2 size={15} className="animate-spin"/>:<FileText size={15}/>} {saving?'Đang gửi...':'Gửi giải trình'}</button></div>
        </form>
      </div>
    </div>}

    <style>{`
      @keyframes pageIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      @keyframes cardIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
      @keyframes overlayIn{from{opacity:0}to{opacity:1}}
      @keyframes modalIn{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
      .incident-input{width:100%;height:42px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:0 12px;font-size:12px;color:#334155;outline:none;transition:.2s}
      .incident-input:focus,.incident-textarea:focus{border-color:#93c5fd;background:#fff;box-shadow:0 0 0 3px #dbeafe}
      .incident-textarea{width:100%;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:10px 12px;font-size:12px;color:#334155;outline:none;resize:vertical;transition:.2s}
    `}</style>
  </div>;
}

function Field({label,children}) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-slate-600">{label}</span>{children}</label>;
}