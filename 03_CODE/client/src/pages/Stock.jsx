import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import {
  ArrowDownToLine, ArrowUpFromLine, RefreshCw, Search,
  Warehouse, PackageCheck, Activity, Boxes, Sparkles,
  Clock3, Link2, ShieldCheck, X, Eye, Hash, FileText,
  XCircle, CheckCircle2
} from 'lucide-react';
import DataTable from '../components/DataTable';

const number = n => Number(n || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const money = n => Number(n || 0).toLocaleString('vi-VN') + ' đ';

export default function Stock() {
  const [ledger,setLedger] = useState([]);
  const [loading,setLoading] = useState(true);
  const [search,setSearch] = useState('');
  const [type,setType] = useState('all');
  const [detail,setDetail] = useState(null);
  const [popup,setPopup] = useState(null);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const res = await api.get('/stock-ledger');
      setLedger(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setLedger([]);
      setPopup({
        type:'error',
        title:'Không tải được dữ liệu kho',
        text:err.response?.data?.error || err.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchStock(),0);
    return () => clearTimeout(timer);
  },[]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ledger.filter(row => {
      const matchSearch = !q || [
        row.item_name,row.item_code,row.ref_type,row.ref_id,row.note,row.batch_no
      ].some(v => String(v || '').toLowerCase().includes(q));
      const matchType = type === 'all' || row.type === type;
      return matchSearch && matchType;
    });
  },[ledger,search,type]);

  const stats = useMemo(() => ({
    transactions:ledger.length,
    incoming:ledger.filter(x => x.type === 'in').reduce((s,x) => s + Number(x.qty || 0),0),
    outgoing:ledger.filter(x => x.type === 'out').reduce((s,x) => s + Number(x.qty || 0),0),
    adjustments:ledger.filter(x => x.type === 'adjust').length
  }),[ledger]);

  const signedQty = row => {
    if (row.signed_qty !== undefined && row.signed_qty !== null) return Number(row.signed_qty);
    if (row.type === 'in') return Math.abs(Number(row.qty || 0));
    if (row.type === 'out') return -Math.abs(Number(row.qty || 0));
    return Number(row.qty || 0);
  };

  const source = row => {
    if (row.ref_type === 'order') return `Đơn hàng #${row.ref_id || '—'}`;
    if (row.ref_type === 'work_order') return `Sản xuất${row.ref_id ? ` #${row.ref_id}` : ''}`;
    if (row.ref_type === 'initial') return 'Tồn kho ban đầu';
    if (row.ref_type) return `${row.ref_type}${row.ref_id ? ` #${row.ref_id}` : ''}`;
    return 'Nhập thủ công';
  };

  const columns = [
    {
      header:'Thời gian',accessor:'created_at',
      render:r => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Clock3 size={13} className="text-slate-400"/>
          <span className="text-[11px] font-semibold text-slate-600">
            {r.created_at ? new Date(r.created_at).toLocaleString('vi-VN') : '—'}
          </span>
        </div>
      )
    },
    {
      header:'Mã hàng',accessor:'item_code',
      render:r => <span className="whitespace-nowrap rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700">{r.item_code || '—'}</span>
    },
    {
      header:'Hàng hóa',accessor:'item_name',
      render:r => (
        <button onClick={() => setDetail(r)} className="group flex min-w-[190px] items-center gap-3 text-left">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:scale-105">
            <Boxes size={16}/>
          </div>
          <div>
            <p className="font-bold text-slate-800 transition group-hover:text-blue-600">{r.item_name || '—'}</p>
            {r.batch_no && <p className="mt-0.5 text-[9px] text-slate-400">Lô: {r.batch_no}</p>}
          </div>
        </button>
      )
    },
    {
      header:'Giao dịch',accessor:'type',
      render:r => r.type === 'in'
        ? <span className="type-badge bg-emerald-50 text-emerald-700"><ArrowDownToLine size={13}/> Nhập kho</span>
        : r.type === 'out'
          ? <span className="type-badge bg-red-50 text-red-600"><ArrowUpFromLine size={13}/> Xuất kho</span>
          : <span className="type-badge bg-blue-50 text-blue-700"><RefreshCw size={13}/> Điều chỉnh</span>
    },
    {
      header:'Số lượng',accessor:'qty',
      render:r => {
        const qty = signedQty(r);
        return (
          <span className={`whitespace-nowrap text-sm font-black ${
            qty > 0 ? 'text-emerald-600' : qty < 0 ? 'text-red-500' : 'text-slate-500'
          }`}>
            {qty > 0 ? '+' : ''}{number(qty)}
          </span>
        );
      }
    },
    {
      header:'Nguồn gốc',accessor:'ref_type',
      render:r => (
        <div className="flex min-w-[150px] items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <Link2 size={12}/>{source(r)}
        </div>
      )
    },
    {
      header:'Chi tiết',accessor:'id',
      render:r => (
        <button onClick={() => setDetail(r)} className="action-btn text-blue-600 hover:bg-blue-50" title="Xem chi tiết">
          <Eye size={16}/>
        </button>
      )
    }
  ];

  const cards = [
    {label:'Tổng giao dịch',value:stats.transactions,sub:'Bút toán trong sổ kho',icon:Activity,color:'bg-blue-50 text-blue-600'},
    {label:'Tổng nhập',value:number(stats.incoming),sub:'Theo nhật ký nhập kho',icon:ArrowDownToLine,color:'bg-emerald-50 text-emerald-600'},
    {label:'Tổng xuất',value:number(stats.outgoing),sub:'Theo nhật ký xuất kho',icon:ArrowUpFromLine,color:'bg-rose-50 text-rose-600'},
    {label:'Điều chỉnh',value:stats.adjustments,sub:'Số giao dịch điều chỉnh',icon:RefreshCw,color:'bg-violet-50 text-violet-600'}
  ];

  return (
    <div className="mx-auto max-w-[1600px] animate-[pageIn_.45s_ease-out]">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.16em] text-blue-600">
            <Sparkles size={12}/> Kho & Vật tư
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
            Lịch sử Kho
          </h1>
          <p className="mt-1 text-xs text-slate-500">Nhật ký nhập, xuất và điều chỉnh của toàn bộ hàng hóa.</p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <select value={type} onChange={e => setType(e.target.value)} className="filter-box">
            <option value="all">Tất cả giao dịch</option>
            <option value="in">Nhập kho</option>
            <option value="out">Xuất kho</option>
            <option value="adjust">Điều chỉnh</option>
          </select>

          <div className="relative sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã hoặc tên hàng..." className="search-box"/>
          </div>
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
              <Warehouse size={16} className="text-blue-600"/>
              <b className="text-sm text-slate-800">Sổ cái kho</b>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              Hiển thị {filtered.length}/{ledger.length} giao dịch
            </p>
          </div>

          <button onClick={fetchStock} disabled={loading} className="refresh-btn">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/>
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>

        <div className="p-2">
          <DataTable columns={columns} data={filtered} loading={loading}/>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
          <ShieldCheck size={17}/>
        </div>
        <div>
          <p className="text-xs font-black text-slate-700">Sổ kho Append-only</p>
          <p className="mt-1 text-[10px] leading-5 text-slate-500">
            Các giao dịch kho được lưu thành lịch sử riêng để phục vụ đối soát và kiểm toán. Không chỉnh sửa trực tiếp các bút toán đã phát sinh.
          </p>
        </div>
      </div>

      {detail && (
        <Modal wide close={() => setDetail(null)}>
          <div className="modal-top">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><PackageCheck size={19}/></div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-blue-100">Chi tiết giao dịch kho</p>
                <h3 className="truncate font-black text-white">{detail.item_name || 'Hàng hóa'}</h3>
              </div>
            </div>
            <button onClick={() => setDetail(null)} className="close-btn"><X size={18}/></button>
          </div>

          <div className="p-5">
            <div className="mb-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Số lượng biến động</p>
                  <p className={`mt-1 text-2xl font-black ${signedQty(detail) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {signedQty(detail) > 0 ? '+' : ''}{number(signedQty(detail))}
                  </p>
                </div>
                {detail.type === 'in'
                  ? <div className="big-icon bg-emerald-50 text-emerald-600"><ArrowDownToLine size={24}/></div>
                  : detail.type === 'out'
                    ? <div className="big-icon bg-red-50 text-red-500"><ArrowUpFromLine size={24}/></div>
                    : <div className="big-icon bg-blue-50 text-blue-600"><RefreshCw size={24}/></div>
                }
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Info icon={Hash} title="Mã hàng" value={detail.item_code || '—'}/>
              <Info icon={Activity} title="Loại giao dịch" value={detail.type === 'in' ? 'Nhập kho' : detail.type === 'out' ? 'Xuất kho' : 'Điều chỉnh'}/>
              <Info icon={Link2} title="Nguồn gốc" value={source(detail)}/>
              <Info icon={Clock3} title="Thời gian" value={detail.created_at ? new Date(detail.created_at).toLocaleString('vi-VN') : '—'}/>
              {detail.batch_no && <Info icon={PackageCheck} title="Số lô" value={detail.batch_no}/>}
              {detail.unit_cost !== undefined && detail.unit_cost !== null && <Info icon={FileText} title="Đơn giá" value={money(detail.unit_cost)}/>}
            </div>

            {detail.note && (
              <div className="mt-4">
                <p className="mb-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400">Ghi chú</p>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs leading-5 text-slate-600">{detail.note}</div>
              </div>
            )}

            <button onClick={() => setDetail(null)} className="mt-5 h-10 w-full rounded-xl bg-slate-900 text-xs font-bold text-white transition hover:bg-blue-600">
              Đóng
            </button>
          </div>
        </Modal>
      )}

      {popup && (
        <Modal close={() => setPopup(null)}>
          <div className="p-6 text-center">
            {popup.type === 'success'
              ? <div className="popup-icon bg-emerald-50 text-emerald-500"><CheckCircle2 size={30}/></div>
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
        .search-box,.filter-box{height:40px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;font-size:12px;font-weight:600;color:#475569;outline:none;transition:.2s}
        .search-box{width:100%;padding:0 12px 0 34px}.filter-box{padding:0 32px 0 12px}
        .search-box:focus,.filter-box:focus{border-color:#93c5fd;box-shadow:0 0 0 3px #dbeafe}
        .type-badge{display:flex;width:max-content;align-items:center;gap:5px;border-radius:8px;padding:5px 8px;font-size:10px;font-weight:800;white-space:nowrap}
        .action-btn{display:flex;height:34px;width:34px;align-items:center;justify-content:center;border-radius:10px;transition:.2s}.action-btn:hover{transform:scale(1.08)}
        .refresh-btn{display:flex;height:34px;align-items:center;gap:6px;border-radius:10px;background:#f8fafc;padding:0 11px;font-size:10px;font-weight:800;color:#475569;transition:.2s}.refresh-btn:hover{background:#eff6ff;color:#2563eb}
        .modal-bg{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.62);padding:12px;backdrop-filter:blur(7px)}
        .modal-box{width:100%;overflow:hidden;border-radius:24px;background:#fff;box-shadow:0 30px 90px rgba(15,23,42,.35);animation:modalIn .25s cubic-bezier(.16,1,.3,1)}
        .modal-top{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(110deg,#2563eb,#4f46e5,#6366f1);padding:17px 20px}
        .close-btn{border-radius:12px;background:rgba(255,255,255,.1);padding:8px;color:rgba(255,255,255,.8);transition:.2s}.close-btn:hover{transform:rotate(90deg);background:rgba(255,255,255,.2)}
        .big-icon{display:flex;height:52px;width:52px;align-items:center;justify-content:center;border-radius:17px}
        .popup-icon{margin:auto;display:flex;height:64px;width:64px;align-items:center;justify-content:center;border-radius:22px;animation:modalIn .35s ease-out}
        @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      `}</style>
    </div>
  );
}

function Modal({children,close,wide=false}) {
  return (
    <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && close?.()}>
      <div className={`modal-box ${wide ? 'max-w-[620px]' : 'max-w-[410px]'}`}>{children}</div>
    </div>
  );
}

function Info({icon:Icon,title,value}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><Icon size={15}/></div>
      <div className="min-w-0"><p className="text-[9px] font-semibold text-slate-400">{title}</p><p className="truncate text-xs font-black text-slate-700">{value}</p></div>
    </div>
  );
}