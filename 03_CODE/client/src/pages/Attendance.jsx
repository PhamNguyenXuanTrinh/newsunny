import { useEffect, useState } from 'react';
import api from '../api';
import { Clock, LogIn, LogOut, Calendar, CheckCircle } from 'lucide-react';
import DataTable from '../components/DataTable';

export default function Attendance() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todayRecord, setTodayRecord] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Mặc định lấy tháng hiện tại (YYYY-MM)
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); 

  // Đồng hồ thời gian thực
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance?period=${period}`);
      const data = res.data.data;
      setHistory(data);

      // Tìm bản ghi của ngày hôm nay
      const todayStr = new Date().toISOString().split('T')[0];
      const todayRec = data.find(item => item.date.startsWith(todayStr));
      setTodayRecord(todayRec || null);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { fetchData(); }, 0);
    return () => clearTimeout(timer);
  }, [period]);

  // HÀM TỰ ĐỘNG NHẬN DIỆN CA LÀM VIỆC THEO GIỜ
  const getCurrentShift = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 12) return { id: 'morning', label: 'Ca Sáng', color: 'bg-amber-500 hover:bg-amber-600' };
    if (hour >= 12 && hour < 18) return { id: 'afternoon', label: 'Ca Chiều', color: 'bg-orange-500 hover:bg-orange-600' };
    if (hour >= 18 && hour < 22) return { id: 'office', label: 'Hành chính / Tăng ca', color: 'bg-blue-600 hover:bg-blue-700' };
    return { id: 'night', label: 'Ca Đêm', color: 'bg-slate-700 hover:bg-slate-800' };
  };

  const activeShift = getCurrentShift();

  const handleCheckIn = async (shift) => {
    try {
      await api.post('/attendance/check-in', { shift });
      alert('Check-in thành công!');
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCheckOut = async () => {
    try {
      await api.post('/attendance/check-out');
      alert('Check-out thành công!');
      fetchData();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const columns = [
    { header: 'Ngày', accessor: 'date', render: (r) => new Date(r.date).toLocaleDateString('vi-VN') },
    { 
      header: 'Ca làm việc', 
      accessor: 'shift', 
      render: (r) => {
        const shifts = { office: 'Hành chính', morning: 'Ca Sáng', afternoon: 'Ca Chiều', night: 'Ca Đêm' };
        return <span className="font-semibold text-slate-700">{shifts[r.shift] || r.shift}</span>;
      } 
    },
    { header: 'Giờ vào', accessor: 'check_in', render: (r) => r.check_in ? new Date(r.check_in).toLocaleTimeString('vi-VN') : '-' },
    { header: 'Giờ ra', accessor: 'check_out', render: (r) => r.check_out ? new Date(r.check_out).toLocaleTimeString('vi-VN') : '-' },
    { header: 'Giờ làm việc', accessor: 'work_hours', render: (r) => <span className="text-blue-600 font-bold">{r.work_hours ? `${r.work_hours} h` : '-'}</span> },
    { header: 'Tăng ca (OT)', accessor: 'ot_hours', render: (r) => r.ot_hours > 0 ? <span className="text-emerald-600 font-bold">{r.ot_hours} h</span> : '-' },
    { header: 'Đi muộn', accessor: 'late_minutes', render: (r) => r.late_minutes > 0 ? <span className="text-red-500 font-bold">{r.late_minutes} phút</span> : '-' },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chấm công</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý giờ vào, giờ ra và lịch sử làm việc.</p>
        </div>
        <input 
          type="month" 
          value={period} 
          onChange={e => setPeriod(e.target.value)} 
          className="px-3 py-2 border rounded-lg bg-white shadow-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
        />
      </div>

      {/* KHỐI ĐỒNG HỒ & CHẤM CÔNG */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 flex flex-col lg:flex-row items-center justify-between gap-6">
        
        {/* Đồng hồ */}
        <div className="text-center lg:text-left w-full lg:w-auto">
          <div className="flex items-center gap-2 text-slate-500 mb-2 justify-center lg:justify-start">
            <Calendar size={18} />
            <span className="font-medium">{currentTime.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight flex items-center gap-3 justify-center lg:justify-start">
            <Clock className="text-blue-600 w-8 h-8 md:w-10 md:h-10" />
            {currentTime.toLocaleTimeString('vi-VN')}
          </div>
        </div>

        {/* Nút thao tác */}
        <div className="flex flex-col gap-3 w-full lg:w-auto lg:min-w-[300px]">
          {!todayRecord ? (
            <div className="flex flex-col gap-2 w-full">
              <p className="text-sm text-slate-500 text-center lg:text-left mb-1">
                Hệ thống nhận diện bạn đang trong <b className="text-slate-800">{activeShift.label}</b>
              </p>
              {/* CHỈ HIỆN ĐÚNG 1 NÚT THEO THỜI GIAN THỰC */}
              <button 
                onClick={() => handleCheckIn(activeShift.id)} 
                className={`w-full flex items-center justify-center gap-2 text-white px-8 py-3.5 rounded-xl transition shadow-md font-bold text-lg ${activeShift.color}`}
              >
                <LogIn size={22} /> Check-in {activeShift.label}
              </button>
            </div>
          ) : !todayRecord.check_out ? (
            <div className="flex flex-col items-end gap-2 w-full">
              <div className="text-sm font-medium text-slate-500 w-full text-center lg:text-right">
                Bạn đang trong <span className="font-bold text-blue-600">
                  {todayRecord.shift === 'office' ? 'Ca Hành chính' : todayRecord.shift === 'morning' ? 'Ca Sáng' : todayRecord.shift === 'afternoon' ? 'Ca Chiều' : 'Ca Đêm'}
                </span> (Vào lúc {new Date(todayRecord.check_in).toLocaleTimeString('vi-VN')})
              </div>
              <button onClick={handleCheckOut} className="flex items-center justify-center gap-2 bg-red-600 text-white px-8 py-3.5 rounded-xl hover:bg-red-700 transition shadow-md font-bold w-full text-lg">
                <LogOut size={22} /> Check-out (Kết thúc ca)
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center lg:items-end gap-2 w-full">
              <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 px-6 py-3.5 rounded-xl border border-emerald-200 font-bold w-full text-lg">
                <CheckCircle size={22} /> Đã hoàn thành ca hôm nay
              </div>
              <div className="text-xs text-slate-500">
                Tổng giờ làm: <span className="font-bold text-slate-800">{todayRecord.work_hours} h</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BẢNG LỊCH SỬ */}
      <DataTable columns={columns} data={history} loading={loading} />
    </div>
  );
}