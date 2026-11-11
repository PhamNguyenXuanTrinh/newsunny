import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Users, UsersRound, Box, ShoppingCart, 
  Warehouse, CheckSquare, Banknote, BookOpen, LogOut, 
  Wrench, Receipt, Megaphone
} from 'lucide-react';
import ChatWidget from '../components/ChatWidget'; // <-- Import Chat Widget

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role;

  const handleLogout = () => { 
    localStorage.clear(); 
    navigate('/login'); 
  };

  // Cấu hình Menu theo từng Role
  const menuGroups = [
    { 
      title: 'Tổng quan', 
      items: [
        { path: '/', label: 'Bảng điều khiển', icon: <LayoutDashboard size={20} />, roles: ['giam_doc', 'ke_toan'] }
      ] 
    },
    { 
      title: 'Kinh doanh & Kho', 
      items: [
        { path: '/partners', label: 'Khách hàng / NCC', icon: <UsersRound size={20} />, roles: ['giam_doc', 'ke_toan', 'ctv'] },
        { path: '/items', label: 'Vật tư / Thành phẩm', icon: <Box size={20} />, roles: ['giam_doc', 'ke_toan'] },
        { path: '/orders', label: 'Đơn hàng', icon: <ShoppingCart size={20} />, roles: ['giam_doc', 'ke_toan', 'ctv'] },
        { path: '/stock', label: 'Lịch sử Kho', icon: <Warehouse size={20} />, roles: ['giam_doc', 'ke_toan', 'to_truong'] },
        { path: '/assets', label: 'Tài sản / Máy móc', icon: <Wrench size={20} />, roles: ['giam_doc', 'ke_toan'] },
      ]
    },
    { 
      title: 'Nhân sự & Vận hành', 
      items: [
        { path: '/users', label: 'Nhân sự', icon: <Users size={20} />, roles: ['giam_doc'] },
        { path: '/tasks', label: 'Công việc & KPI', icon: <CheckSquare size={20} />, roles: ['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan', 'ctv'] },
        { path: '/payrolls', label: 'Bảng lương', icon: <Banknote size={20} />, roles: ['giam_doc', 'ke_toan'] },
      ]
    },
    { 
      title: 'Tài chính & Tri thức', 
      items: [
        { path: '/costs', label: 'Chi phí', icon: <Receipt size={20} />, roles: ['giam_doc', 'ke_toan'] },
        { path: '/marketing', label: 'Tiếp thị', icon: <Megaphone size={20} />, roles: ['giam_doc'] },
        { path: '/sop', label: 'Quy trình (SOP)', icon: <BookOpen size={20} />, roles: ['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan', 'ctv'] },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* SIDEBAR BÊN TRÁI */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20">
        <div className="h-16 flex items-center justify-center border-b border-slate-800">
          <span className="text-white text-xl font-bold tracking-wider">SUNNY<span className="text-blue-500">AI</span></span>
        </div>
        
        <nav className="flex-1 py-4 overflow-y-auto px-3 space-y-6 custom-scrollbar">
          {menuGroups.map((group, gIdx) => {
            // Lọc các item mà role hiện tại được phép xem
            const allowedItems = group.items.filter(item => item.roles.includes(role));
            
            // Nếu cả nhóm không có item nào được phép xem thì ẩn luôn cả nhóm
            if (allowedItems.length === 0) return null;

            return (
              <div key={gIdx}>
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{group.title}</p>
                <div className="space-y-1">
                  {allowedItems.map((item, iIdx) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link 
                        key={iIdx} 
                        to={item.path} 
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm ${
                          isActive 
                            ? 'bg-blue-600 text-white font-medium shadow-md' 
                            : 'hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {item.icon} {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 w-full px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all text-sm"
          >
            <LogOut size={20} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* NỘI DUNG BÊN PHẢI */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm">
          <div className="text-slate-500 text-sm">
            Xin chào, <span className="font-bold text-slate-800">{user.name}</span> 
            <span className="ml-2 px-2 py-1 bg-slate-100 rounded text-xs font-semibold uppercase">{user.role}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
              {user.name?.charAt(0) || 'A'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
          <Outlet />
        </div>
      </main>

      {/* COMPONENT CHAT NỔI (GÓC DƯỚI BÊN PHẢI) */}
      <ChatWidget />
    </div>
  );
}