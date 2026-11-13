import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { Search, Plus, Edit2, X, Trash2, Users, Truck, Building2, WalletCards, Phone, Loader2, Save, CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import DataTable from '../components/DataTable';

const EMPTY={type:'customer',code:'',name:'',company_name:'',contact_person:'',phone:'',email:'',tax_code:'',address:'',category:'Khách lẻ',bank_account:'',bank_name:'',credit_limit:0,payment_term:0};
const money=n=>Number(n||0).toLocaleString('vi-VN');

export default function Partners(){
  const [partners,setPartners]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
  const [search,setSearch]=useState(''),[filterType,setFilterType]=useState('all');
  const [modal,setModal]=useState(false),[current,setCurrent]=useState(null),[form,setForm]=useState(EMPTY);
  const [popup,setPopup]=useState(null),[confirmBox,setConfirmBox]=useState(null);

  const message=(type,title,text)=>setPopup({type,title,text});
  const fetchPartners=async()=>{setLoading(true);try{const res=await api.get('/partners');setPartners(Array.isArray(res.data?.data)?res.data.data:[])}catch(e){message('error','Không tải được dữ liệu',e.response?.data?.error||e.message)}finally{setLoading(false)}};

  useEffect(()=>{
    const timer=setTimeout(()=>fetchPartners(),0);
    return()=>clearTimeout(timer);
  },[]);

  const stats=useMemo(()=>({
    total:partners.length,
    customer:partners.filter(x=>x.type==='customer').length,
    supplier:partners.filter(x=>x.type==='supplier').length,
    credit:partners.reduce((s,x)=>s+Number(x.credit_limit||0),0)
  }),[partners]);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return partners.filter(p=>{
      const matchType=filterType==='all'||p.type===filterType;
      const matchSearch=!q||[p.code,p.name,p.company_name,p.contact_person,p.phone,p.email].some(v=>String(v||'').toLowerCase().includes(q));
      return matchType&&matchSearch;
    });
  },[partners,search,filterType]);

  const openCreate=()=>{setCurrent(null);setForm({...EMPTY});setModal(true)};
  const openEdit=p=>{setCurrent(p);setForm({type:p.type||'customer',code:p.code||'',name:p.name||'',company_name:p.company_name||'',contact_person:p.contact_person||'',phone:p.phone||'',email:p.email||'',tax_code:p.tax_code||'',address:p.address||'',category:p.category||'Khách lẻ',bank_account:p.bank_account||'',bank_name:p.bank_name||'',credit_limit:p.credit_limit||0,payment_term:p.payment_term||0});setModal(true)};
  const change=(key,value)=>setForm(x=>({...x,[key]:value}));

  const save=async e=>{
    e.preventDefault();
    if(!form.name.trim())return message('warning','Thiếu tên đối tác','Vui lòng nhập tên đối tác.');
    setSaving(true);
    try{
      const payload={...form,credit_limit:Number(form.credit_limit||0),payment_term:Number(form.payment_term||0)};
      if(current)await api.patch(`/partners/${current.id}`,payload);
      else{delete payload.code;await api.post('/partners',payload)}
      setModal(false);await fetchPartners();
      message('success',current?'Cập nhật thành công':'Tạo đối tác thành công',current?'Thông tin đối tác đã được cập nhật.':'Đối tác mới đã được thêm vào hệ thống.');
    }catch(e){message('error','Không thể lưu đối tác',e.response?.data?.error||e.message)}
    finally{setSaving(false)}
  };

  const askDelete=p=>setConfirmBox(p);
  const remove=async()=>{
    if(!confirmBox)return;
    const p=confirmBox;setConfirmBox(null);
    try{await api.delete(`/partners/${p.id}`);await fetchPartners();message('success','Đã khóa đối tác',`${p.name} đã được khóa thành công.`)}
    catch(e){message('error','Không thể khóa đối tác',e.response?.data?.error||e.message)}
  };

  const columns=[
    {header:'Mã',accessor:'code',render:r=><span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-black text-slate-700">{r.code}</span>},
    {header:'Tên đối tác',accessor:'name',render:r=><div className="flex items-center gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.type==='customer'?'bg-emerald-50 text-emerald-600':'bg-amber-50 text-amber-600'}`}>{r.type==='customer'?<Users size={17}/>:<Truck size={17}/>}</div><div><p className="font-bold text-slate-800">{r.name}</p><p className="text-[11px] text-slate-400">{r.contact_person||r.company_name||'Chưa có người liên hệ'}</p></div></div>},
    {header:'Loại',accessor:'type',render:r=><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${r.type==='customer'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{r.type==='customer'?'KHÁCH HÀNG':'NHÀ CUNG CẤP'}</span>},
    {header:'Điện thoại',accessor:'phone',render:r=><span className="text-xs text-slate-600">{r.phone||'—'}</span>},
    {header:'Hạn mức nợ',accessor:'credit_limit',render:r=><b className="text-xs text-blue-600">{Number(r.credit_limit)>0?`${money(r.credit_limit)} đ`:'Không có'}</b>},
    {header:'Thao tác',accessor:'id',render:r=><div className="flex gap-1"><button onClick={()=>openEdit(r)} className="action text-blue-600 hover:bg-blue-50" title="Sửa"><Edit2 size={15}/></button><button onClick={()=>askDelete(r)} className="action text-red-500 hover:bg-red-50" title="Khóa"><Trash2 size={15}/></button></div>}
  ];

  const cards=[
    {label:'Tổng đối tác',value:stats.total,icon:Building2,cls:'bg-blue-50 text-blue-600'},
    {label:'Khách hàng',value:stats.customer,icon:Users,cls:'bg-emerald-50 text-emerald-600'},
    {label:'Nhà cung cấp',value:stats.supplier,icon:Truck,cls:'bg-amber-50 text-amber-600'},
    {label:'Tổng hạn mức nợ',value:`${money(stats.credit)} đ`,icon:WalletCards,cls:'bg-violet-50 text-violet-600'}
  ];

  return <div className="mx-auto max-w-[1600px] animate-[pageIn_.45s_ease-out]">
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.16em] text-blue-600"><Sparkles size={12}/> Kinh doanh & Kho</div><h1 className="text-2xl font-black tracking-tight text-slate-900">Quản lý Đối tác</h1><p className="mt-1 text-xs text-slate-500">Quản lý khách hàng, nhà cung cấp và hạn mức công nợ.</p></div>
      <button onClick={openCreate} className="main-btn"><Plus size={17}/> Thêm đối tác</button>
    </div>

    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((c,i)=>{const Icon=c.icon;return <div key={c.label} style={{animationDelay:`${i*70}ms`}} className="stat-card animate-[cardIn_.45s_ease-out_both]"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${c.cls}`}><Icon size={20}/></div><div className="min-w-0"><p className="text-[10px] font-semibold text-slate-400">{c.label}</p><p className="truncate text-lg font-black text-slate-900">{c.value}</p></div><div className="shine"/></div>})}
    </div>

    <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.05)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div><b className="text-sm text-slate-800">Danh sách đối tác</b><p className="text-[10px] text-slate-400">Đang hiển thị {filtered.length}/{partners.length} đối tác</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex rounded-xl bg-slate-100 p-1">
            {[['all','Tất cả'],['customer','Khách hàng'],['supplier','Nhà cung cấp']].map(([v,l])=><button key={v} onClick={()=>setFilterType(v)} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${filterType===v?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-800'}`}>{l}</button>)}
          </div>
          <div className="relative sm:w-72"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tên, mã, SĐT, email..." className="search-box"/></div>
        </div>
      </div>
      <div className="p-2"><DataTable columns={columns} data={filtered} loading={loading}/></div>
    </div>

    {modal&&<Modal wide close={()=>!saving&&setModal(false)}>
      <div className="modal-top">
        <div><div className="mb-1 flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Building2 size={18}/></div><div><h3 className="font-black text-white">{current?'Cập nhật đối tác':'Thêm đối tác mới'}</h3><p className="text-[10px] text-blue-100">{current?`${current.code} · ${current.name}`:'Mã đối tác được hệ thống tự sinh'}</p></div></div></div>
        <button onClick={()=>setModal(false)} className="rounded-xl bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:rotate-90"><X size={18}/></button>
      </div>

      <form onSubmit={save} className="max-h-[78vh] overflow-y-auto p-5">
        <Section title="Thông tin chung"/>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Phân loại *"><select value={form.type} onChange={e=>change('type',e.target.value)} className="input"><option value="customer">Khách hàng</option><option value="supplier">Nhà cung cấp</option></select></Field>
          <Field label="Mã đối tác"><div className="locked">{current?.code||`Tự sinh: ${form.type==='supplier'?'NCCxxx':'KHxxx'}`}</div></Field>
          <Field label="Nhóm đối tác"><input value={form.category} onChange={e=>change('category',e.target.value)} className="input" placeholder="Khách lẻ, Đại lý..."/></Field>
          <div className="md:col-span-3"><Field label="Tên đối tác *"><input required value={form.name} onChange={e=>change('name',e.target.value)} className="input" placeholder="Tên công ty hoặc cá nhân"/></Field></div>
          <div className="md:col-span-3"><Field label="Tên công ty xuất hóa đơn"><input value={form.company_name} onChange={e=>change('company_name',e.target.value)} className="input"/></Field></div>
        </div>

        <Section title="Liên hệ"/>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Người liên hệ"><input value={form.contact_person} onChange={e=>change('contact_person',e.target.value)} className="input"/></Field>
          <Field label="Số điện thoại"><div className="relative"><Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={form.phone} onChange={e=>change('phone',e.target.value)} className="input pl-9"/></div></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={e=>change('email',e.target.value)} className="input"/></Field>
          <div className="md:col-span-2"><Field label="Địa chỉ"><input value={form.address} onChange={e=>change('address',e.target.value)} className="input"/></Field></div>
          <Field label="Mã số thuế"><input value={form.tax_code} onChange={e=>change('tax_code',e.target.value)} className="input"/></Field>
        </div>

        <Section title="Ngân hàng & Công nợ"/>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Số tài khoản"><input value={form.bank_account} onChange={e=>change('bank_account',e.target.value)} className="input"/></Field>
          <Field label="Tên ngân hàng"><input value={form.bank_name} onChange={e=>change('bank_name',e.target.value)} className="input"/></Field>
          <Field label="Hạn mức công nợ (VNĐ)"><input type="number" min="0" value={form.credit_limit} onChange={e=>change('credit_limit',e.target.value)} className="input font-bold text-blue-600"/></Field>
          <Field label="Số ngày được nợ"><input type="number" min="0" value={form.payment_term} onChange={e=>change('payment_term',e.target.value)} className="input font-bold text-blue-600"/></Field>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={()=>setModal(false)} className="h-10 rounded-xl bg-slate-100 px-5 text-xs font-bold text-slate-600 hover:bg-slate-200">Hủy</button>
          <button disabled={saving} className="main-btn disabled:opacity-50">{saving?<Loader2 size={15} className="animate-spin"/>:<Save size={15}/>} {current?'Lưu thay đổi':'Tạo đối tác'}</button>
        </div>
      </form>
    </Modal>}

    {confirmBox&&<Modal close={()=>setConfirmBox(null)}>
      <div className="p-6 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-red-50 text-red-500 animate-[pulseSoft_1.8s_ease-in-out_infinite]"><Trash2 size={26}/></div><h3 className="text-lg font-black text-slate-900">Khóa đối tác?</h3><p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-500">Bạn có chắc muốn khóa <b className="text-slate-800">{confirmBox.name}</b>? Thao tác này sẽ cập nhật trạng thái trên hệ thống.</p><div className="mt-5 flex gap-2"><button onClick={()=>setConfirmBox(null)} className="h-10 flex-1 rounded-xl bg-slate-100 text-xs font-bold text-slate-600">Hủy</button><button onClick={remove} className="h-10 flex-1 rounded-xl bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-500/20 hover:bg-red-600">Xác nhận khóa</button></div></div>
    </Modal>}

    {popup&&<Modal close={()=>setPopup(null)}>
      <div className="p-6 text-center">{popup.type==='success'?<div className="popup-icon bg-emerald-50 text-emerald-500"><CheckCircle2 size={30}/></div>:popup.type==='warning'?<div className="popup-icon bg-amber-50 text-amber-500"><AlertTriangle size={30}/></div>:<div className="popup-icon bg-red-50 text-red-500"><XCircle size={30}/></div>}<h3 className="mt-4 text-lg font-black text-slate-900">{popup.title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{popup.text}</p><button onClick={()=>setPopup(null)} className="mt-5 h-10 w-full rounded-xl bg-slate-900 text-xs font-bold text-white transition hover:bg-blue-600">Đã hiểu</button></div>
    </Modal>}

    <style>{`
      @keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
      @keyframes cardIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
      @keyframes modalIn{from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:none}}
      @keyframes pulseSoft{50%{transform:scale(1.07)}}
      .stat-card{position:relative;display:flex;align-items:center;gap:12px;overflow:hidden;border:1px solid #e2e8f0;border-radius:20px;background:#fff;padding:16px;box-shadow:0 5px 20px rgba(15,23,42,.04);transition:.3s}
      .stat-card:hover{transform:translateY(-4px);box-shadow:0 18px 40px rgba(15,23,42,.09);border-color:#dbeafe}
      .shine{position:absolute;right:-25px;top:-25px;width:75px;height:75px;border-radius:999px;background:linear-gradient(135deg,rgba(59,130,246,.1),transparent);transition:.4s}
      .stat-card:hover .shine{transform:scale(1.5)}
      .main-btn{display:flex;height:40px;align-items:center;justify-content:center;gap:7px;border-radius:12px;background:linear-gradient(100deg,#2563eb,#4f46e5);padding:0 17px;font-size:12px;font-weight:800;color:#fff;box-shadow:0 8px 22px rgba(37,99,235,.22);transition:.25s}
      .main-btn:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(37,99,235,.3)}
      .search-box,.input{height:42px;width:100%;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:0 12px;font-size:12px;outline:none;transition:.2s}
      .search-box{height:36px;padding-left:34px}.input:focus,.search-box:focus{border-color:#93c5fd;background:#fff;box-shadow:0 0 0 3px #dbeafe}
      .locked{display:flex;height:42px;align-items:center;border:1px dashed #cbd5e1;border-radius:12px;background:#f8fafc;padding:0 12px;font-size:11px;font-weight:600;color:#64748b}
      .action{display:flex;height:34px;width:34px;align-items:center;justify-content:center;border-radius:10px;transition:.2s}.action:hover{transform:scale(1.08)}
      .modal-bg{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.62);padding:12px;backdrop-filter:blur(7px)}
      .modal-box{width:100%;overflow:hidden;border:1px solid rgba(255,255,255,.5);border-radius:24px;background:#fff;box-shadow:0 30px 90px rgba(15,23,42,.35);animation:modalIn .25s cubic-bezier(.16,1,.3,1)}
      .modal-top{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(110deg,#2563eb,#4f46e5,#6366f1);padding:17px 20px}
      .popup-icon{margin:auto;display:flex;height:64px;width:64px;align-items:center;justify-content:center;border-radius:22px;animation:modalIn .35s ease-out}
      @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
    `}</style>
  </div>
}

function Modal({children,close,wide=false}){
  return <div className="modal-bg" onMouseDown={e=>e.target===e.currentTarget&&close?.()}><div className={`modal-box ${wide?'max-w-[850px]':'max-w-[410px]'}`}>{children}</div></div>
}
function Field({label,children}){
  return <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-slate-500">{label}</span>{children}</label>
}
function Section({title}){
  return <div className="mb-3 mt-5 first:mt-0 flex items-center gap-3"><b className="whitespace-nowrap text-[11px] uppercase tracking-[.12em] text-slate-400">{title}</b><div className="h-px flex-1 bg-slate-100"/></div>
}