import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { 
  TrendingUp, Clock, AlertTriangle, PackageX, 
  Users, DollarSign, Wallet, ArrowDownToLine, 
  ArrowUpFromLine, CheckSquare, Award, Inbox, Send
} from 'lucide-react';

// --- KHAI BÁO TASKTABLE RA NGOÀI COMPONENT CHÍNH ---
// Đã thêm overflow-x-auto cho bảng để chạy tốt trên mobile
const TaskTable = ({ title, icon, tasks, linkText }) => (
  <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
    <div className="flex justify-between items-center mb-4 gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-base md:text-lg font-bold text-slate-800 line-clamp-1">{title}</h3>
      </div>
      <Link to="/tasks" className="text-xs md:text-sm text-blue-600 hover:underline font-medium whitespace-nowrap">{linkText}</Link>
    </div>
    
    <div className="overflow-x-auto flex-1 w-full">
      <table className="w-full text-left min-w-[500px]">
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
              <td className="py-3 text-slate-500 text-sm whitespace-nowrap">{new Date(t.due).toLocaleDateString('vi-VN')}</td>
              <td className="py-3">
                {t.status === 'done' ? <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded whitespace-nowrap">Hoàn thành</span> :
                 new Date(t.due) < new Date() ? <span className="text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded whitespace-nowrap">Trễ hạn</span> :
                 <span className="text-blue-600 text-xs font-bold bg-blue-50 px-2 py-1 rounded whitespace-nowrap">Đang làm</span>}
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
  
  // Lấy user 1 lần duy nhất khi khởi tạo state, không cần dùng useEffect để set
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; // Tránh memory leak nếu user chuyển trang đột ngột
    
    // Bọc toàn bộ setState vào setTimeout để tránh lỗi React 18
    const timer = setTimeout(() => {
      if (isMounted) setLoading(true);
      
      Promise.all([
        api.get(`/dashboard?period=${period}`),
        api.get(`/tasks?period=${period}&filterType=assigned_to_me`),
        api.get(`/tasks?period=${period}&filterType=assigned_by_me`)
      ])
      .then(([resDash, resReceived, resAssigned]) => {
        if (isMounted) {
          setData(resDash.data.data);
          setTasksReceived(resReceived.data.data);
          setTasksAssigned(resAssigned.data.data);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [period]);

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-screen text-slate-500 text-sm md:text-base">
        <div className="animate-spin rounded-full h-8 w-8 md:h-12 md:w-12 border-b-2 border-blue-600 mr-3 md:mr-4"></div>
        Đang tải dữ liệu hệ thống...
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Bộ lọc thời gian: Thêm thanh cuộn ngang cho Mobile
  const renderTimeFilter = () => (
    <div className="w-full overflow-x-auto pb-2 md:pb-0">
      <div className="flex bg-slate-100 p-1 rounded-xl w-max">
        {[
          { key: 'day', label: 'Hôm nay' }, { key: 'week', label: 'Tuần này' },
          { key: 'month', label: 'Tháng này' }, { key: 'quarter', label: 'Quý này' }, { key: 'year', label: 'Năm nay' }
        ].map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} className={`px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${period === p.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{p.label}</button>
        ))}
      </div>
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
      <div className="space-y-6 md:space-y-8 font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Chào Giám đốc, {user.name || 'Người dùng'}! 👋</h1>
            <p className="text-slate-500 mt-1 md:mt-2 text-sm md:text-base">Tóm tắt tình hình hoạt động của nhà máy.</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
            <p className="text-xs md:text-sm font-medium text-slate-500 uppercase tracking-wider">{currentDate}</p>
            {renderTimeFilter()}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs md:text-sm font-medium mb-1">Tổng Doanh Thu</p>
                <h3 className="text-xl md:text-2xl font-extrabold text-blue-600">{formatVND(data.revenue)} <span className="text-xs md:text-sm">đ</span></h3>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><TrendingUp size={20} className="md:w-6 md:h-6" /></div>
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs md:text-sm font-medium mb-1">Lợi Nhuận Tạm Tính</p>
                <h3 className={`text-xl md:text-2xl font-extrabold ${data.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatVND(data.profit)} <span className="text-xs md:text-sm">đ</span>
                </h3>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0"><DollarSign size={20} className="md:w-6 md:h-6" /></div>
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs md:text-sm font-medium mb-1">Đơn Chờ Duyệt</p>
                <h3 className="text-xl md:text-2xl font-extrabold text-amber-600">{data.pending_orders} <span className="text-xs md:text-sm">đơn</span></h3>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0"><Clock size={20} className="md:w-6 md:h-6" /></div>
            </div>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs md:text-sm font-medium mb-1">Cảnh Báo Tồn Kho</p>
                <h3 className="text-xl md:text-2xl font-extrabold text-red-600">{(data.low_stock_items || []).length} <span className="text-xs md:text-sm">mặt hàng</span></h3>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0"><AlertTriangle size={20} className="md:w-6 md:h-6" /></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <Award className="text-blue-600 shrink-0" size={20} />
              <h3 className="text-base md:text-lg font-bold text-slate-800">Bảng Xếp Hạng KPI Nhân Sự</h3>
            </div>
            
            <div className="space-y-4">
              {data.kpi_leaderboard?.filter(u => u.total_weight > 0).map((u, idx) => {
                const percent = u.total_weight > 0 ? Math.round((u.done_weight / u.total_weight) * 100) : 0;
                const color = getKpiColor(percent);
                
                return (
                  <div key={u.id} className="flex items-center gap-3 md:gap-4 bg-slate-50 p-2 md:p-3 rounded-xl border border-slate-100">
                    <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-xs md:text-sm shrink-0 ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-end mb-1 gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-sm md:text-base text-slate-800 truncate">{u.full_name} <span className="text-[10px] md:text-xs font-normal text-slate-500">({u.team_id || 'N/A'})</span></p>
                          <p className="text-[10px] md:text-xs text-slate-500">Xong: {u.done_weight} / {u.total_weight} (Trọng số)</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`font-bold text-xs md:text-base ${color.text}`}>{percent}%</span>
                          <p className={`text-[9px] md:text-[10px] font-bold uppercase ${color.text}`}>{color.label}</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 md:h-2.5">
                        <div className={`h-1.5 md:h-2.5 rounded-full ${color.bg}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
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

          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-red-600">
              <PackageX size={20} className="shrink-0" />
              <h3 className="text-base md:text-lg font-bold text-slate-800">Cảnh báo Tồn kho</h3>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 max-h-[300px] md:max-h-[400px]">
              {(data.low_stock_items || []).length > 0 ? (
                <div className="space-y-2 md:space-y-3">
                  {data.low_stock_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-red-50/50 p-2 md:p-3 rounded-xl border border-red-100 gap-2">
                      <span className="font-medium text-slate-700 text-sm line-clamp-1">{item.name}</span>
                      <span className="text-red-600 font-bold bg-white px-2 py-1 rounded-md text-xs shrink-0">Còn: {item.stock}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-emerald-500 font-medium bg-emerald-50 rounded-xl min-h-[150px]">
                  ✅ Kho hàng an toàn
                </div>
              )}
            </div>
          </div>
        </div>

        <TaskTable 
          title="Công việc tôi đã giao" 
          icon={<Send className="text-blue-600 shrink-0" size={20} />} 
          tasks={tasksAssigned} 
          linkText="Xem tất cả →" 
        />
      </div>
    );
  }

  // ==========================================
  // 2. GIAO DIỆN KẾ TOÁN
  // ==========================================
  if (data.type === 'ke_toan') {
    return (
      <div className="space-y-6 md:space-y-8 font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Chào Kế toán, {user.name || 'Người dùng'}! 👋</h1>
            <p className="text-slate-500 mt-1 md:mt-2 text-sm md:text-base">Quản lý dòng tiền và công nợ doanh nghiệp.</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
            <p className="text-xs md:text-sm font-medium text-slate-500 uppercase tracking-wider">{currentDate}</p>
            {renderTimeFilter()}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs md:text-sm font-medium mb-1">Phải Thu (Khách nợ)</p>
                <h3 className="text-xl md:text-2xl font-extrabold text-blue-600">{formatVND(data.receivable)} <span className="text-xs">đ</span></h3>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><ArrowDownToLine size={20} className="md:w-6 md:h-6" /></div>
            </div>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs md:text-sm font-medium mb-1">Phải Trả (Nợ NCC)</p>
                <h3 className="text-xl md:text-2xl font-extrabold text-red-600">{formatVND(data.payable)} <span className="text-xs">đ</span></h3>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0"><ArrowUpFromLine size={20} className="md:w-6 md:h-6" /></div>
            </div>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs md:text-sm font-medium mb-1">Đã Thu</p>
                <h3 className="text-xl md:text-2xl font-extrabold text-emerald-600">{formatVND(data.collected)} <span className="text-xs">đ</span></h3>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0"><Wallet size={20} className="md:w-6 md:h-6" /></div>
            </div>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-xs md:text-sm font-medium mb-1">Đã Chi</p>
                <h3 className="text-xl md:text-2xl font-extrabold text-amber-600">{formatVND(data.spent)} <span className="text-xs">đ</span></h3>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0"><DollarSign size={20} className="md:w-6 md:h-6" /></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TaskTable 
            title="Việc Sếp giao" 
            icon={<Inbox className="text-amber-600 shrink-0" size={20} />} 
            tasks={tasksReceived} 
            linkText="Xem chi tiết →" 
          />
          <TaskTable 
            title="Việc tôi giao" 
            icon={<Send className="text-emerald-600 shrink-0" size={20} />} 
            tasks={tasksAssigned} 
            linkText="Giao việc →" 
          />
        </div>
      </div>
    );
  }

  // ==========================================
  // 3. GIAO DIỆN TỔ TRƯỞNG
  // ==========================================
  if (data.type === 'to_truong') {
    return (
      <div className="space-y-6 md:space-y-8 font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Chào Tổ trưởng, {user.name || 'Người dùng'}! 👋</h1>
            <p className="text-slate-500 mt-1 md:mt-2 text-sm md:text-base">Theo dõi tiến độ của tổ {user.team_id}.</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
            <p className="text-xs md:text-sm font-medium text-slate-500 uppercase tracking-wider">{currentDate}</p>
            {renderTimeFilter()}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-xs md:text-sm font-medium mb-1">Tổng Việc Được Giao</p>
            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800">{data.team_tasks?.total || 0} <span className="text-sm">việc</span></h3>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-xs md:text-sm font-medium mb-1">Đã Hoàn Thành</p>
            <h3 className="text-2xl md:text-3xl font-extrabold text-emerald-600">{data.team_tasks?.done || 0} <span className="text-sm">việc</span></h3>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-slate-500 text-xs md:text-sm font-medium mb-1">Đang Thực Hiện</p>
            <h3 className="text-2xl md:text-3xl font-extrabold text-blue-600">{data.team_tasks?.doing || 0} <span className="text-sm">việc</span></h3>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-red-100 bg-red-50/30">
            <p className="text-red-500 text-xs md:text-sm font-medium mb-1">Trễ Hạn</p>
            <h3 className="text-2xl md:text-3xl font-extrabold text-red-600">{data.team_tasks?.late || 0} <span className="text-sm">việc</span></h3>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <Users className="text-blue-600 shrink-0" size={20} />
            <h3 className="text-base md:text-lg font-bold text-slate-800">Năng Suất Công Nhân</h3>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-xs md:text-sm">
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
                      <td className="py-3 font-medium text-sm md:text-base text-slate-800 whitespace-nowrap">{w.full_name}</td>
                      <td className="py-3 text-center text-sm md:text-base text-slate-600">{w.total_weight}</td>
                      <td className="py-3 text-center text-sm md:text-base text-emerald-600">{w.done_weight}</td>
                      <td className="py-3 text-right">
                        <span className={`inline-block px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold ${color.bg} text-white whitespace-nowrap`}>
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
            title="Việc Sếp giao" 
            icon={<Inbox className="text-amber-600 shrink-0" size={20} />} 
            tasks={tasksReceived} 
            linkText="Xem chi tiết →" 
          />
          <TaskTable 
            title="Việc tôi giao" 
            icon={<Send className="text-emerald-600 shrink-0" size={20} />} 
            tasks={tasksAssigned} 
            linkText="Giao việc →" 
          />
        </div>
      </div>
    );
  }

  // ==========================================
  // 4. GIAO DIỆN CÔNG NHÂN / CTV
  // ==========================================
  return (
    <div className="space-y-6 md:space-y-8 font-sans flex flex-col justify-center min-h-[70vh]">
      <div className="text-center px-4">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-2">Chào {user.name || 'bạn'}! 👋</h1>
        <p className="text-base md:text-lg text-slate-500">Hôm nay bạn có kế hoạch gì?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto w-full px-4">
        <div className="bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-blue-100 flex items-center justify-between transform hover:scale-105 transition duration-300">
          <div>
            <p className="text-slate-500 text-sm md:text-lg font-medium mb-1 md:mb-2">Việc Cần Làm</p>
            <h3 className="text-3xl md:text-5xl font-extrabold text-blue-600">{data.my_todo_tasks || 0}</h3>
            <p className="text-[10px] md:text-sm text-slate-400 mt-1 md:mt-2">Đang chờ bạn</p>
          </div>
          <div className="w-14 h-14 md:w-20 md:h-20 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
            <CheckSquare size={28} className="md:w-10 md:h-10" />
          </div>
        </div>

        <div className="bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-red-100 flex items-center justify-between transform hover:scale-105 transition duration-300">
          <div>
            <p className="text-red-500 text-sm md:text-lg font-medium mb-1 md:mb-2">Việc Trễ Hạn</p>
            <h3 className="text-3xl md:text-5xl font-extrabold text-red-600">{data.my_late_tasks || 0}</h3>
            <p className="text-[10px] md:text-sm text-red-400 mt-1 md:mt-2">Cần xử lý gấp!</p>
          </div>
          <div className="w-14 h-14 md:w-20 md:h-20 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shrink-0">
            <AlertTriangle size={28} className="md:w-10 md:h-10" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full px-4">
        <TaskTable 
          title="Danh sách công việc" 
          icon={<Inbox className="text-blue-600 shrink-0" size={20} />} 
          tasks={tasksReceived} 
          linkText="Xem chi tiết →" 
        />
      </div>
    </div>
  );
}
