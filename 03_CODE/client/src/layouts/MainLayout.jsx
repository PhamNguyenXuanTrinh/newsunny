import { useMemo, useState } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, UsersRound, Box, ShoppingCart, Warehouse, CheckSquare, Banknote, BookOpen, LogOut, Wrench, Receipt, Megaphone, Menu, X, Clock, FileText, MessageSquare, AlertTriangle, ChevronLeft, ChevronRight, ChevronDown, Sparkles, Bell, ShieldCheck } from 'lucide-react';
import ChatWidget from '../components/ChatWidget';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  }, []);

  const role = user?.role || '';
  const userName = user?.name || 'Người dùng';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const roleLabels = { giam_doc: 'Giám đốc', ke_toan: 'Kế toán', to_truong: 'Tổ trưởng', cong_nhan: 'Công nhân', ctv: 'Cộng tác viên' };
  const roleLabel = roleLabels[role] || role || 'Thành viên';

  const menuGroups = [
    {
      title: 'Tổng quan',
      items: [
        { path: '/', label: 'Bảng điều khiển', icon: LayoutDashboard, roles: ['giam_doc', 'ke_toan'] }
      ]
    },
    {
      title: 'Kinh doanh & Kho',
      items: [
        { path: '/partners', label: 'Khách hàng / NCC', icon: UsersRound, roles: ['giam_doc', 'ke_toan', 'ctv'] },
        { path: '/items', label: 'Vật tư / Thành phẩm', icon: Box, roles: ['giam_doc', 'ke_toan'] },
        { path: '/orders', label: 'Đơn hàng', icon: ShoppingCart, roles: ['giam_doc', 'ke_toan', 'ctv'] },
        { path: '/stock', label: 'Lịch sử Kho', icon: Warehouse, roles: ['giam_doc', 'ke_toan', 'to_truong'] },
        { path: '/assets', label: 'Tài sản / Máy móc', icon: Wrench, roles: ['giam_doc', 'ke_toan'] }
      ]
    },
    {
      title: 'Nhân sự & Vận hành',
      items: [
        { path: '/users', label: 'Nhân sự', icon: Users, roles: ['giam_doc'] },
        { path: '/attendance', label: 'Chấm công', icon: Clock, roles: ['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan', 'ctv'] },
        { path: '/shift-reports', label: 'Báo cáo ca SX', icon: FileText, roles: ['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan'] },
        { path: '/incidents', label: 'Xử lý vi phạm', icon: AlertTriangle, roles: ['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan'] },
        { path: '/tasks', label: 'Công việc & KPI', icon: CheckSquare, roles: ['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan', 'ctv'] },
        { path: '/payrolls', label: 'Bảng lương', icon: Banknote, roles: ['giam_doc', 'ke_toan'] }
      ]
    },
    {
      title: 'Tài chính & Tri thức',
      items: [
        { path: '/costs', label: 'Chi phí', icon: Receipt, roles: ['giam_doc', 'ke_toan'] },
        { path: '/marketing', label: 'Tiếp thị', icon: Megaphone, roles: ['giam_doc'] },
        { path: '/sop', label: 'Quy trình (SOP)', icon: BookOpen, roles: ['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan', 'ctv'] },
        { path: '/chat-history', label: 'Lịch sử Chat AI', icon: MessageSquare, roles: ['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan', 'ctv'] }
      ]
    }
  ];

  const isRouteActive = (path) => path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(`${path}/`);
  const allMenuItems = menuGroups.flatMap(group => group.items);
  const currentItem = allMenuItems.filter(item => item.roles.includes(role)).find(item => isRouteActive(item.path));
  const currentPageName = currentItem?.label || 'SUNNY AI';

  const avatarText = userName.trim().split(/\s+/).slice(-2).map(word => word.charAt(0)).join('').toUpperCase() || 'A';

  const closePopups = () => { setProfileOpen(false); setNotificationOpen(false); };
  const handleLinkClick = () => { setIsSidebarOpen(false); closePopups(); };
  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#f4f7fb] font-sans text-slate-800">

      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-blue-200/20 blur-3xl" />
        <div className="absolute bottom-[-200px] left-[30%] h-[450px] w-[450px] rounded-full bg-indigo-200/20 blur-3xl" />
      </div>

      {/* MOBILE OVERLAY */}
      <div onClick={() => setIsSidebarOpen(false)} className={`fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] transition-all duration-300 md:hidden ${isSidebarOpen ? 'visible opacity-100' : 'invisible opacity-0'}`} />

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-white/5 bg-gradient-to-b from-[#101827] via-[#111c2e] to-[#0b1220] text-slate-300 shadow-[20px_0_50px_rgba(15,23,42,0.12)] transition-all duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 ${isCollapsed ? 'md:w-[88px]' : 'md:w-[270px]'}`}>

        {/* LOGO */}
        <div className={`relative flex h-[74px] shrink-0 items-center border-b border-white/[0.06] ${isCollapsed ? 'md:justify-center md:px-2' : 'px-5'}`}>
          <Link to="/" onClick={handleLinkClick} className="group flex min-w-0 items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-950/40">
              <Sparkles size={20} strokeWidth={2.3} className="text-white transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/20" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0 animate-[fadeIn_.25s_ease-out]">
                <div className="flex items-center">
                  <span className="text-[19px] font-black tracking-[0.12em] text-white">SUNNY</span>
                  <span className="ml-1 text-[19px] font-black tracking-[0.08em] text-blue-400">AI</span>
                </div>
                <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.23em] text-slate-500">Business Intelligence</div>
              </div>
            )}
          </Link>

          <button type="button" onClick={() => setIsSidebarOpen(false)} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white md:hidden">
            <X size={21} />
          </button>
        </div>

        {/* USER CARD */}
        {!isCollapsed && (
          <div className="px-3 pt-4">
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.045] px-3.5 py-3 backdrop-blur-xl">
              <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl" />
              <div className="relative flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-black text-white shadow-lg shadow-blue-950/30">{avatarText}</div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#111c2e] bg-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-100">{userName}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-slate-500"><ShieldCheck size={12} />{roleLabel}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MENU */}
        <nav className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-3 pb-5 pt-5">
          <div className="space-y-6">
            {menuGroups.map((group, groupIndex) => {
              const allowedItems = group.items.filter(item => item.roles.includes(role));
              if (!allowedItems.length) return null;

              return (
                <div key={group.title} style={{ animationDelay: `${groupIndex * 70}ms` }} className="animate-[menuFade_.45s_ease-out_both]">
                  {!isCollapsed ? (
                    <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">{group.title}</p>
                  ) : (
                    <div className="mx-auto mb-3 hidden h-px w-7 bg-white/10 md:block" />
                  )}

                  <div className="space-y-1">
                    {allowedItems.map(item => {
                      const Icon = item.icon;
                      const active = isRouteActive(item.path);

                      return (
                        <Link key={item.path} to={item.path} onClick={handleLinkClick} title={isCollapsed ? item.label : undefined} className={`group relative flex h-[46px] items-center rounded-xl transition-all duration-200 ${isCollapsed ? 'md:justify-center md:px-0' : 'px-3'} ${active ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_8px_25px_rgba(37,99,235,0.25)]' : 'text-slate-400 hover:bg-white/[0.055] hover:text-slate-100'}`}>
                          {active && <span className="absolute -left-3 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.8)]" />}

                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${active ? 'bg-white/10' : 'group-hover:bg-white/[0.05]'}`}>
                            <Icon size={19} strokeWidth={active ? 2.3 : 1.9} className="transition-transform duration-200 group-hover:scale-110" />
                          </div>

                          {!isCollapsed && (
                            <>
                              <span className={`ml-2.5 flex-1 whitespace-nowrap text-[13px] ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                              {active && <ChevronRight size={14} className="text-blue-100" />}
                            </>
                          )}

                          {isCollapsed && <div className="pointer-events-none absolute left-[72px] z-[100] hidden whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-xl transition-all group-hover:translate-x-1 group-hover:opacity-100 md:block">{item.label}</div>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        {/* LOGOUT */}
        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <button type="button" onClick={handleLogout} title={isCollapsed ? 'Đăng xuất' : undefined} className={`group flex h-11 w-full items-center rounded-xl text-red-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-300 ${isCollapsed ? 'md:justify-center md:px-0' : 'px-3'}`}>
            <div className="flex h-8 w-8 items-center justify-center"><LogOut size={19} className="transition-transform duration-200 group-hover:-translate-x-0.5" /></div>
            {!isCollapsed && <span className="ml-2 text-[13px] font-semibold">Đăng xuất</span>}
          </button>
        </div>

        {/* COLLAPSE */}
        <button type="button" onClick={() => setIsCollapsed(value => !value)} className="absolute -right-3.5 top-[92px] hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-lg transition-all hover:scale-110 hover:text-blue-600 md:flex">
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </aside>

      {/* MAIN */}
      <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* HEADER */}
        <header className="relative z-30 flex h-[74px] shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 shadow-[0_1px_15px_rgba(15,23,42,0.025)] backdrop-blur-xl md:px-7 xl:px-8">

          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setIsSidebarOpen(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 md:hidden">
              <Menu size={21} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[16px] font-bold text-slate-900 md:text-[18px]">{currentPageName}</h1>
                <span className="hidden h-1.5 w-1.5 rounded-full bg-slate-300 sm:block" />
                <span className="hidden text-[11px] font-medium text-slate-400 sm:block">SUNNY AI</span>
              </div>
              <p className="mt-0.5 hidden text-[11px] text-slate-400 sm:block">Hệ thống quản trị doanh nghiệp</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">


            {/* NOTIFICATION */}
            <div className="relative">
              <button type="button" onClick={() => { setNotificationOpen(v => !v); setProfileOpen(false); }} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900">
                <Bell size={19} />
                <span className="absolute right-[9px] top-[8px] h-2 w-2 rounded-full border-2 border-white bg-red-500" />
              </button>

              {notificationOpen && (
                <div className="absolute right-0 top-[50px] w-[310px] origin-top-right animate-[dropdownIn_.18s_ease-out] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.15)]">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                    <p className="text-sm font-bold text-slate-900">Thông báo</p>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600">Mới</span>
                  </div>

                  <div className="p-3">
                    <div className="rounded-xl bg-slate-50 p-4 text-center">
                      <Bell size={22} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-medium text-slate-500">Chưa có thông báo mới</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mx-1 hidden h-7 w-px bg-slate-200 sm:block" />

            {/* PROFILE */}
            <div className="relative">
              <button type="button" onClick={() => { setProfileOpen(v => !v); setNotificationOpen(false); }} className="group flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-100">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-black text-white shadow-md shadow-blue-200">{avatarText}</div>

                <div className="hidden min-w-0 text-left md:block">
                  <p className="max-w-[150px] truncate text-[12px] font-bold text-slate-800">{userName}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">{roleLabel}</p>
                </div>

                <ChevronDown size={14} className={`hidden text-slate-400 transition-transform duration-200 md:block ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-[52px] w-[245px] origin-top-right animate-[dropdownIn_.18s_ease-out] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.15)]">
                  <div className="border-b border-slate-100 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-black text-white">{avatarText}</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{userName}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{roleLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-red-500 transition hover:bg-red-50">
                      <LogOut size={17} />Đăng xuất tài khoản
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE */}
        <div className="custom-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden">
          <div key={location.pathname} className="min-h-full animate-[pageEnter_.35s_ease-out] p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8">
            <Outlet />
          </div>
        </div>
      </main>

      <ChatWidget />

      <style>{`
        @keyframes pageEnter{0%{opacity:0;transform:translateY(7px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes menuFade{0%{opacity:0;transform:translateX(-6px)}100%{opacity:1;transform:translateX(0)}}
        @keyframes dropdownIn{0%{opacity:0;transform:translateY(-5px) scale(.98)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .custom-scrollbar{scrollbar-width:thin;scrollbar-color:rgba(148,163,184,.28) transparent}
        .custom-scrollbar::-webkit-scrollbar{width:5px;height:5px}
        .custom-scrollbar::-webkit-scrollbar-track{background:transparent}
        .custom-scrollbar::-webkit-scrollbar-thumb{background:rgba(148,163,184,.25);border-radius:999px}
        .custom-scrollbar::-webkit-scrollbar-thumb:hover{background:rgba(148,163,184,.45)}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
      `}</style>
    </div>
  );
}