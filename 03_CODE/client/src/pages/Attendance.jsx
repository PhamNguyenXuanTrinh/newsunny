import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import {
  Clock, LogIn, LogOut, CalendarDays, CheckCircle2,
  Timer, Moon, Sun, Sunrise, History,
  RefreshCw, BriefcaseBusiness, TrendingUp, AlertTriangle, Loader2
} from 'lucide-react';
import DataTable from '../components/DataTable';

export default function Attendance() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todayRecord, setTodayRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const applyAttendanceData = data => {
    const rows = Array.isArray(data) ? data : [];
    setHistory(rows);

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const todayRec = rows.find(item => {
      if (!item.date) return false;
      return String(item.date).slice(0, 10) === todayStr;
    });

    setTodayRecord(todayRec || null);
  };

  const fetchData = async (manual = false) => {
    if (manual) setRefreshing(true);

    try {
      const res = await api.get(`/attendance?period=${period}`);
      applyAttendanceData(res.data.data);
    } catch (err) {
      console.error('Attendance error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;

    const timer = setTimeout(() => {
      api.get(`/attendance?period=${period}`)
        .then(res => {
          if (!active) return;

          const rows = Array.isArray(res.data.data) ? res.data.data : [];
          setHistory(rows);

          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

          const todayRec = rows.find(item => item.date && String(item.date).slice(0, 10) === todayStr);
          setTodayRecord(todayRec || null);
        })
        .catch(err => console.error('Attendance error:', err))
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [period]);

  const getCurrentShift = () => {
    const hour = currentTime.getHours();

    if (hour >= 6 && hour < 12) {
      return {
        id: 'morning',
        label: 'Ca Sáng',
        short: '06:00 – 12:00',
        icon: Sunrise,
        gradient: 'from-amber-500 to-orange-500',
        soft: 'bg-amber-50 text-amber-600'
      };
    }

    if (hour >= 12 && hour < 18) {
      return {
        id: 'afternoon',
        label: 'Ca Chiều',
        short: '12:00 – 18:00',
        icon: Sun,
        gradient: 'from-orange-500 to-red-500',
        soft: 'bg-orange-50 text-orange-600'
      };
    }

    if (hour >= 18 && hour < 22) {
      return {
        id: 'office',
        label: 'Hành chính / Tăng ca',
        short: '18:00 – 22:00',
        icon: BriefcaseBusiness,
        gradient: 'from-blue-600 to-indigo-600',
        soft: 'bg-blue-50 text-blue-600'
      };
    }

    return {
      id: 'night',
      label: 'Ca Đêm',
      short: '22:00 – 06:00',
      icon: Moon,
      gradient: 'from-slate-700 to-slate-900',
      soft: 'bg-slate-100 text-slate-700'
    };
  };

  const activeShift = getCurrentShift();
  const ShiftIcon = activeShift.icon;

  const handleCheckIn = async shift => {
    if (actionLoading) return;

    setActionLoading(true);

    try {
      await api.post('/attendance/check-in', { shift });
      await fetchData();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (actionLoading) return;

    setActionLoading(true);

    try {
      await api.post('/attendance/check-out');
      await fetchData();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalDays = history.length;

    const totalHours = history.reduce(
      (sum, item) => sum + (Number(item.work_hours) || 0),
      0
    );

    const totalOT = history.reduce(
      (sum, item) => sum + (Number(item.ot_hours) || 0),
      0
    );

    const lateDays = history.filter(
      item => Number(item.late_minutes) > 0
    ).length;

    return { totalDays, totalHours, totalOT, lateDays };
  }, [history]);

  const getShiftLabel = shift => {
    const shifts = {
      office: 'Hành chính',
      morning: 'Ca Sáng',
      afternoon: 'Ca Chiều',
      night: 'Ca Đêm'
    };

    return shifts[shift] || shift || '-';
  };

  const formatTime = value => {
    if (!value) return '-';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const columns = [
    {
      header: 'Ngày',
      accessor: 'date',
      render: r => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <CalendarDays size={14} />
          </div>

          <span className="whitespace-nowrap font-semibold text-slate-700">
            {r.date ? new Date(r.date).toLocaleDateString('vi-VN') : '-'}
          </span>
        </div>
      )
    },
    {
      header: 'Ca làm việc',
      accessor: 'shift',
      render: r => (
        <span className="inline-flex whitespace-nowrap rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-600">
          {getShiftLabel(r.shift)}
        </span>
      )
    },
    {
      header: 'Giờ vào',
      accessor: 'check_in',
      render: r => (
        <span className="whitespace-nowrap font-medium text-emerald-600">
          {formatTime(r.check_in)}
        </span>
      )
    },
    {
      header: 'Giờ ra',
      accessor: 'check_out',
      render: r => (
        <span className={`whitespace-nowrap font-medium ${r.check_out ? 'text-red-500' : 'text-slate-300'}`}>
          {formatTime(r.check_out)}
        </span>
      )
    },
    {
      header: 'Giờ làm',
      accessor: 'work_hours',
      render: r => (
        <span className="whitespace-nowrap font-bold text-blue-600">
          {r.work_hours ? `${r.work_hours} h` : '-'}
        </span>
      )
    },
    {
      header: 'Tăng ca',
      accessor: 'ot_hours',
      render: r => Number(r.ot_hours) > 0 ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">
          <TrendingUp size={11} />
          {r.ot_hours} h
        </span>
      ) : (
        <span className="text-slate-300">-</span>
      )
    },
    {
      header: 'Đi muộn',
      accessor: 'late_minutes',
      render: r => Number(r.late_minutes) > 0 ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-red-50 px-2 py-1 text-[10px] font-bold text-red-500">
          <AlertTriangle size={11} />
          {r.late_minutes} phút
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
          <CheckCircle2 size={12} />
          Đúng giờ
        </span>
      )
    }
  ];

  const statCards = [
    {
      title: 'Ngày công',
      value: stats.totalDays,
      unit: 'ngày',
      icon: CalendarDays,
      style: 'bg-blue-50 text-blue-600'
    },
    {
      title: 'Tổng giờ làm',
      value: Number(stats.totalHours.toFixed(2)),
      unit: 'giờ',
      icon: Clock,
      style: 'bg-indigo-50 text-indigo-600'
    },
    {
      title: 'Tăng ca',
      value: Number(stats.totalOT.toFixed(2)),
      unit: 'giờ',
      icon: TrendingUp,
      style: 'bg-emerald-50 text-emerald-600'
    },
    {
      title: 'Đi muộn',
      value: stats.lateDays,
      unit: 'ngày',
      icon: AlertTriangle,
      style: stats.lateDays > 0
        ? 'bg-red-50 text-red-500'
        : 'bg-emerald-50 text-emerald-600'
    }
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] animate-[attendanceIn_.4s_ease-out]">

      {/* TITLE */}
      <section className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-blue-600">
            <Clock size={13} />
            Nhân sự & vận hành
          </div>

          <h1 className="text-xl font-black tracking-tight text-slate-900 md:text-2xl">
            Chấm công
          </h1>

          <p className="mt-1 text-[12px] text-slate-500">
            Theo dõi giờ vào, giờ ra, thời gian làm việc và tăng ca.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[11px] font-semibold text-slate-500 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={refreshing ? 'animate-spin' : ''}
            />
            Làm mới
          </button>

          <div className="relative">
            <CalendarDays
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"
            />

            <input
              type="month"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[11px] font-bold text-slate-700 shadow-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </section>

      {/* CLOCK + ATTENDANCE */}
      <section className="relative mb-6 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_8px_35px_rgba(15,23,42,.05)]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-indigo-100/50 blur-3xl" />

        <div className="relative grid min-h-[260px] grid-cols-1 lg:grid-cols-[1.25fr_.75fr]">

          {/* CLOCK */}
          <div className="flex flex-col justify-center border-b border-slate-100 p-6 md:p-8 lg:border-b-0 lg:border-r">
            <div className="mb-5 flex items-center gap-2">
              <span className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-600">
                Thời gian thực
              </span>
            </div>

            <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500">
              <CalendarDays size={16} className="text-blue-500" />
              <span>
                {currentTime.toLocaleDateString('vi-VN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-200">
                <Clock size={25} />
              </div>

              <div className="tabular-nums text-[38px] font-black tracking-[-.04em] text-slate-900 sm:text-[48px] md:text-[56px]">
                {currentTime.toLocaleTimeString('vi-VN')}
              </div>
            </div>

            <div className="mt-5 flex w-max items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${activeShift.soft}`}>
                <ShiftIcon size={14} />
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-700">
                  {activeShift.label}
                </p>

                <p className="text-[9px] text-slate-400">
                  {activeShift.short}
                </p>
              </div>
            </div>
          </div>

          {/* ACTION */}
          <div className="flex items-center p-6 md:p-8">
            <div className="w-full">

              {!todayRecord ? (
                <div className="animate-[actionIn_.35s_ease-out]">
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${activeShift.soft}`}>
                    <ShiftIcon size={21} />
                  </div>

                  <p className="text-[11px] font-medium text-slate-400">
                    Hệ thống nhận diện ca hiện tại
                  </p>

                  <h3 className="mt-1 text-lg font-black text-slate-900">
                    {activeShift.label}
                  </h3>

                  <p className="mt-1 text-[11px] text-slate-400">
                    {activeShift.short}
                  </p>

                  <button
                    onClick={() => handleCheckIn(activeShift.id)}
                    disabled={actionLoading}
                    className={`group mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${activeShift.gradient} px-5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {actionLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <LogIn
                        size={18}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    )}

                    {actionLoading
                      ? 'Đang Check-in...'
                      : `Check-in ${activeShift.label}`}
                  </button>
                </div>
              ) : !todayRecord.check_out ? (
                <div className="animate-[actionIn_.35s_ease-out]">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Timer size={22} className="animate-pulse" />
                  </div>

                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                      Đang làm việc
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900">
                    {getShiftLabel(todayRecord.shift)}
                  </h3>

                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Check-in lúc{' '}
                    <span className="font-bold text-blue-600">
                      {formatTime(todayRecord.check_in)}
                    </span>
                  </p>

                  <button
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="group mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-5 text-sm font-bold text-white shadow-lg shadow-red-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actionLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <LogOut
                        size={18}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    )}

                    {actionLoading
                      ? 'Đang Check-out...'
                      : 'Check-out · Kết thúc ca'}
                  </button>
                </div>
              ) : (
                <div className="animate-[actionIn_.35s_ease-out]">
                  <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <div className="absolute inset-0 animate-ping rounded-2xl bg-emerald-400/10" />
                    <CheckCircle2 size={25} className="relative" />
                  </div>

                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Hoàn thành
                  </p>

                  <h3 className="mt-1 text-lg font-black text-slate-900">
                    Đã hoàn thành ca hôm nay
                  </h3>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[9px] font-semibold text-slate-400">
                        Giờ làm
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-800">
                        {todayRecord.work_hours || 0} h
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[9px] font-semibold text-slate-400">
                        Giờ ra
                      </p>

                      <p className="mt-1 text-sm font-black text-slate-800">
                        {formatTime(todayRecord.check_out)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              style={{ animationDelay: `${index * 60}ms` }}
              className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,.035)] transition-all duration-300 animate-[statIn_.4s_ease-out_both] hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(15,23,42,.07)]"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.style} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon size={18} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                    {item.title}
                  </p>

                  <div className="mt-0.5 flex items-end gap-1">
                    <span className="text-xl font-black tracking-tight text-slate-900">
                      {item.value}
                    </span>

                    <span className="mb-0.5 text-[9px] font-semibold text-slate-400">
                      {item.unit}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* HISTORY */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_5px_25px_rgba(15,23,42,.04)]">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <History size={16} />
            </div>

            <div>
              <h2 className="text-[13px] font-bold text-slate-900">
                Lịch sử chấm công
              </h2>

              <p className="mt-0.5 text-[10px] text-slate-400">
                {history.length} bản ghi trong tháng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Dữ liệu hệ thống
          </div>
        </div>

        <div className="p-1 sm:p-2">
          <DataTable
            columns={columns}
            data={history}
            loading={loading}
          />
        </div>
      </section>

      <style>{`
        @keyframes attendanceIn{
          from{opacity:0;transform:translateY(8px)}
          to{opacity:1;transform:translateY(0)}
        }

        @keyframes actionIn{
          from{opacity:0;transform:translateX(10px)}
          to{opacity:1;transform:translateX(0)}
        }

        @keyframes statIn{
          from{opacity:0;transform:translateY(10px)}
          to{opacity:1;transform:translateY(0)}
        }

        @media(prefers-reduced-motion:reduce){
          *,*::before,*::after{
            animation-duration:.01ms!important;
            animation-iteration-count:1!important;
            transition-duration:.01ms!important;
          }
        }
      `}</style>
    </div>
  );
}