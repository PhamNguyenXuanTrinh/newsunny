
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Building2,
  Loader2,
  Fingerprint,
  Zap
} from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        username,
        password
      });

      localStorage.setItem('token', res.data.token);

      localStorage.setItem('user', JSON.stringify({
        name: res.data.name,
        role: res.data.role
      }));

      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.error ||
        'Tài khoản hoặc mật khẩu không chính xác!'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D1B] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans">

      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(37,99,235,0.18),_transparent_50%)]" />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(14,165,233,0.12),_transparent_50%)]" />

        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px] animate-pulse" />

        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] animate-pulse" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '45px 45px'
          }}
        />
      </div>

      {/* MAIN CONTAINER */}
      <div className="relative z-10 w-full max-w-[1100px] min-h-[650px] grid lg:grid-cols-2 bg-[#101A2C]/80 border border-white/[0.08] rounded-[32px] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-2xl">

        {/* LEFT PANEL */}
        <div className="hidden lg:flex flex-col justify-between p-12 xl:p-16 relative overflow-hidden bg-gradient-to-br from-blue-950 via-[#102D59] to-[#07172D]">

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute w-96 h-96 rounded-full border border-blue-300/[0.08] -top-32 -right-32" />
            <div className="absolute w-72 h-72 rounded-full border border-blue-300/[0.08] -top-20 -right-20" />
            <div className="absolute w-52 h-52 rounded-full border border-blue-300/[0.08] -top-10 -right-10" />

            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-500/[0.08] to-transparent" />

            <div className="absolute bottom-20 -left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-[90px]" />
          </div>

          {/* BRAND */}
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white text-3xl font-black">S</span>
            </div>

            <div>
              <h1 className="text-white text-2xl font-black tracking-[0.2em]">
                SUNNY AI
              </h1>
              <p className="text-blue-300/70 text-[10px] tracking-[0.3em] uppercase mt-1">
                Enterprise Management
              </p>
            </div>
          </div>

          {/* HERO CONTENT */}
          <div className="relative z-10 mt-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] mb-8">
              <Sparkles size={14} className="text-cyan-300" />
              <span className="text-cyan-200 text-xs font-semibold tracking-wider">
                SMART BUSINESS ECOSYSTEM
              </span>
            </div>

            <h2 className="text-4xl xl:text-[52px] leading-[1.2] font-bold text-white tracking-tight">
              Quản trị doanh nghiệp
              <span className="block mt-2 bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                thông minh hơn.
              </span>
            </h2>

            <p className="text-blue-100/60 text-base leading-8 mt-7 max-w-md">
              Một nền tảng quản trị toàn diện, kết hợp sức mạnh AI
              giúp tối ưu vận hành, quản lý dữ liệu và phát triển
              doanh nghiệp trong kỷ nguyên số.
            </p>

            {/* FEATURES */}
            <div className="mt-12 space-y-5">

              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-center">
                  <Zap size={20} className="text-cyan-300" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">
                    Quản trị thông minh
                  </p>
                  <p className="text-blue-200/50 text-xs mt-1">
                    Tối ưu quy trình vận hành doanh nghiệp
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-center">
                  <ShieldCheck size={20} className="text-cyan-300" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">
                    Bảo mật hệ thống
                  </p>
                  <p className="text-blue-200/50 text-xs mt-1">
                    Kiểm soát truy cập và dữ liệu an toàn
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/[0.07] border border-white/10 flex items-center justify-center">
                  <Building2 size={20} className="text-cyan-300" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">
                    Hệ sinh thái doanh nghiệp
                  </p>
                  <p className="text-blue-200/50 text-xs mt-1">
                    Quản lý tập trung trên một nền tảng
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* FOOTER */}
          <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6">
            <p className="text-blue-200/40 text-xs">
              © 2026 SUNNY AI
            </p>
            <div className="flex items-center gap-2 text-blue-200/50 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
              System Operational
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - LOGIN */}
        <div className="flex items-center justify-center p-6 sm:p-12 lg:p-14 relative">

          {/* Mobile background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] pointer-events-none" />

          <div className="w-full max-w-[390px] relative z-10">

            {/* MOBILE LOGO */}
            <div className="lg:hidden flex justify-center mb-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <span className="text-white text-2xl font-black">S</span>
                </div>
                <div>
                  <h1 className="text-white text-xl font-black tracking-[0.15em]">
                    SUNNY AI
                  </h1>
                  <p className="text-blue-300/60 text-[9px] tracking-[0.2em]">
                    ENTERPRISE SYSTEM
                  </p>
                </div>
              </div>
            </div>

            {/* TITLE */}
            <div className="mb-10">
              <div className="w-12 h-1 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 mb-7" />

              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Chào mừng trở lại
              </h2>

              <p className="text-slate-400 text-sm mt-3 leading-6">
                Đăng nhập để tiếp tục quản lý hệ thống doanh nghiệp của bạn.
              </p>
            </div>

            {/* SECURITY LABEL */}
            <div className="flex items-center gap-2 mb-8 text-xs text-blue-300/70">
              <Fingerprint size={16} />
              <span>SECURE AUTHENTICATION</span>
              <span className="flex-1 h-px bg-white/10 ml-2" />
            </div>

            {/* ERROR */}
            {error && (
              <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                <ShieldCheck size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleLogin} className="space-y-6">

              {/* USERNAME */}
              <div>
                <label className="block text-slate-300 text-sm font-semibold mb-3">
                  Tên đăng nhập
                </label>

                <div className="relative group">
                  <User
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors"
                  />

                  <input
                    type="text"
                    placeholder="Nhập tên đăng nhập"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoComplete="username"
                    required
                    className="w-full h-14 bg-[#0B1425] border border-white/[0.09] rounded-xl pl-12 pr-4 text-white text-sm placeholder:text-slate-600 outline-none transition-all duration-300 focus:border-blue-400/70 focus:bg-[#101F36] focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-slate-300 text-sm font-semibold">
                    Mật khẩu
                  </label>
                </div>

                <div className="relative group">
                  <Lock
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors"
                  />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="w-full h-14 bg-[#0B1425] border border-white/[0.09] rounded-xl pl-12 pr-12 text-white text-sm placeholder:text-slate-600 outline-none transition-all duration-300 focus:border-blue-400/70 focus:bg-[#101F36] focus:ring-4 focus:ring-blue-500/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword
                      ? <EyeOff size={19} />
                      : <Eye size={19} />
                    }
                  </button>
                </div>
              </div>

              {/* SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 mt-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-600/20 hover:shadow-blue-500/40 transition-all duration-300 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    ĐANG XÁC THỰC...
                  </>
                ) : (
                  <>
                    ĐĂNG NHẬP HỆ THỐNG
                    <ArrowRight
                      size={19}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </button>

            </form>

            {/* SECURITY FOOTER */}
            <div className="mt-10 pt-7 border-t border-white/[0.08]">
              <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
                <Lock size={13} />
                <span>Kết nối bảo mật và được mã hóa</span>
              </div>

              <p className="text-center text-slate-600 text-[11px] mt-5 tracking-wide">
                COPYRIGHT © 2026 SUNNY AI. ALL RIGHTS RESERVED.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
