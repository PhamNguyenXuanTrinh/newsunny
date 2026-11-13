import { useEffect, useMemo, useState } from 'react';
import api from '../api';
import {
  Plus, Edit2, X, KeyRound, Trash2, UserRound, MapPin,
  BriefcaseBusiness, Search, UsersRound, UserCheck, ShieldCheck,
  WalletCards, Sparkles, Loader2, Save, CheckCircle2, XCircle,
  AlertTriangle, Phone, Mail
} from 'lucide-react';
import DataTable from '../components/DataTable';

const EMPTY = {
  username:'', password:'123', role:'cong_nhan', status:'active',
  full_name:'', dob:'', gender:'male', cccd:'', cccd_date:'', cccd_place:'',
  phone:'', email:'', permanent_address:'', current_address:'', emergency_contact:'',
  team_id:'', position:'', join_date:'', contract_type:'official',
  salary_base:0, bank_account:'', bank_name:'', tax_code:'', bhxh_code:''
};

const ROLE = {
  giam_doc:{label:'Giám đốc',color:'bg-red-50 text-red-700'},
  ke_toan:{label:'Kế toán',color:'bg-amber-50 text-amber-700'},
  to_truong:{label:'Tổ trưởng',color:'bg-blue-50 text-blue-700'},
  cong_nhan:{label:'Công nhân',color:'bg-slate-100 text-slate-700'},
  ctv:{label:'CTV',color:'bg-violet-50 text-violet-700'}
};

const money = n => Number(n || 0).toLocaleString('vi-VN') + ' đ';
const dateValue = v => v ? String(v).slice(0,10) : '';

export default function Users() {
  const [users,setUsers] = useState([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [search,setSearch] = useState('');
  const [roleFilter,setRoleFilter] = useState('all');
  const [modal,setModal] = useState(false);
  const [currentUser,setCurrentUser] = useState(null);
  const [form,setForm] = useState(EMPTY);
  const [popup,setPopup] = useState(null);
  const [confirmBox,setConfirmBox] = useState(null);
  const [passwordBox,setPasswordBox] = useState(null);
  const [newPassword,setNewPassword] = useState('123456');

  const message = (type,title,text) => setPopup({type,title,text});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      setUsers([]);
      message('error','Không tải được nhân sự',err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(),0);
    return () => clearTimeout(timer);
  },[]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u => {
      const matchSearch = !q || [
        u.full_name,u.username,u.phone,u.email,u.position,u.cccd
      ].some(v => String(v || '').toLowerCase().includes(q));
      return matchSearch && (roleFilter === 'all' || u.role === roleFilter);
    });
  },[users,search,roleFilter]);

  const stats = useMemo(() => ({
    total:users.length,
    active:users.filter(x => x.status === 'active').length,
    workers:users.filter(x => x.role === 'cong_nhan').length,
    salary:users.filter(x => x.status === 'active').reduce((s,x) => s + Number(x.salary_base || 0),0)
  }),[users]);

  const change = (key,value) => setForm(x => ({...x,[key]:value}));

  const addNew = () => {
    setCurrentUser(null);
    setForm({...EMPTY});
    setModal(true);
  };

  const editUser = user => {
    setCurrentUser(user);
    setForm({
      username:user.username || '',
      password:'',
      role:user.role || 'cong_nhan',
      status:user.status || 'active',
      full_name:user.full_name || '',
      dob:dateValue(user.dob),
      gender:user.gender || 'male',
      cccd:user.cccd || '',
      cccd_date:dateValue(user.cccd_date),
      cccd_place:user.cccd_place || '',
      phone:user.phone || '',
      email:user.email || '',
      permanent_address:user.permanent_address || '',
      current_address:user.current_address || '',
      emergency_contact:user.emergency_contact || '',
      team_id:user.team_id || '',
      position:user.position || '',
      join_date:dateValue(user.join_date),
      contract_type:user.contract_type || 'official',
      salary_base:Number(user.salary_base || 0),
      bank_account:user.bank_account || '',
      bank_name:user.bank_name || '',
      tax_code:user.tax_code || '',
      bhxh_code:user.bhxh_code || ''
    });
    setModal(true);
  };

  const saveUser = async e => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {...form};
      ['dob','cccd_date','join_date'].forEach(k => {
        if (!payload[k]) payload[k] = null;
      });

      if (payload.team_id === '') payload.team_id = null;
      payload.salary_base = Number(payload.salary_base || 0);

      if (currentUser) {
        delete payload.password;
        await api.patch(`/users/${currentUser.id}`,payload);
      } else {
        await api.post('/users',payload);
      }

      setModal(false);
      await fetchUsers();
      message(
        'success',
        currentUser ? 'Cập nhật thành công' : 'Tạo nhân sự thành công',
        currentUser ? 'Hồ sơ nhân sự đã được cập nhật.' : 'Tài khoản và hồ sơ nhân sự mới đã được tạo.'
      );
    } catch (err) {
      message('error','Không thể lưu hồ sơ',err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const askDelete = user => setConfirmBox({
    user,
    title:'Cho nhân viên nghỉ việc?',
    text:`Xác nhận chuyển ${user.full_name} sang trạng thái nghỉ việc theo xử lý của hệ thống.`
  });

  const deleteUser = async () => {
    if (!confirmBox) return;
    const user = confirmBox.user;
    setConfirmBox(null);
    setSaving(true);

    try {
      await api.delete(`/users/${user.id}`);
      await fetchUsers();
      message('success','Đã cập nhật nhân sự',`${user.full_name} đã được xử lý nghỉ việc.`);
    } catch (err) {
      message('error','Không thể xử lý',err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const openPassword = user => {
    setPasswordBox(user);
    setNewPassword('123456');
  };

  const resetPassword = async e => {
    e.preventDefault();
    if (!newPassword.trim()) return;

    setSaving(true);
    try {
      await api.patch(`/users/${passwordBox.id}/reset-password`,{
        new_password:newPassword.trim()
      });

      const name = passwordBox.username;
      setPasswordBox(null);
      message('success','Đã cấp lại mật khẩu',`Mật khẩu của tài khoản "${name}" đã được thay đổi.`);
    } catch (err) {
      message('error','Không thể đổi mật khẩu',err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      header:'Nhân sự',accessor:'full_name',
      render:r => (
        <div className="flex min-w-[190px] items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-black text-blue-600">
            {(r.full_name || '?').trim().charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-800">{r.full_name}</p>
            <p className="mt-0.5 text-[9px] text-slate-400">@{r.username}</p>
          </div>
        </div>
      )
    },
    {
      header:'Chức vụ',accessor:'position',
      render:r => <span className="whitespace-nowrap text-xs font-semibold text-slate-600">{r.position || '—'}</span>
    },
    {
      header:'Phân quyền',accessor:'role',
      render:r => {
        const info = ROLE[r.role] || {label:r.role,color:'bg-slate-100 text-slate-600'};
        return <span className={`role-badge ${info.color}`}>{info.label}</span>;
      }
    },
    {
      header:'Liên hệ',accessor:'phone',
      render:r => (
        <div className="min-w-[130px]">
          <p className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-slate-600"><Phone size={11}/>{r.phone || '—'}</p>
          {r.email && <p className="mt-1 flex items-center gap-1.5 text-[9px] text-slate-400"><Mail size={10}/><span className="max-w-[150px] truncate">{r.email}</span></p>}
        </div>
      )
    },
    {
      header:'Lương cơ bản',accessor:'salary_base',
      render:r => <span className="whitespace-nowrap text-xs font-black text-emerald-600">{money(r.salary_base)}</span>
    },
    {
      header:'Trạng thái',accessor:'status',
      render:r => r.status === 'active'
        ? <span className="role-badge bg-emerald-50 text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/> Đang làm</span>
        : <span className="role-badge bg-slate-100 text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-slate-400"/> Tạm dừng</span>
    },
    {
      header:'Thao tác',accessor:'id',
      render:r => (
        <div className="flex gap-1">
          <button onClick={() => editUser(r)} className="action-btn text-blue-600 hover:bg-blue-50" title="Sửa hồ sơ"><Edit2 size={15}/></button>
          <button onClick={() => openPassword(r)} className="action-btn text-amber-600 hover:bg-amber-50" title="Cấp lại mật khẩu"><KeyRound size={15}/></button>
          <button onClick={() => askDelete(r)} className="action-btn text-red-500 hover:bg-red-50" title="Cho nghỉ việc"><Trash2 size={15}/></button>
        </div>
      )
    }
  ];

  const cards = [
    {label:'Tổng nhân sự',value:stats.total,sub:'Hồ sơ trên hệ thống',icon:UsersRound,color:'bg-blue-50 text-blue-600'},
    {label:'Đang làm việc',value:stats.active,sub:'Nhân sự đang hoạt động',icon:UserCheck,color:'bg-emerald-50 text-emerald-600'},
    {label:'Công nhân',value:stats.workers,sub:'Nhân sự sản xuất',icon:BriefcaseBusiness,color:'bg-violet-50 text-violet-600'},
    {label:'Tổng lương cơ bản',value:money(stats.salary),sub:'Nhân sự đang hoạt động',icon:WalletCards,color:'bg-amber-50 text-amber-600'}
  ];

  return (
    <div className="mx-auto max-w-[1600px] animate-[pageIn_.45s_ease-out]">
      <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.16em] text-blue-600">
            <Sparkles size={12}/> Nhân sự & Phân quyền
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Quản lý Nhân sự</h1>
          <p className="mt-1 text-xs text-slate-500">Quản lý hồ sơ, tài khoản, phân quyền và thông tin tài chính nhân viên.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="filter-box">
            <option value="all">Tất cả vai trò</option>
            <option value="giam_doc">Giám đốc</option>
            <option value="ke_toan">Kế toán</option>
            <option value="to_truong">Tổ trưởng</option>
            <option value="cong_nhan">Công nhân</option>
            <option value="ctv">CTV</option>
          </select>

          <div className="relative sm:w-60">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm nhân sự..." className="search-box"/>
          </div>

          <button onClick={addNew} className="main-btn"><Plus size={16}/> Thêm nhân sự</button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card,i) => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={{animationDelay:`${i*70}ms`}} className="stat-card animate-[cardIn_.45s_ease-out_both]">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.color}`}><Icon size={20}/></div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400">{card.label}</p>
                <p className="truncate text-lg font-black text-slate-900">{card.value}</p>
                <p className="truncate text-[9px] text-slate-400">{card.sub}</p>
              </div>
              <div className="shine"/>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,.05)]">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-blue-600"/><b className="text-sm text-slate-800">Danh sách nhân sự</b></div>
            <p className="mt-1 text-[10px] text-slate-400">Hiển thị {filtered.length}/{users.length} hồ sơ</p>
          </div>
          <div className="hidden rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700 sm:block">{stats.active} đang hoạt động</div>
        </div>
        <div className="p-2"><DataTable columns={columns} data={filtered} loading={loading}/></div>
      </div>

      {modal && (
        <Modal wide close={() => !saving && setModal(false)}>
          <div className="modal-top">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><UserRound size={19}/></div>
              <div><h3 className="font-black text-white">{currentUser ? 'Cập nhật hồ sơ nhân sự' : 'Thêm nhân sự mới'}</h3><p className="text-[10px] text-blue-100">Thông tin tài khoản, hồ sơ và tài chính</p></div>
            </div>
            <button onClick={() => setModal(false)} className="close-btn"><X size={18}/></button>
          </div>

          <form onSubmit={saveUser} className="max-h-[78vh] overflow-y-auto p-5">
            <Section icon={ShieldCheck} title="1. Tài khoản & Phân quyền">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Tên đăng nhập *"><input required disabled={!!currentUser} value={form.username} onChange={e => change('username',e.target.value)} className="input disabled:bg-slate-100"/></Field>
                {!currentUser && <Field label="Mật khẩu *"><input required value={form.password} onChange={e => change('password',e.target.value)} className="input"/></Field>}
                <Field label="Phân quyền *"><select value={form.role} onChange={e => change('role',e.target.value)} className="input"><option value="giam_doc">Giám đốc</option><option value="ke_toan">Kế toán</option><option value="to_truong">Tổ trưởng</option><option value="cong_nhan">Công nhân</option><option value="ctv">CTV</option></select></Field>
                <Field label="Trạng thái"><select value={form.status} onChange={e => change('status',e.target.value)} className="input"><option value="active">Đang làm việc</option><option value="suspended">Tạm đình chỉ</option></select></Field>
              </div>
            </Section>

            <Section icon={MapPin} title="2. Thông tin cá nhân">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2"><Field label="Họ và tên *"><input required value={form.full_name} onChange={e => change('full_name',e.target.value)} className="input"/></Field></div>
                <Field label="Ngày sinh"><input type="date" value={form.dob} onChange={e => change('dob',e.target.value)} className="input"/></Field>
                <Field label="Giới tính"><select value={form.gender} onChange={e => change('gender',e.target.value)} className="input"><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select></Field>
                <Field label="Số CCCD"><input value={form.cccd} onChange={e => change('cccd',e.target.value)} className="input"/></Field>
                <Field label="Ngày cấp"><input type="date" value={form.cccd_date} onChange={e => change('cccd_date',e.target.value)} className="input"/></Field>
                <div className="sm:col-span-2"><Field label="Nơi cấp"><input value={form.cccd_place} onChange={e => change('cccd_place',e.target.value)} className="input"/></Field></div>
                <Field label="Số điện thoại"><input value={form.phone} onChange={e => change('phone',e.target.value)} className="input"/></Field>
                <div className="sm:col-span-2 lg:col-span-3"><Field label="Email"><input type="email" value={form.email} onChange={e => change('email',e.target.value)} className="input"/></Field></div>
                <div className="sm:col-span-2"><Field label="Địa chỉ thường trú"><input value={form.permanent_address} onChange={e => change('permanent_address',e.target.value)} className="input"/></Field></div>
                <div className="sm:col-span-2"><Field label="Địa chỉ hiện tại"><input value={form.current_address} onChange={e => change('current_address',e.target.value)} className="input"/></Field></div>
                <div className="sm:col-span-2 lg:col-span-4"><Field label="Liên hệ khẩn cấp"><input value={form.emergency_contact} onChange={e => change('emergency_contact',e.target.value)} className="input" placeholder="Tên & số điện thoại"/></Field></div>
              </div>
            </Section>

            <Section icon={BriefcaseBusiness} title="3. Công việc & Tài chính">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Mã tổ"><input value={form.team_id} onChange={e => change('team_id',e.target.value)} className="input"/></Field>
                <Field label="Chức vụ"><input value={form.position} onChange={e => change('position',e.target.value)} className="input"/></Field>
                <Field label="Ngày vào làm"><input type="date" value={form.join_date} onChange={e => change('join_date',e.target.value)} className="input"/></Field>
                <Field label="Hợp đồng"><select value={form.contract_type} onChange={e => change('contract_type',e.target.value)} className="input"><option value="official">Chính thức</option><option value="probation">Thử việc</option><option value="seasonal">Thời vụ</option></select></Field>
                <div className="sm:col-span-2"><Field label="Lương cơ bản (VNĐ) *"><input required type="number" min="0" step="100000" value={form.salary_base} onChange={e => change('salary_base',e.target.value)} className="input font-black text-blue-600"/></Field></div>
                <Field label="Số tài khoản"><input value={form.bank_account} onChange={e => change('bank_account',e.target.value)} className="input"/></Field>
                <Field label="Ngân hàng"><input value={form.bank_name} onChange={e => change('bank_name',e.target.value)} className="input"/></Field>
                <Field label="Mã số thuế"><input value={form.tax_code} onChange={e => change('tax_code',e.target.value)} className="input"/></Field>
                <Field label="Mã BHXH"><input value={form.bhxh_code} onChange={e => change('bhxh_code',e.target.value)} className="input"/></Field>
              </div>
            </Section>

            <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-slate-100 bg-white py-4">
              <button type="button" onClick={() => setModal(false)} className="cancel-btn">Hủy</button>
              <button disabled={saving} className="main-btn disabled:opacity-50">{saving ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>} Lưu hồ sơ</button>
            </div>
          </form>
        </Modal>
      )}

      {passwordBox && (
        <Modal close={() => !saving && setPasswordBox(null)}>
          <div className="p-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><KeyRound size={25}/></div>
            <h3 className="mt-4 text-center text-lg font-black text-slate-900">Cấp lại mật khẩu</h3>
            <p className="mt-1 text-center text-xs text-slate-500">Tài khoản <b>{passwordBox.username}</b></p>

            <form onSubmit={resetPassword} className="mt-5">
              <Field label="Mật khẩu mới *">
                <input required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input" autoFocus/>
              </Field>
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={() => setPasswordBox(null)} className="cancel-btn flex-1">Hủy</button>
                <button disabled={saving} className="main-btn flex-1">{saving ? <Loader2 size={15} className="animate-spin"/> : <KeyRound size={15}/>} Đổi mật khẩu</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {confirmBox && (
        <Modal close={() => !saving && setConfirmBox(null)}>
          <div className="p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-red-50 text-red-500"><AlertTriangle size={29}/></div>
            <h3 className="mt-4 text-lg font-black text-slate-900">{confirmBox.title}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">{confirmBox.text}</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setConfirmBox(null)} className="cancel-btn flex-1">Hủy</button>
              <button onClick={deleteUser} className="danger-btn flex-1"><Trash2 size={14}/> Xác nhận</button>
            </div>
          </div>
        </Modal>
      )}

      {popup && (
        <Modal close={() => setPopup(null)}>
          <div className="p-6 text-center">
            {popup.type === 'success'
              ? <div className="popup-icon bg-emerald-50 text-emerald-500"><CheckCircle2 size={30}/></div>
              : popup.type === 'warning'
                ? <div className="popup-icon bg-amber-50 text-amber-500"><AlertTriangle size={30}/></div>
                : <div className="popup-icon bg-red-50 text-red-500"><XCircle size={30}/></div>
            }
            <h3 className="mt-4 text-lg font-black text-slate-900">{popup.title}</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">{popup.text}</p>
            <button onClick={() => setPopup(null)} className="mt-5 h-10 w-full rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-blue-600">Đã hiểu</button>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes cardIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes modalIn{from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:none}}
        .stat-card{position:relative;display:flex;align-items:center;gap:12px;overflow:hidden;border:1px solid #e2e8f0;border-radius:20px;background:#fff;padding:16px;box-shadow:0 5px 20px rgba(15,23,42,.04);transition:.3s}
        .stat-card:hover{transform:translateY(-4px);border-color:#dbeafe;box-shadow:0 18px 40px rgba(15,23,42,.09)}
        .shine{position:absolute;right:-25px;top:-25px;width:75px;height:75px;border-radius:999px;background:linear-gradient(135deg,rgba(59,130,246,.1),transparent);transition:.4s}.stat-card:hover .shine{transform:scale(1.5)}
        .main-btn,.danger-btn{display:flex;height:40px;align-items:center;justify-content:center;gap:7px;border-radius:12px;padding:0 17px;font-size:12px;font-weight:800;color:#fff;transition:.25s}
        .main-btn{background:linear-gradient(100deg,#2563eb,#4f46e5);box-shadow:0 8px 22px rgba(37,99,235,.2)}.danger-btn{background:#ef4444}.main-btn:hover,.danger-btn:hover{transform:translateY(-2px)}
        .search-box,.filter-box,.input{height:40px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;font-size:12px;color:#475569;outline:none;transition:.2s}.search-box{width:100%;padding:0 12px 0 34px}.filter-box{padding:0 30px 0 12px}.input{height:42px;width:100%;padding:0 12px;background:#f8fafc}
        .search-box:focus,.filter-box:focus,.input:focus{border-color:#93c5fd;background:#fff;box-shadow:0 0 0 3px #dbeafe}
        .role-badge{display:inline-flex;width:max-content;align-items:center;gap:5px;border-radius:999px;padding:5px 9px;font-size:9px;font-weight:900;white-space:nowrap}
        .action-btn{display:flex;height:34px;width:34px;align-items:center;justify-content:center;border-radius:10px;transition:.2s}.action-btn:hover{transform:scale(1.08)}
        .cancel-btn{height:40px;border-radius:12px;background:#f1f5f9;padding:0 20px;font-size:12px;font-weight:700;color:#475569;transition:.2s}.cancel-btn:hover{background:#e2e8f0}
        .modal-bg{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,.62);padding:12px;backdrop-filter:blur(7px)}
        .modal-box{width:100%;overflow:hidden;border-radius:24px;background:#fff;box-shadow:0 30px 90px rgba(15,23,42,.35);animation:modalIn .25s cubic-bezier(.16,1,.3,1)}
        .modal-top{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(110deg,#2563eb,#4f46e5,#6366f1);padding:17px 20px}.close-btn{border-radius:12px;background:rgba(255,255,255,.1);padding:8px;color:rgba(255,255,255,.8);transition:.2s}.close-btn:hover{transform:rotate(90deg);background:rgba(255,255,255,.2)}
        .popup-icon{margin:auto;display:flex;height:64px;width:64px;align-items:center;justify-content:center;border-radius:22px;animation:modalIn .35s ease-out}
        @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      `}</style>
    </div>
  );
}

function Modal({children,close,wide=false}) {
  return (
    <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && close?.()}>
      <div className={`modal-box ${wide ? 'max-w-[900px]' : 'max-w-[430px]'}`}>{children}</div>
    </div>
  );
}

function Field({label,children}) {
  return <label className="block"><span className="mb-1.5 block text-[10px] font-bold text-slate-500">{label}</span>{children}</label>;
}

function Section({icon:Icon,title,children}) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Icon size={14}/></div>
        <h4 className="text-xs font-black text-slate-800">{title}</h4>
      </div>
      {children}
    </section>
  );
}