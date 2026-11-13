import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import {
  Plus, X, Factory, CheckCircle2, AlertTriangle, XCircle,
  Timer, PackageCheck, Trash2, Activity, Sparkles, Send,
  Loader2, CalendarDays, Gauge
} from 'lucide-react';
import DataTable from '../components/DataTable';

const EMPTY = {
  day: new Date().toISOString().slice(0, 10),
  shift: 'morning',
  good_qty: 0,
  scrap_qty: 0,
  downtime_min: 0,
  qc_result: 'pass'
};

const num = n => Number(n || 0).toLocaleString('vi-VN', {
  maximumFractionDigits: 2
});

export default function ShiftReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [popup, setPopup] = useState(null);

  const message = (type, title, text) => setPopup({ type, title, text });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/shift-reports');
      setReports(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setReports([]);
      message('error', 'Không tải được báo cáo', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchReports(), 0);
    return () => clearTimeout(timer);
  }, []);

  const stats = useMemo(() => {
    const good = reports.reduce((s, x) => s + Number(x.good_qty || 0), 0);
    const scrap = reports.reduce((s, x) => s + Number(x.scrap_qty || 0), 0);
    const downtime = reports.reduce((s, x) => s + Number(x.downtime_min || 0), 0);
    const total = good + scrap;

    return {
      reports: reports.length,
      good,
      scrap,
      downtime,
      rate: total > 0 ? good / total * 100 : 0
    };
  }, [reports]);

  const openCreate = () => {
    setForm({ ...EMPTY, day: new Date().toISOString().slice(0, 10) });
    setModal(true);
  };

  const change = (key, value) => setForm(x => ({ ...x, [key]: value }));

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...form,
        good_qty: Number(form.good_qty || 0),
        scrap_qty: Number(form.scrap_qty || 0),
        downtime_min: Number(form.downtime_min || 0)
      };

      await api.post('/shift-reports', payload);
      setModal(false);
      await fetchReports();
      message('success', 'Báo cáo thành công', 'Dữ liệu ca sản xuất đã được ghi nhận vào hệ thống.');
    } catch (err) {
      message('error', 'Không thể gửi báo cáo', err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const shiftName = shift => ({
    morning: 'Ca sáng',
    afternoon: 'Ca chiều',
    night: 'Ca đêm'
  }[shift] || shift);

  const columns = [
    {
      header: 'Ngày',
      accessor: 'day',
      render: r => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <CalendarDays size={14} className="text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">
            {new Date(r.day).toLocaleDateString('vi-VN')}
          </span>
        </div>
      )
    },
    {
      header: 'Ca sản xuất',
      accessor: 'shift',
      render: r => (
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
          r.shift === 'morning'
            ? 'bg-amber-50 text-amber-700'
            : r.shift === 'afternoon'
              ? 'bg-blue-50 text-blue-700'
              : 'bg-indigo-50 text-indigo-700'
        }`}>
          {shiftName(r.shift)}
        </span>
      )
    },
    {
      header: 'Sản lượng đạt',
      accessor: 'good_qty',
      render: r => (
        <span className="whitespace-nowrap text-sm font-black text-emerald-600">
          {num(r.good_qty)} m²
        </span>
      )
    },
    {
      header: 'Phế phẩm',
      accessor: 'scrap_qty',
      render: r => (
        <span className="whitespace-nowrap text-xs font-bold text-red-500">
          {num(r.scrap_qty)} m²
        </span>
      )
    },
    {
      header: 'Dừng máy',
      accessor: 'downtime_min',
      render: r => (
        <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600">
          <Timer size={13} />
          {num(r.downtime_min)} phút
        </div>
      )
    },
    {
      header: 'QC',
      accessor: 'qc_result',
      render: r => r.qc_result === 'pass'
        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700"><CheckCircle2 size={12} /> Đạt</span>
        : <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black text-red-600"><XCircle size={12} /> Lỗi</span>
    },
    {
      header: 'Người báo cáo',
      accessor: 'creator_name',
      render: r => (
        <span className="whitespace-nowrap text-xs font-semibold text-slate-600">
          {r.creator_name || '—'}
        </span>
      )
    }
  ];

  const cards = [
    {
      label: 'Số báo cáo',
      value: stats.reports,
      sub: 'Tổng dữ liệu hiện có',
      icon: Factory,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'Sản lượng đạt',
      value: `${num(stats.good)} m²`,
      sub: 'Tổng sản lượng đạt chuẩn',
      icon: PackageCheck,
      color: 'bg-emerald-50 text-emerald-600'
    },
    {
      label: 'Phế phẩm',
      value: `${num(stats.scrap)} m²`,
      sub: 'Tổng sản lượng lỗi',
      icon: Trash2,
      color: 'bg-rose-50 text-rose-600'
    },
    {
      label: 'Tỷ lệ đạt',
      value: `${stats.rate.toFixed(1)}%`,
      sub: `${num(stats.downtime)} phút dừng máy`,
      icon: Gauge,
      color: 'bg-violet-50 text-violet-600'
    }
  ];

  return (
    <div className="mx-auto max-w-[1600px] animate-[pageIn_.45s_ease-out]">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.16em] text-blue-600">
            <Sparkles size={12} /> Sản xuất & Vận hành
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Báo cáo ca sản xuất</h1>
          <p className="mt-1 text-xs text-slate-500">Theo dõi sản lượng, phế phẩm, QC và thời gian dừng máy.</p>
        </div>

        <button onClick={openCreate} className="main-btn">
          <Plus size={17} /> Tạo báo cáo
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card, i) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              style={{ animationDelay: `${i * 70}ms` }}
              className="stat-card animate-[cardIn_.45s_ease-out_both]"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.color}`}>
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400">{card.label}</p>
                <p className="truncate text-lg font-black text-slate-900">{card.value}</p>
                <p className="truncate text-[9px] text-slate-400">{card.sub}</p>
              </div>
              <div className="shine" />
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.05)]">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-blue-600" />
              <b className="text-sm text-slate-800">Lịch sử báo cáo ca</b>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">{reports.length} báo cáo được ghi nhận</p>
          </div>

          <div className="hidden rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700 sm:block">
            Tỷ lệ đạt {stats.rate.toFixed(1)}%
          </div>
        </div>

        <div className="p-2">
          <DataTable columns={columns} data={reports} loading={loading} />
        </div>
      </div>

      {modal && (
        <Modal wide close={() => !saving && setModal(false)}>
          <div className="modal-top">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Factory size={19} />
              </div>
              <div>
                <h3 className="font-black text-white">Báo cáo ca mới</h3>
                <p className="text-[10px] text-blue-100">Ghi nhận kết quả sản xuất thực tế</p>
              </div>
            </div>

            <button
              onClick={() => setModal(false)}
              className="rounded-xl bg-white/10 p-2 text-white/80 transition hover:rotate-90 hover:bg-white/20"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ngày sản xuất *">
                <input
                  required
                  type="date"
                  value={form.day}
                  onChange={e => change('day', e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Ca sản xuất *">
                <select
                  value={form.shift}
                  onChange={e => change('shift', e.target.value)}
                  className="input"
                >
                  <option value="morning">Ca sáng</option>
                  <option value="afternoon">Ca chiều</option>
                  <option value="night">Ca đêm</option>
                </select>
              </Field>
            </div>

            <div className="my-5 h-px bg-slate-100" />

            <div className="grid grid-cols-2 gap-4">
              <Field label="Sản lượng đạt (m²) *">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.good_qty}
                  onChange={e => change('good_qty', e.target.value)}
                  className="input border-emerald-200 font-black text-emerald-600"
                />
              </Field>

              <Field label="Phế phẩm (m²)">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.scrap_qty}
                  onChange={e => change('scrap_qty', e.target.value)}
                  className="input border-red-200 font-black text-red-500"
                />
              </Field>

              <Field label="Dừng máy (phút)">
                <input
                  type="number"
                  min="0"
                  value={form.downtime_min}
                  onChange={e => change('downtime_min', e.target.value)}
                  className="input"
                />
              </Field>

              <Field label="Kết quả QC">
                <select
                  value={form.qc_result}
                  onChange={e => change('qc_result', e.target.value)}
                  className="input"
                >
                  <option value="pass">✓ Đạt</option>
                  <option value="fail">✕ Lỗi</option>
                </select>
              </Field>
            </div>

            <div className={`mt-5 flex items-center gap-3 rounded-2xl p-4 ${
              form.qc_result === 'pass'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}>
              {form.qc_result === 'pass'
                ? <CheckCircle2 size={20} />
                : <AlertTriangle size={20} />
              }
              <div>
                <p className="text-xs font-black">
                  {form.qc_result === 'pass' ? 'QC đạt tiêu chuẩn' : 'QC phát hiện lỗi'}
                </p>
                <p className="mt-0.5 text-[10px] opacity-70">
                  Kết quả này sẽ được lưu cùng báo cáo ca.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="h-10 rounded-xl bg-slate-100 px-5 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Hủy
              </button>

              <button disabled={saving} className="main-btn disabled:opacity-50">
                {saving
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Send size={15} />
                }
                Gửi báo cáo
              </button>
            </div>
          </form>
        </Modal>
      )}

      {popup && (
        <Modal close={() => setPopup(null)}>
          <div className="p-6 text-center">
            {popup.type === 'success' ? (
              <div className="popup-icon bg-emerald-50 text-emerald-500">
                <CheckCircle2 size={30} />
              </div>
            ) : (
              <div className="popup-icon bg-red-50 text-red-500">
                <XCircle size={30} />
              </div>
            )}

            <h3 className="mt-4 text-lg font-black text-slate-900">{popup.title}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">{popup.text}</p>

            <button
              onClick={() => setPopup(null)}
              className="mt-5 h-10 w-full rounded-xl bg-slate-900 text-xs font-bold text-white transition hover:bg-blue-600"
            >
              Đã hiểu
            </button>
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
        .input{height:42px;width:100%;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:0 12px;font-size:12px;outline:none;transition:.2s}
        .input:focus{border-color:#93c5fd;background:#fff;box-shadow:0 0 0 3px #dbeafe}
        .modal-bg{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.62);padding:12px;backdrop-filter:blur(7px)}
        .modal-box{width:100%;overflow:hidden;border-radius:24px;background:#fff;box-shadow:0 30px 90px rgba(15,23,42,.35);animation:modalIn .25s cubic-bezier(.16,1,.3,1)}
        .modal-top{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(110deg,#2563eb,#4f46e5,#6366f1);padding:17px 20px;color:#fff}
        .popup-icon{margin:auto;display:flex;height:64px;width:64px;align-items:center;justify-content:center;border-radius:22px;animation:modalIn .35s ease-out}
        @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      `}</style>
    </div>
  );
}

function Modal({ children, close, wide = false }) {
  return (
    <div
      className="modal-bg"
      onMouseDown={e => e.target === e.currentTarget && close?.()}
    >
      <div className={`modal-box ${wide ? 'max-w-[620px]' : 'max-w-[410px]'}`}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold text-slate-500">{label}</span>
      {children}
    </label>
  );
}