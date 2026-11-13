import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
  ShieldAlert, CheckCircle2, AlertTriangle, TrendingUp, Factory,
  Wallet, HandCoins, Target, Sparkles, ChevronRight, RefreshCw,
  Users, Receipt, Boxes, Warehouse, ShoppingCart, BrainCircuit,
  Megaphone, Gauge, CalendarDays, ArrowUpRight, Activity
} from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [user] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  });
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const loadData = async (selectedPeriod, manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get(`/dashboard?period=${selectedPeriod}`);
      setData(res.data.data);
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;

    const timer = setTimeout(() => {
      if (!active) return;

      api.get(`/dashboard?period=${period}`)
        .then(res => {
          if (active) setData(res.data.data);
        })
        .catch(console.error)
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [period]);

  const formatVND = amount => Math.round(Number(amount) || 0).toLocaleString('vi-VN');
  const number = value => Number(value) || 0;

  if (loading || !data) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-5 h-16 w-16">
            <div className="absolute inset-0 rounded-2xl bg-blue-500/20 animate-ping" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-200">
              <Sparkles className="animate-pulse text-white" size={27} />
            </div>
          </div>
          <p className="text-sm font-bold text-slate-700">Đang đồng bộ Dashboard</p>
          <p className="mt-1 text-xs text-slate-400">Đang lấy dữ liệu mới nhất từ hệ thống...</p>
        </div>
      </div>
    );
  }

  const isCEO = data.type === 'giam_doc';
  const isAccountant = data.type === 'ke_toan';
  const isLeader = data.type === 'to_truong';

  const periodLabels = {
    day: 'Hôm nay',
    week: 'Tuần này',
    month: 'Tháng này',
    quarter: 'Quý này',
    year: 'Năm nay'
  };

  const stats = [
    {
      title: isCEO ? 'Doanh thu thực tế' : isAccountant ? 'Tiền đã thu' : 'Lương thực nhận',
      value: isCEO ? formatVND(data.revenue) : isAccountant ? formatVND(data.collected) : formatVND(data.my_salary),
      unit: 'VNĐ',
      icon: TrendingUp,
      gradient: 'from-blue-500 to-blue-600',
      soft: 'bg-blue-50 text-blue-600',
      detail: isCEO ? 'Doanh thu trong kỳ' : isAccountant ? 'Khoản tiền đã thu' : 'Thu nhập kỳ hiện tại'
    },
    {
      title: isCEO ? 'Sản lượng hoàn thành' : 'Công việc',
      value: isCEO ? formatVND(data.production) : isLeader ? number(data.team_tasks?.done) : number(data.my_todo_tasks),
      unit: isCEO ? 'm²' : 'việc',
      icon: Factory,
      gradient: 'from-violet-500 to-indigo-600',
      soft: 'bg-violet-50 text-violet-600',
      detail: isCEO ? 'Sản lượng thực tế' : isLeader ? 'Công việc đội đã hoàn thành' : 'Công việc hiện tại'
    },
    {
      title: isCEO ? 'Tiền mặt khả dụng' : 'Tiền đã chi',
      value: isCEO ? formatVND(data.cash) : isAccountant ? formatVND(data.spent) : '0',
      unit: 'VNĐ',
      icon: Wallet,
      gradient: 'from-emerald-500 to-teal-600',
      soft: 'bg-emerald-50 text-emerald-600',
      detail: isCEO ? 'Nguồn tiền hiện khả dụng' : 'Tổng chi trong kỳ'
    },
    {
      title: isCEO ? 'Công nợ phải thu' : 'Công nợ',
      value: isCEO ? formatVND(data.debt) : isAccountant ? formatVND(data.receivable) : '0',
      unit: 'VNĐ',
      icon: HandCoins,
      gradient: 'from-amber-500 to-orange-500',
      soft: 'bg-amber-50 text-amber-600',
      detail: 'Theo dữ liệu đơn hàng'
    },
    {
      title: 'KPI nhân viên',
      value: `${number(data.kpi)}%`,
      unit: 'Đánh giá chung',
      icon: Target,
      gradient: 'from-cyan-500 to-blue-500',
      soft: 'bg-cyan-50 text-cyan-600',
      detail: 'Hiệu suất kỳ hiện tại'
    },
    {
      title: 'Mục tiêu Kaizen',
      value: `${number(data.kaizen)}%`,
      unit: 'Mục tiêu 3%',
      icon: Sparkles,
      gradient: 'from-fuchsia-500 to-purple-600',
      soft: 'bg-fuchsia-50 text-fuchsia-600',
      detail: 'Cải tiến chi phí'
    }
  ];

  const modules = [
    { title: 'Nhân sự – KPI – Lương', desc: 'Hồ sơ, chấm công, giao việc, KPI và bảng lương.', path: '/users', icon: Users, soft: 'bg-blue-50 text-blue-600' },
    { title: 'Kế toán – Tài chính', desc: 'Thu chi, công nợ, dòng tiền, tài sản và đối soát.', path: '/costs', icon: Receipt, soft: 'bg-emerald-50 text-emerald-600' },
    { title: 'Sản xuất – QC – Bảo trì', desc: 'Theo dõi sản xuất, tồn kho, chất lượng và bảo trì.', path: '/stock', icon: Boxes, soft: 'bg-violet-50 text-violet-600' },
    { title: 'Mua hàng – Kho', desc: 'Nhà cung cấp, nguyên liệu, tồn kho và giao nhận.', path: '/items', icon: Warehouse, soft: 'bg-orange-50 text-orange-600' },
    { title: 'Kinh doanh – CRM', desc: 'Khách hàng, đơn hàng, doanh thu và thanh toán.', path: '/orders', icon: ShoppingCart, soft: 'bg-cyan-50 text-cyan-600' },
    { title: 'Điều hành – KPI', desc: 'Tổng quan doanh nghiệp, KPI và cảnh báo vận hành.', path: '/', icon: Gauge, soft: 'bg-indigo-50 text-indigo-600' },
    { title: 'Marketing', desc: 'Chiến dịch, ngân sách và hiệu quả tiếp thị.', path: '/marketing', icon: Megaphone, soft: 'bg-pink-50 text-pink-600' },
    { title: 'Trung tâm AI Agent', desc: 'Quy trình, tri thức và hỗ trợ điều hành bằng AI.', path: '/sop', icon: BrainCircuit, soft: 'bg-purple-50 text-purple-600' }
  ];

  const kaizen = number(data.kaizen);
  const kaizenProgress = Math.max(0, Math.min((kaizen / 3) * 100, 100));
  const lowStockCount = Array.isArray(data.low_stock_items) ? data.low_stock_items.length : 0;
  const pendingCount = number(data.pending_orders);

  return (
    <div className="mx-auto w-full max-w-[1600px] animate-[dashboardIn_.45s_ease-out]">

      {/* TOP */}
      <section className="relative mb-6 overflow-hidden rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-[0_10px_40px_rgba(15,23,42,.05)] md:p-6">
        <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="pointer-events-none absolute right-[20%] top-0 h-32 w-32 rounded-full bg-indigo-100/50 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Dữ liệu trực tiếp
              </span>
              <span className="text-[11px] font-medium text-slate-400">{user.role?.toUpperCase()}</span>
            </div>

            <h1 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">
              Tổng quan doanh nghiệp
            </h1>

            <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-slate-500">
              Theo dõi nhanh tình hình tài chính, sản xuất, KPI và các cảnh báo cần xử lý.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => loadData(period, true)}
              disabled={refreshing}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Làm mới
            </button>

            <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 shadow-sm">
              <CalendarDays size={16} className="text-blue-600" />
              <select value={period} onChange={e => setPeriod(e.target.value)} className="cursor-pointer bg-transparent pr-1 text-xs font-bold text-slate-700 outline-none">
                <option value="day">Hôm nay</option>
                <option value="week">Tuần này</option>
                <option value="month">Tháng này</option>
                <option value="quarter">Quý này</option>
                <option value="year">Năm nay</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* KPI */}
      <section className="mb-7">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Chỉ số vận hành</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">Dữ liệu {periodLabels[period]?.toLowerCase()}</p>
          </div>
          <div className="hidden items-center gap-1.5 text-[10px] font-semibold text-slate-400 sm:flex">
            <Activity size={13} className="text-emerald-500" />
            Đã đồng bộ
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;

            return (
              <article
                key={stat.title}
                style={{ animationDelay: `${index * 55}ms` }}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,.035)] transition-all duration-300 animate-[cardIn_.45s_ease-out_both] hover:-translate-y-1 hover:border-blue-100 hover:shadow-[0_15px_35px_rgba(15,23,42,.08)]"
              >
                <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${stat.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

                <div className="mb-5 flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.soft} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon size={19} />
                  </div>
                  <ArrowUpRight size={15} className="text-slate-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-500" />
                </div>

                <p className="text-[11px] font-semibold text-slate-500">{stat.title}</p>
                <p className="mt-1.5 truncate text-[21px] font-black tracking-tight text-slate-900">{stat.value}</p>
                <p className="mt-1 text-[10px] font-medium text-slate-400">{stat.unit}</p>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="truncate text-[10px] text-slate-400">{stat.detail}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ALERTS */}
      <section className="mb-7">
        <div className="mb-3">
          <h2 className="text-[15px] font-bold text-slate-900">Trung tâm cảnh báo AI</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">Phân loại nhanh các trạng thái cần chú ý</p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600"><CheckCircle2 size={21} /></div>
              <div>
                <p className="text-xs font-bold text-emerald-900">Trạng thái xanh</p>
                <p className="mt-1 text-[11px] text-emerald-700/70">Đạt và có bằng chứng xác minh</p>
              </div>
            </div>
          </div>

          <button onClick={() => navigate('/orders')} className="group relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/70 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><AlertTriangle size={21} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-amber-900">Cần xác minh</p>
                <p className="mt-1 text-[11px] text-amber-700/70">{pendingCount} đơn đang chờ xử lý</p>
              </div>
              <ChevronRight size={17} className="text-amber-400 transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          <button onClick={() => navigate('/stock')} className="group relative overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-br from-white to-red-50/70 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600"><ShieldAlert size={21} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-red-900">Cảnh báo tồn kho</p>
                <p className="mt-1 text-[11px] text-red-700/70">{lowStockCount} mặt hàng cần chú ý</p>
              </div>
              <ChevronRight size={17} className="text-red-400 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </div>

        <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-400">
          <ShieldAlert size={12} />
          AI hỗ trợ cảnh báo và phân tích, không tự phê duyệt giao dịch trọng yếu.
        </p>
      </section>

      {/* MODULES */}
      <section className="mb-7">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">Truy cập nhanh phân hệ</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">Đi đến các chức năng quản trị chính</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((module, index) => {
            const Icon = module.icon;

            return (
              <button
                key={module.title}
                onClick={() => navigate(module.path)}
                style={{ animationDelay: `${index * 40}ms` }}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-[0_3px_15px_rgba(15,23,42,.025)] transition-all duration-300 animate-[cardIn_.4s_ease-out_both] hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_12px_30px_rgba(15,23,42,.08)]"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${module.soft} transition-all duration-300 group-hover:scale-110`}>
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[12px] font-bold leading-5 text-slate-800 transition-colors group-hover:text-blue-600">{module.title}</h3>
                      <ChevronRight size={15} className="mt-0.5 shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-blue-500" />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[10.5px] leading-[17px] text-slate-400">{module.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* KAIZEN */}
      <section className="mb-4">
        <div className="relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white p-5 shadow-[0_5px_25px_rgba(15,23,42,.04)] md:p-6">
          <div className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-indigo-100/50 blur-3xl" />

          <div className="relative">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Sparkles size={16} /></div>
                  <h2 className="text-[15px] font-bold text-slate-900">Cải tiến 3% / tháng</h2>
                </div>
                <p className="max-w-3xl text-[11px] leading-5 text-slate-500">
                  Chi phí chuẩn hóa kỳ gốc → kỳ hiện tại → Kế toán xác minh → PDCA / 5 Whys → CEO phê duyệt.
                </p>
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <p className="text-2xl font-black text-indigo-600">{kaizen}%</p>
                <p className="text-[10px] font-semibold text-slate-400">Mục tiêu 3%</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-[10px] font-semibold">
                <span className="text-slate-400">Tiến độ cải tiến</span>
                <span className="text-indigo-600">{Math.round(kaizenProgress)}%</span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-all duration-1000 ease-out"
                  style={{ width: `${kaizenProgress}%` }}
                >
                  <div className="absolute inset-0 animate-[shine_2s_linear_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>
              </div>

              <p className="mt-3 text-[10px] leading-4 text-slate-400">
                Không ghi nhận tiết kiệm nếu việc cải tiến ảnh hưởng đến chất lượng hoặc an toàn.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="pb-2 pt-4 text-center text-[10px] font-medium text-slate-400">
        SUNNY AI FLEX 3D ERP · Hệ thống Điều hành Doanh nghiệp Toàn diện
      </footer>

      <style>{`
        @keyframes dashboardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cardIn{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes shine{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
      `}</style>
    </div>
  );
}