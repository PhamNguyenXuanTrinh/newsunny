import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import {
  Calculator, CheckCircle2, RefreshCw, WalletCards, Users,
  TrendingUp, ShieldCheck, CalendarDays, Sparkles,
  AlertTriangle, XCircle, Loader2, Banknote, Clock3
} from 'lucide-react';
import DataTable from '../components/DataTable';

const money = n => `${Math.round(Number(n || 0)).toLocaleString('vi-VN')} đ`;

export default function Payrolls() {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [popup, setPopup] = useState(null);
  const [confirmBox, setConfirmBox] = useState(null);

  const message = (type, title, text) => setPopup({ type, title, text });

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      setUserRole(currentUser.role || '');

      const res = await api.get(`/payrolls?period=${period}`);
      setPayrolls(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setPayrolls([]);
      message(
        'error',
        'Không tải được bảng lương',
        err.response?.data?.error || err.message
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchPayrolls(), 0);
    return () => clearTimeout(timer);
  }, [period]);

  const stats = useMemo(() => ({
    employees: payrolls.length,
    salary: payrolls.reduce((s, x) => s + Number(x.net_salary || 0), 0),
    kpi: payrolls.reduce((s, x) => s + Number(x.kpi_bonus || 0), 0),
    deduction: payrolls.reduce((s, x) => s + Number(x.bhxh_deduction || 0), 0),
    approved: payrolls.filter(x => ['approved', 'paid'].includes(x.status)).length
  }), [payrolls]);

  const periodName = useMemo(() => {
    if (!period) return '';
    const [year, month] = period.split('-');
    return `Tháng ${Number(month)}/${year}`;
  }, [period]);

  const askGenerateAll = () => setConfirmBox({
    type: 'generate-all',
    title: 'Tính lương toàn công ty?',
    text: `Hệ thống sẽ tính lại bảng lương của tất cả nhân viên trong ${periodName}.`
  });

  const askGenerateSingle = row => setConfirmBox({
    type: 'generate-single',
    title: 'Tính lại lương?',
    text: `Hệ thống sẽ tính lại lương ${periodName} cho ${row.full_name}.`,
    row
  });

  const askApprove = row => setConfirmBox({
    type: 'approve',
    title: 'Duyệt bảng lương?',
    text: `Xác nhận duyệt lương ${periodName} của ${row.full_name}.`,
    row
  });

  const executeAction = async () => {
    if (!confirmBox) return;
    const action = confirmBox;
    setConfirmBox(null);
    setProcessing(true);

    try {
      if (action.type === 'generate-all') {
        const res = await api.post('/payrolls/generate', { period });
        await fetchPayrolls();
        message(
          'success',
          'Tính lương thành công',
          res.data?.message || `Đã tính lương ${periodName} cho toàn công ty.`
        );
      }

      if (action.type === 'generate-single') {
        const res = await api.post('/payrolls/generate', {
          period,
          user_id: action.row.user_id
        });
        await fetchPayrolls();
        message(
          'success',
          'Đã tính lại lương',
          res.data?.message || `Đã cập nhật lương của ${action.row.full_name}.`
        );
      }

      if (action.type === 'approve') {
        await api.post(`/payrolls/${action.row.id}/approve`);
        await fetchPayrolls();
        message(
          'success',
          'Duyệt thành công',
          `Bảng lương của ${action.row.full_name} đã được duyệt.`
        );
      }
    } catch (err) {
      message(
        'error',
        'Thao tác thất bại',
        err.response?.data?.error || err.message
      );
    } finally {
      setProcessing(false);
    }
  };

  const columns = [
    {
      header: 'Nhân viên',
      accessor: 'full_name',
      render: r => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-black text-blue-600">
            {(r.full_name || '?').trim().charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="whitespace-nowrap text-sm font-bold text-slate-800">
              {r.full_name}
            </p>
            <p className="text-[10px] text-slate-400">ID #{r.user_id}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Kỳ lương',
      accessor: 'period',
      render: r => (
        <span className="whitespace-nowrap text-xs font-semibold text-slate-600">
          {r.period}
        </span>
      )
    },
    {
      header: 'Lương cơ bản',
      accessor: 'salary_base',
      render: r => <span className="whitespace-nowrap text-xs">{money(r.salary_base)}</span>
    },
    {
      header: 'Lương giờ',
      accessor: 'work_pay',
      render: r => <span className="whitespace-nowrap text-xs">{money(r.work_pay)}</span>
    },
    {
      header: 'Thưởng KPI',
      accessor: 'kpi_bonus',
      render: r => (
        <span className="whitespace-nowrap text-xs font-bold text-emerald-600">
          +{money(r.kpi_bonus)}
        </span>
      )
    },
    {
      header: 'BHXH',
      accessor: 'bhxh_deduction',
      render: r => (
        <span className="whitespace-nowrap text-xs font-semibold text-red-500">
          -{money(r.bhxh_deduction)}
        </span>
      )
    },
    {
      header: 'Thực lĩnh',
      accessor: 'net_salary',
      render: r => (
        <span className="whitespace-nowrap text-sm font-black text-blue-600">
          {money(r.net_salary)}
        </span>
      )
    },
    {
      header: 'Trạng thái',
      accessor: 'status',
      render: r => {
        const config = r.status === 'paid'
          ? ['Đã trả', 'bg-slate-100 text-slate-600']
          : r.status === 'approved'
            ? ['Đã duyệt', 'bg-emerald-50 text-emerald-700']
            : ['Chờ duyệt', 'bg-amber-50 text-amber-700'];

        return (
          <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-black ${config[1]}`}>
            {config[0]}
          </span>
        );
      }
    },
    {
      header: 'Thao tác',
      accessor: 'id',
      render: r => (
        <div className="flex items-center gap-1">
          {r.status === 'draft' && userRole === 'giam_doc' && (
            <button
              onClick={() => askApprove(r)}
              className="action-btn text-emerald-600 hover:bg-emerald-50"
              title="Duyệt lương"
            >
              <CheckCircle2 size={16} />
            </button>
          )}

          {userRole === 'ke_toan' && (
            <button
              onClick={() => askGenerateSingle(r)}
              className="action-btn text-blue-600 hover:bg-blue-50"
              title="Tính lại"
            >
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      )
    }
  ];

  const cards = [
    {
      label: 'Nhân viên',
      value: stats.employees,
      sub: `${stats.approved} bảng đã duyệt`,
      icon: Users,
      box: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'Tổng thực lĩnh',
      value: money(stats.salary),
      sub: periodName,
      icon: WalletCards,
      box: 'bg-indigo-50 text-indigo-600'
    },
    {
      label: 'Tổng thưởng KPI',
      value: money(stats.kpi),
      sub: 'Theo dữ liệu kỳ lương',
      icon: TrendingUp,
      box: 'bg-emerald-50 text-emerald-600'
    },
    {
      label: 'Khấu trừ BHXH',
      value: money(stats.deduction),
      sub: 'Tổng trong kỳ',
      icon: ShieldCheck,
      box: 'bg-rose-50 text-rose-600'
    }
  ];

  return (
    <div className="mx-auto max-w-[1600px] animate-[pageIn_.45s_ease-out]">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.16em] text-blue-600">
            <Sparkles size={12} /> Nhân sự & Vận hành
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Bảng lương nhân sự
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Quản lý, tính toán và phê duyệt thu nhập theo kỳ.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <CalendarDays
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="month"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="period-input"
            />
          </div>

          {['giam_doc', 'ke_toan'].includes(userRole) && (
            <button
              onClick={askGenerateAll}
              disabled={processing}
              className="main-btn disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing
                ? <Loader2 size={16} className="animate-spin" />
                : <Calculator size={16} />
              }
              Tính lương toàn công ty
            </button>
          )}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card, index) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              style={{ animationDelay: `${index * 70}ms` }}
              className="stat-card animate-[cardIn_.45s_ease-out_both]"
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.box}`}>
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
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Banknote size={16} className="text-blue-600" />
              <b className="text-sm text-slate-800">Chi tiết bảng lương</b>
            </div>
            <p className="mt-1 text-[10px] text-slate-400">
              {periodName} · {payrolls.length} nhân viên
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-semibold text-slate-500">
            <Clock3 size={13} />
            Dữ liệu theo kỳ đã chọn
          </div>
        </div>

        <div className="p-2">
          <DataTable columns={columns} data={payrolls} loading={loading} />
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
          <Calculator size={17} />
        </div>
        <div>
          <p className="text-xs font-black text-slate-700">Quy trình bảng lương</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Chọn kỳ lương → hệ thống tính từ dữ liệu Chấm công + KPI → Giám đốc duyệt bảng lương.
          </p>
        </div>
      </div>

      {confirmBox && (
        <Modal close={() => !processing && setConfirmBox(null)}>
          <div className="p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-amber-50 text-amber-500 animate-[pulseSoft_1.8s_ease-in-out_infinite]">
              {confirmBox.type === 'approve'
                ? <CheckCircle2 size={28} />
                : <Calculator size={28} />
              }
            </div>

            <h3 className="mt-4 text-lg font-black text-slate-900">
              {confirmBox.title}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">
              {confirmBox.text}
            </p>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmBox(null)}
                className="h-10 flex-1 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={executeAction}
                className="h-10 flex-1 rounded-xl bg-blue-600 text-xs font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </Modal>
      )}

      {popup && (
        <Modal close={() => setPopup(null)}>
          <div className="p-6 text-center">
            {popup.type === 'success' ? (
              <div className="popup-icon bg-emerald-50 text-emerald-500">
                <CheckCircle2 size={30} />
              </div>
            ) : popup.type === 'warning' ? (
              <div className="popup-icon bg-amber-50 text-amber-500">
                <AlertTriangle size={30} />
              </div>
            ) : (
              <div className="popup-icon bg-red-50 text-red-500">
                <XCircle size={30} />
              </div>
            )}

            <h3 className="mt-4 text-lg font-black text-slate-900">
              {popup.title}
            </h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {popup.text}
            </p>

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
        @keyframes pageIn{
          from{opacity:0;transform:translateY(12px)}
          to{opacity:1;transform:none}
        }
        @keyframes cardIn{
          from{opacity:0;transform:translateY(14px) scale(.97)}
          to{opacity:1;transform:none}
        }
        @keyframes modalIn{
          from{opacity:0;transform:translateY(18px) scale(.96)}
          to{opacity:1;transform:none}
        }
        @keyframes pulseSoft{
          50%{transform:scale(1.07)}
        }
        .stat-card{
          position:relative;display:flex;align-items:center;gap:12px;overflow:hidden;
          border:1px solid #e2e8f0;border-radius:20px;background:#fff;padding:16px;
          box-shadow:0 5px 20px rgba(15,23,42,.04);transition:.3s;
        }
        .stat-card:hover{
          transform:translateY(-4px);border-color:#dbeafe;
          box-shadow:0 18px 40px rgba(15,23,42,.09);
        }
        .shine{
          position:absolute;right:-25px;top:-25px;width:75px;height:75px;
          border-radius:999px;background:linear-gradient(135deg,rgba(59,130,246,.1),transparent);
          transition:.4s;
        }
        .stat-card:hover .shine{transform:scale(1.5)}
        .main-btn{
          display:flex;height:40px;align-items:center;justify-content:center;gap:7px;
          border-radius:12px;background:linear-gradient(100deg,#2563eb,#4f46e5);
          padding:0 17px;font-size:12px;font-weight:800;color:#fff;
          box-shadow:0 8px 22px rgba(37,99,235,.22);transition:.25s;
        }
        .main-btn:hover{
          transform:translateY(-2px);
          box-shadow:0 12px 28px rgba(37,99,235,.3);
        }
        .period-input{
          height:40px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;
          padding:0 12px 0 34px;font-size:12px;font-weight:700;color:#475569;
          outline:none;transition:.2s;
        }
        .period-input:focus{
          border-color:#93c5fd;
          box-shadow:0 0 0 3px #dbeafe;
        }
        .action-btn{
          display:flex;height:34px;width:34px;align-items:center;justify-content:center;
          border-radius:10px;transition:.2s;
        }
        .action-btn:hover{transform:scale(1.08)}
        .modal-bg{
          position:fixed;inset:0;z-index:100;display:flex;align-items:center;
          justify-content:center;background:rgba(15,23,42,.62);padding:12px;
          backdrop-filter:blur(7px);
        }
        .modal-box{
          width:100%;max-width:410px;overflow:hidden;border-radius:24px;background:#fff;
          box-shadow:0 30px 90px rgba(15,23,42,.35);
          animation:modalIn .25s cubic-bezier(.16,1,.3,1);
        }
        .popup-icon{
          margin:auto;display:flex;height:64px;width:64px;align-items:center;
          justify-content:center;border-radius:22px;animation:modalIn .35s ease-out;
        }
        @media(prefers-reduced-motion:reduce){
          *{animation:none!important;transition:none!important}
        }
      `}</style>
    </div>
  );
}

function Modal({ children, close }) {
  return (
    <div
      className="modal-bg"
      onMouseDown={e => e.target === e.currentTarget && close?.()}
    >
      <div className="modal-box">{children}</div>
    </div>
  );
}