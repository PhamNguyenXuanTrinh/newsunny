import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { 
  TrendingUp, Clock, AlertTriangle, PackageX, 
  Users, DollarSign, Wallet, ArrowDownToLine, 
  ArrowUpFromLine, CheckSquare, Award, Inbox, Send
} from 'lucide-react';

// --- KHAI BÁO TASKTABLE RA NGOÀI COMPONENT CHÍNH ---
const TaskTable = ({ title, icon, tasks, linkText }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      </div>
      <Link to="/tasks" className="text-sm text-blue-600 hover:underline font-medium">{linkText}</Link>
    </div>
    
    <div className="overflow-x-auto flex-1">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase">
            <th className="pb-2 font-medium">Công việc</th>
            <th className="pb-2 font-medium">Hạn chót</th>
            <th className="pb-2 font-medium">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tasks.slice(0, 5).map(t => (
            <tr key={t.id}>
              <td className="py-3 font-medium text-slate-700">{t.title}</td>
              <td className="py-3 text-slate-500 text-sm">{new Date(t.due).toLocaleDateString('vi-VN')}</td>
              <td className="py-3">
                {t.status === 'done' ? <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded">Hoàn thành</span> :
                 new Date(t.due) < new Date() ? <span className="text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">Trễ hạn</span> :
                 <span className="text-blue-600 text-xs font-bold bg-blue-50 px-2 py-1 rounded">Đang làm</span>}
              </td>
            </tr>
          ))}
          {tasks.length === 0 && <tr><td colSpan="3" className="text-center py-6 text-slate-400">Không có công việc nào.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>
);

// --- COMPONENT CHÍNH ---
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [tasksReceived, setTasksReceived] = useState([]);
  const [tasksAssigned, setTasksAssigned] = useState([]);
  const [user, setUser] = useState({});
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(u);
    
    setLoading(true);
    const timer = setTimeout(() => {
      Promise.all([
        api.get(`/dashboard?period=${period}`),
        api.get(`/tasks?period=${period}&filterType=assigned_to_me`),
        api.get(`/tasks?period=${period}&filterType=assigned_by_me`)
      ])
      .then(([resDash, resReceived, resAssigned]) => {
        setData(resDash.data.data);
        setTasksReceived(resReceived.data.data);
        setTasksAssigned(resAssigned.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [period]);

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-screen text-slate-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mr-4"></div>
        Đang tải dữ liệu hệ thống...
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const renderTimeFilter = () => (
    <div className="flex bg-slate-100 p-1 rounded-xl">
      {[
        { key: 'day', label: 'Hôm nay' }, { key: 'week', label: 'Tuần này' },
        { key: 'month', label: 'Tháng này' }, { key: 'quarter', label: 'Quý này' }, { key: 'year', label: 'Năm nay' }
      ].map(p => (
        <button key={p.key} onClick={() => setPeriod(p.key)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${period === p.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{p.label}</button>
      ))}
    </div>
  );

  const getKpiColor = (percent) => {
    if (percent >= 100) return { bg: 'bg-emerald-500', text: 'text-emerald-600', label: 'Xuất sắc' };
    if (percent >= 80) return { bg: 'bg-blue-500', text: 'text-blue-600', label: 'Đạt' };
    if (percent >= 50) return { bg: 'bg-amber-500', text: 'text-amber-600', label: 'Cảnh báo' };
    return { bg: 'bg-red-500', text: 'text-red-600', label: 'Nguy hiểm' };
  };

  const formatVND = (amount) => Math.round(Number(amount) || 0).toLocaleString('vi-VN');

  // ==========================================
  // 1. GIAO DIỆN GIÁM ĐỐC
  // ==========================================
  if (data.type === 'giam_doc') {
    return (
      <div className="space-y-8 font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Chào Giám đốc, {user.name || 'Người dùng'}! 👋</h1>
            <p className="text-slate-500 mt-2">Dưới đây là tóm tắt tình hình hoạt động của nhà máy.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{currentDate}</p>
            {renderTimeFilter()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Tổng Doanh Thu</p>
                <h3 className="text-2xl font-extrabold text-blue-600">{formatVND(data.revenue)} <span className="text-sm">đ</span></h3>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><TrendingUp size={24} /></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Lợi Nhuận Tạm Tính</p>
                <h3 className={`text-2xl font-extrabold ${data.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatVND(data.profit)} <span className="text-sm">đ</span>
                </h3>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><DollarSign size={24} /></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Đơn Chờ Duyệt</p>
                <h3 className="text-2xl font-extrabold text-amber-600">{data.pending_orders} <span className="text-sm">đơn</span></h3>
              </div>
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><Clock size={24} /></div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Cảnh Báo Tồn Kho</p>
                <h3 className="text-2xl font-extrabold text-red-600">{data.low_stock_items.length} <span className="text-sm">mặt hàng</span></h3>
              </div>
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center"><AlertTriangle size={24} /></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-6">
              <Award className="text-blue-600" size={24} />
              <h3 className="text-lg font-bold text-slate-800">Bảng Xếp Hạng KPI Nhân Sự</h3>
            </div>
            
            <div className="space-y-4">
              {data.kpi_leaderboard?.filter(u => u.total_weight > 0).map((u, idx) => {
                const percent = u.total_weight > 0 ? Math.round((u.done_weight / u.total_weight) * 100) : 0;
                const color = getKpiColor(percent);
                
                return (
                  <div key={u.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-end mb-1">
                        <div>
                          <p className="font-bold text-slate-800">{u.full_name} <span className="text-xs font-normal text-slate-500">({u.team_id || 'N/A'})</span></p>
                          <p className="text-xs text-slate-500">Đã xong: {u.done_weight} / {u.total_weight} (Trọng số)</p>
                        </div>
                        <div className="text-right">
                          <span className={`font-bold ${color.text}`}>{percent}%</span>
                          <p className={`text-[10px] font-bold uppercase ${color.text}`}>{color.label}</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${color.bg}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {data.kpi_leaderboard?.filter(u => u.total_weight > 0).length === 0 && (
                <div className="text-center text-slate-500 py-4">Chưa có dữ liệu KPI trong kỳ này.</div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-red-600">
              <PackageX size={24} />
              <h3 className="text-lg font-bold text-slate-800">Cảnh báo Tồn kho</h3>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 max-h-[400px]">
              {data.low_stock_items.length > 0 ? (
                <div className="space-y-3">
                  {data.low_stock_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-red-50/50 p-3 rounded-xl border border-red-100">
                      <span className="font-medium text-slate-700 line-clamp-1">{item.name}</span>
                      <span className="text-red-600 font-bold bg-white px-2 py-1 rounded-md text-sm shrink-0">Còn: {item.stock}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-emerald-500 font-medium bg-emerald-50 rounded-xl min-h-[150px]">
                  ✅ Kho hàng đang ở mức an toàn
                </div>
              )}
            </div>
          </div>
        </div>

        <TaskTable 
          title="Công việc tôi đã giao cho nhân viên" 
          icon={<Send className="text-blue-600" size={24} />} 
          tasks={tasksAssigned} 
          linkText="Xem tất cả & Giao việc →" 
        />
      </div>
    );
  }

  // ==========================================
  // 2. GIAO DIỆN KẾ TOÁN (CHIA 2 BẢNG)
  // ==========================================
  if (data.type === 'ke_toan') {
    return (
      <div className="space-y-8 font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Chào Kế toán, {user.name || 'Người dùng'}! 👋</h1>
            <p className="text-slate-500 mt-2">Quản lý dòng tiền và công nợ doanh nghiệp.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{currentDate}</p>
            {renderTimeFilter()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Phải Thu (Khách nợ)</p>
                <h3 className="text-2xl font-extrabold text-blue-600">{formatVND(data.receivable)} <span className="text-sm">đ</span></h3>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><ArrowDownToLine size={24} /></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Phải Trả (Nợ NCC)</p>
                <h3 className="text-2xl font-extrabold text-red-600">{formatVND(data.payable)} <span className="text-sm">đ</span></h3>
              </div>
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center"><ArrowUpFromLine size={24} /></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Tiền Đã Thu (Kỳ này)</p>
                <h3 className="text-2xl font-extrabold text-emerald-600">{formatVND(data.collected)} <span className="text-sm">đ</span></h3>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><Wallet size={24} /></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Tiền Đã Chi (Kỳ này)</p>
                <h3 className="text-2xl font-extrabold text-amber-600">{formatVND(data.spent)} <span className="text-sm">đ</span></h3>
              </div>
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><DollarSign size={24} /></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TaskTable 
            title="Việc Sếp giao cho tôi" 
            icon={<Inbox className="text-amber-600" size={24} />} 
            tasks={tasksReceived} 
            linkText="Xem chi tiết →" 
          />
          <TaskTable 
            title="Việc tôi giao cho nhân viên" 
            icon={<Send className="text-emerald-600" size={24} />} 
            tasks={tasksAssigned} 
            linkText="Giao việc mới →" 
          />
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. GIAO DIỆN TỔ TRƯỞNG (CHIA 2 BẢNG)
  // ==========================================
  if (data.type === 'to_truong') {
    return (
      <div className="space-y-8 font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Chào Tổ trưởng, {user.name || 'Người dùng'}! 👋</h1>
            <p className="text-slate-500 mt-2">Theo dõi tiến độ và năng suất của tổ {user.team_id}.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{currentDate}</p>
            {renderTimeFilter()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm font-medium mb-1">Tổng Việc Được Giao</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{data.team_tasks?.total || 0} <span className="text-sm">việc</span></h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm font-medium mb-1">Đã Hoàn Thành</p>
            <h3 className="text-3xl font-extrabold text-emerald-600">{data.team_tasks?.done || 0} <span className="text-sm">việc</span></h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-sm font-medium mb-1">Đang Thực Hiện</p>
            <h3 className="text-3xl font-extrabold text-blue-600">{data.team_tasks?.doing || 0} <span className="text-sm">việc</span></h3>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 bg-red-50/30">
            <p className="text-red-500 text-sm font-medium mb-1">Trễ Hạn</p>
            <h3 className="text-3xl font-extrabold text-red-600">{data.team_tasks?.late || 0} <span className="text-sm">việc</span></h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <Users className="text-blue-600" size={24} />
            <h3 className="text-lg font-bold text-slate-800">Năng Suất Công Nhân Trong Tổ</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-sm">
                  <th className="pb-3 font-medium">Công nhân</th>
                  <th className="pb-3 font-medium text-center">Tổng việc</th>
                  <th className="pb-3 font-medium text-center">Đã xong</th>
                  <th className="pb-3 font-medium text-right">Điểm KPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.workers?.map((w) => {
                  const percent = w.total_weight > 0 ? Math.round((w.done_weight / w.total_weight) * 100) : 0;
                  const color = getKpiColor(percent);
                  return (
                    <tr key={w.id} className="hover:bg-slate-50">
                      <td className="py-3 font-medium text-slate-800">{w.full_name}</td>
                      <td className="py-3 text-center text-slate-600">{w.total_weight}</td>
                      <td className="py-3 text-center text-emerald-600">{w.done_weight}</td>
                      <td className="py-3 text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${color.bg} text-white`}>
                          {percent}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TaskTable 
            title="Việc Sếp giao cho tôi" 
            icon={<Inbox className="text-amber-600" size={24} />} 
            tasks={tasksReceived} 
            linkText="Xem chi tiết →" 
          />
          <TaskTable 
            title="Việc tôi giao cho công nhân" 
            icon={<Send className="text-emerald-600" size={24} />} 
            tasks={tasksAssigned} 
            linkText="Giao việc mới →" 
          />
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. GIAO DIỆN CÔNG NHÂN / CTV
  // ==========================================
  return (
    <div className="space-y-8 font-sans flex flex-col justify-center min-h-[70vh]">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold text-slate-800 mb-2">Chào {user.name || 'bạn'}! 👋</h1>
        <p className="text-lg text-slate-500">Hôm nay bạn có kế hoạch gì?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-blue-100 flex items-center justify-between transform hover:scale-105 transition duration-300">
          <div>
            <p className="text-slate-500 text-lg font-medium mb-2">Việc Cần Làm</p>
            <h3 className="text-5xl font-extrabold text-blue-600">{data.my_todo_tasks || 0}</h3>
            <p className="text-sm text-slate-400 mt-2">Công việc đang chờ bạn</p>
          </div>
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
            <CheckSquare size={40} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-red-100 flex items-center justify-between transform hover:scale-105 transition duration-300">
          <div>
            <p className="text-red-500 text-lg font-medium mb-2">Việc Trễ Hạn</p>
            <h3 className="text-5xl font-extrabold text-red-600">{data.my_late_tasks || 0}</h3>
            <p className="text-sm text-red-400 mt-2">Cần xử lý gấp!</p>
          </div>
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={40} />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full">
        <TaskTable 
          title="Danh sách công việc của tôi" 
          icon={<Inbox className="text-blue-600" size={24} />} 
          tasks={tasksReceived} 
          linkText="Xem chi tiết →" 
        />
      </div>
    </div>
  );
}
