import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import {
  Plus, X, BookOpen, Search, CheckCircle2, Tag, FileText,
  Clock3, Sparkles, Send, Loader2, AlertTriangle, XCircle,
  Library, UserRound, Eye, ChevronRight
} from 'lucide-react';
import DataTable from '../components/DataTable';

const EMPTY = { code:'', title:'', steps:'', owner:'', tags:'' };

export default function SOP() {
  const [sops,setSops] = useState([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [search,setSearch] = useState('');
  const [modal,setModal] = useState(false);
  const [detail,setDetail] = useState(null);
  const [form,setForm] = useState(EMPTY);
  const [popup,setPopup] = useState(null);

  const message = (type,title,text) => setPopup({ type,title,text });

  const fetchSOPs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sop');
      setSops(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setSops([]);
      message('error','Không tải được thư viện',err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchSOPs(),0);
    return () => clearTimeout(timer);
  },[]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sops;
    return sops.filter(x =>
      [x.title,x.code,x.tags,x.owner,x.steps]
        .some(v => String(v || '').toLowerCase().includes(q))
    );
  },[sops,search]);

  const stats = useMemo(() => ({
    total:sops.length,
    approved:sops.filter(x => x.approved).length,
    pending:sops.filter(x => !x.approved).length,
    owners:new Set(sops.map(x => x.owner).filter(Boolean)).size
  }),[sops]);

  const openCreate = () => {
    setForm({...EMPTY});
    setModal(true);
  };

  const change = (key,value) => setForm(x => ({...x,[key]:value}));

  const save = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/sop',form);
      setModal(false);
      await fetchSOPs();
      message('success','Đã lưu quy trình','Quy trình mới đã được thêm vào thư viện SOP.');
    } catch (err) {
      message('error','Không thể lưu quy trình',err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      header:'Mã quy trình',accessor:'code',
      render:r => <span className="whitespace-nowrap rounded-lg bg-blue-50 px-2.5 py-1.5 text-[11px] font-black text-blue-600">{r.code}</span>
    },
    {
      header:'Quy trình',accessor:'title',
      render:r => (
        <button onClick={() => setDetail(r)} className="group min-w-[230px] max-w-[360px] text-left">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:scale-105">
              <FileText size={16}/>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 transition group-hover:text-blue-600">{r.title}</p>
              <p className="mt-1 line-clamp-1 text-[10px] text-slate-400">{r.steps}</p>
            </div>
          </div>
        </button>
      )
    },
    {
      header:'Phụ trách',accessor:'owner',
      render:r => <span className="whitespace-nowrap text-xs font-semibold text-slate-600">{r.owner || '—'}</span>
    },
    {
      header:'Tags',accessor:'tags',
      render:r => (
        <div className="flex min-w-[140px] max-w-[250px] flex-wrap gap-1">
          {r.tags ? r.tags.split(',').slice(0,4).map((tag,i) =>
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">
              <Tag size={9}/>{tag.trim()}
            </span>
          ) : <span className="text-xs text-slate-400">—</span>}
        </div>
      )
    },
    {
      header:'Trạng thái',accessor:'approved',
      render:r => r.approved
        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700"><CheckCircle2 size={12}/> Đã duyệt</span>
        : <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700"><Clock3 size={12}/> Chờ duyệt</span>
    },
    {
      header:'Xem',accessor:'id',
      render:r => (
        <button onClick={() => setDetail(r)} className="action-btn text-blue-600 hover:bg-blue-50" title="Xem quy trình">
          <Eye size={16}/>
        </button>
      )
    }
  ];

  const cards = [
    {label:'Tổng quy trình',value:stats.total,sub:'Trong thư viện SOP',icon:Library,color:'bg-blue-50 text-blue-600'},
    {label:'Đã duyệt',value:stats.approved,sub:'Có thể sử dụng',icon:CheckCircle2,color:'bg-emerald-50 text-emerald-600'},
    {label:'Chờ duyệt',value:stats.pending,sub:'Đang chờ xử lý',icon:Clock3,color:'bg-amber-50 text-amber-600'},
    {label:'Bộ phận phụ trách',value:stats.owners,sub:'Có tài liệu SOP',icon:UserRound,color:'bg-violet-50 text-violet-600'}
  ];

  return (
    <div className="mx-auto max-w-[1600px] animate-[pageIn_.45s_ease-out]">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.16em] text-blue-600">
            <Sparkles size={12}/> Tri thức doanh nghiệp
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
            Thư viện Quy trình <span className="text-blue-600">SOP</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500">Kho tài liệu hướng dẫn vận hành dành cho nhân viên và Trợ lý AI.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã, tên, tag, bộ phận..." className="search-box"/>
          </div>
          <button onClick={openCreate} className="main-btn"><Plus size={16}/> Thêm quy trình</button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card,i) => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={{animationDelay:`${i*70}ms`}} className="stat-card animate-[cardIn_.45s_ease-out_both]">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.color}`}><Icon size={20}/></div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400">{card.label}</p>
                <p className="truncate text-lg font-black text-slate-900">{card.value}</p>
                <p className="truncate text-[9px] text-slate-400">{card.sub}</p>
              </div>
              <div className="shine"/>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.05)]">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-blue-600"/>
              <b className="text-sm text-slate-800">Danh mục quy trình</b>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Hiển thị {filtered.length}/{sops.length} tài liệu</p>
          </div>
          <div className="hidden rounded-xl bg-blue-50 px-3 py-2 text-[10px] font-bold text-blue-700 sm:block">
            {stats.approved} quy trình đã duyệt
          </div>
        </div>
        <div className="p-2"><DataTable columns={columns} data={filtered} loading={loading}/></div>
      </div>

      {modal && (
        <Modal wide close={() => !saving && setModal(false)}>
          <div className="modal-top">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><BookOpen size={19}/></div>
              <div><h3 className="font-black text-white">Thêm quy trình mới</h3><p className="text-[10px] text-blue-100">Bổ sung tài liệu vào thư viện SOP</p></div>
            </div>
            <button onClick={() => setModal(false)} className="close-btn"><X size={18}/></button>
          </div>

          <form onSubmit={save} className="max-h-[78vh] overflow-y-auto p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mã quy trình *">
                <input required value={form.code} onChange={e => change('code',e.target.value)} className="input" placeholder="VD: SOP-QC-01"/>
              </Field>
              <Field label="Bộ phận phụ trách">
                <input value={form.owner} onChange={e => change('owner',e.target.value)} className="input" placeholder="VD: Tổ QC, Kho..."/>
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Tiêu đề quy trình *">
                <input required value={form.title} onChange={e => change('title',e.target.value)} className="input" placeholder="Tên quy trình"/>
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Nội dung các bước *">
                <textarea required rows="7" value={form.steps} onChange={e => change('steps',e.target.value)} className="textarea" placeholder={'Bước 1: ...\nBước 2: ...\nBước 3: ...'}/>
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Thẻ tìm kiếm">
                <div className="relative">
                  <Tag size={14} className="absolute left-3 top-3.5 text-slate-400"/>
                  <input value={form.tags} onChange={e => change('tags',e.target.value)} className="input pl-9" placeholder="qc, kiểm-tra, kho, sản-xuất"/>
                </div>
              </Field>
              <p className="mt-1.5 text-[9px] leading-4 text-slate-400">Các thẻ cách nhau bằng dấu phẩy, giúp tìm kiếm tài liệu nhanh hơn.</p>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <Sparkles size={17} className="mt-0.5 shrink-0 text-blue-600"/>
              <div><p className="text-[11px] font-black text-blue-800">Tài liệu rõ ràng sẽ dễ tra cứu hơn</p><p className="mt-1 text-[10px] leading-4 text-blue-600/80">Nên mô tả từng bước cụ thể và gắn đúng bộ phận, từ khóa liên quan.</p></div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setModal(false)} className="cancel-btn">Hủy</button>
              <button disabled={saving} className="main-btn disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>} Lưu quy trình
              </button>
            </div>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal wide close={() => setDetail(null)}>
          <div className="modal-top">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><FileText size={19}/></div>
              <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wider text-blue-100">{detail.code}</p><h3 className="truncate font-black text-white">{detail.title}</h3></div>
            </div>
            <button onClick={() => setDetail(null)} className="close-btn"><X size={18}/></button>
          </div>

          <div className="max-h-[75vh] overflow-y-auto p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info title="Bộ phận phụ trách" value={detail.owner || 'Chưa xác định'} icon={UserRound}/>
              <Info title="Trạng thái" value={detail.approved ? 'Đã duyệt' : 'Chờ duyệt'} icon={detail.approved ? CheckCircle2 : Clock3}/>
            </div>

            {detail.tags && (
              <div className="mt-5">
                <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Thẻ tìm kiếm</p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.tags.split(',').map((tag,i) =>
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600"><Tag size={10}/>{tag.trim()}</span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5">
              <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Nội dung quy trình</p>
              <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700">{detail.steps}</div>
            </div>

            <button onClick={() => setDetail(null)} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-xs font-bold text-white transition hover:bg-blue-600">
              Đóng tài liệu <ChevronRight size={14}/>
            </button>
          </div>
        </Modal>
      )}

      {popup && (
        <Modal close={() => setPopup(null)}>
          <div className="p-6 text-center">
            {popup.type === 'success'
              ? <div className="popup-icon bg-emerald-50 text-emerald-500"><CheckCircle2 size={30}/></div>
              : popup.type === 'warning'
                ? <div className="popup-icon bg-amber-50 text-amber-500"><AlertTriangle size={30}/></div>
                : <div className="popup-icon bg-red-50 text-red-500"><XCircle size={30}/></div>
            }
            <h3 className="mt-4 text-lg font-black text-slate-900">{popup.title}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">{popup.text}</p>
            <button onClick={() => setPopup(null)} className="mt-5 h-10 w-full rounded-xl bg-slate-900 text-xs font-bold text-white transition hover:bg-blue-600">Đã hiểu</button>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes cardIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes modalIn{from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:none}}
        .stat-card{position:relative;display:flex;align-items:center;gap:12px;overflow:hidden;border:1px solid #e2e8f0;border-radius:20px;background:#fff;padding:16px;box-shadow:0 5px 20px rgba(15,23,42,.04);transition:.3s}
        .stat-card:hover{transform:translateY(-4px);border-color:#dbeafe;box-shadow:0 18px 40px rgba(15,23,42,.09)}
        .shine{position:absolute;right:-25px;top:-25px;width:75px;height:75px;border-radius:999px;background:linear-gradient(135deg,rgba(59,130,246,.1),transparent);transition:.4s}
        .stat-card:hover .shine{transform:scale(1.5)}
        .main-btn{display:flex;height:40px;align-items:center;justify-content:center;gap:7px;border-radius:12px;background:linear-gradient(100deg,#2563eb,#4f46e5);padding:0 17px;font-size:12px;font-weight:800;color:#fff;box-shadow:0 8px 22px rgba(37,99,235,.22);transition:.25s}
        .main-btn:hover{transform:translateY(-2px);box-shadow:0 12px 28px rgba(37,99,235,.3)}
        .search-box,.input,.textarea{width:100%;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:0 12px;font-size:12px;outline:none;transition:.2s}
        .search-box{height:40px;padding-left:34px}.input{height:42px}.textarea{padding:12px;resize:vertical;line-height:1.6}
        .search-box:focus,.input:focus,.textarea:focus{border-color:#93c5fd;background:#fff;box-shadow:0 0 0 3px #dbeafe}
        .action-btn{display:flex;height:34px;width:34px;align-items:center;justify-content:center;border-radius:10px;transition:.2s}.action-btn:hover{transform:scale(1.08)}
        .modal-bg{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.62);padding:12px;backdrop-filter:blur(7px)}
        .modal-box{width:100%;overflow:hidden;border-radius:24px;background:#fff;box-shadow:0 30px 90px rgba(15,23,42,.35);animation:modalIn .25s cubic-bezier(.16,1,.3,1)}
        .modal-top{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(110deg,#2563eb,#4f46e5,#6366f1);padding:17px 20px}
        .close-btn{border-radius:12px;background:rgba(255,255,255,.1);padding:8px;color:rgba(255,255,255,.8);transition:.2s}.close-btn:hover{transform:rotate(90deg);background:rgba(255,255,255,.2)}
        .cancel-btn{height:40px;border-radius:12px;background:#f1f5f9;padding:0 20px;font-size:12px;font-weight:700;color:#475569;transition:.2s}.cancel-btn:hover{background:#e2e8f0}
        .popup-icon{margin:auto;display:flex;height:64px;width:64px;align-items:center;justify-content:center;border-radius:22px;animation:modalIn .35s ease-out}
        @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      `}</style>
    </div>
  );
}

function Modal({children,close,wide=false}) {
  return (
    <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && close?.()}>
      <div className={`modal-box ${wide ? 'max-w-[680px]' : 'max-w-[410px]'}`}>{children}</div>
    </div>
  );
}

function Field({label,children}) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-slate-500">{label}</span>{children}</label>;
}

function Info({title,value,icon:Icon}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><Icon size={16}/></div>
      <div><p className="text-[9px] font-semibold text-slate-400">{title}</p><p className="text-xs font-black text-slate-700">{value}</p></div>
    </div>
  );
}