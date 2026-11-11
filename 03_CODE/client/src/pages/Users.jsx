import { useEffect, useState } from 'react';
import api from '../api';
import { Plus, Edit2, X, Key, Trash2, User, MapPin, Briefcase } from 'lucide-react';
import DataTable from '../components/DataTable';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // STATE FULL 25 TRƯỜNG
  const [formData, setFormData] = useState({
    username: '', password: '', role: 'cong_nhan', status: 'active',
    full_name: '', dob: '', gender: 'male', cccd: '', cccd_date: '', cccd_place: '',
    phone: '', email: '', permanent_address: '', current_address: '', emergency_contact: '',
    team_id: '', position: '', join_date: '', contract_type: 'official',
    salary_base: 0, bank_account: '', bank_name: '', tax_code: '', bhxh_code: ''
  });

  const fetchUsers = () => {
    setLoading(true);
    api.get('/users')
      .then(res => setUsers(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Bọc setTimeout để tránh cảnh báo setState đồng bộ trong React 18
    const timer = setTimeout(() => { fetchUsers(); }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleAddNew = () => {
    setCurrentUser(null);
    setFormData({
      username: '', password: '123', role: 'cong_nhan', status: 'active',
      full_name: '', dob: '', gender: 'male', cccd: '', cccd_date: '', cccd_place: '',
      phone: '', email: '', permanent_address: '', current_address: '', emergency_contact: '',
      team_id: '', position: '', join_date: '', contract_type: 'official',
      salary_base: 0, bank_account: '', bank_name: '', tax_code: '', bhxh_code: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (user) => {
    setCurrentUser(user);
    setFormData({
      username: user.username, password: '', role: user.role, status: user.status,
      full_name: user.full_name, 
      dob: user.dob ? user.dob.slice(0, 10) : '', 
      gender: user.gender || 'male', 
      cccd: user.cccd || '', 
      cccd_date: user.cccd_date ? user.cccd_date.slice(0, 10) : '', 
      cccd_place: user.cccd_place || '',
      phone: user.phone || '', email: user.email || '', permanent_address: user.permanent_address || '', 
      current_address: user.current_address || '', emergency_contact: user.emergency_contact || '',
      team_id: user.team_id || '', position: user.position || '', 
      join_date: user.join_date ? user.join_date.slice(0, 10) : '', 
      contract_type: user.contract_type || 'official',
      salary_base: user.salary_base || 0, bank_account: user.bank_account || '', bank_name: user.bank_name || '', 
      tax_code: user.tax_code || '', bhxh_code: user.bxhx_code || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const cleanData = { ...formData };
      const nullableFields = ['dob', 'cccd_date', 'join_date'];
      nullableFields.forEach(f => { if (cleanData[f] === '') cleanData[f] = null; });

      if (currentUser) {
        delete cleanData.password;
        await api.patch(`/users/${currentUser.id}`, cleanData);
        alert('Cập nhật thành công!');
      } else {
        await api.post('/users', cleanData);
        alert('Tạo tài khoản thành công!');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn cho nhân viên này nghỉ việc?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const handleResetPassword = async (id, username) => {
    const newPass = window.prompt(`Nhập mật khẩu mới cho tài khoản "${username}":`, '123456');
    if (!newPass) return;
    try {
      await api.patch(`/users/${id}/reset-password`, { new_password: newPass });
      alert('Đã cấp lại mật khẩu thành công!');
    } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
  };

  const columns = [
    { header: 'Tên đăng nhập', accessor: 'username', render: (r) => <span className="font-bold text-slate-800 whitespace-nowrap">{r.username}</span> },
    { header: 'Họ và tên', accessor: 'full_name', render: (r) => <span className="whitespace-nowrap">{r.full_name}</span> },
    { header: 'Chức vụ', accessor: 'position', render: (r) => <span className="whitespace-nowrap">{r.position || '-'}</span> },
    { header: 'Phân quyền', accessor: 'role', render: (r) => {
      const roleMap = {
        giam_doc: { label: 'Giám đốc', color: 'bg-red-100 text-red-700' },
        ke_toan: { label: 'Kế toán', color: 'bg-amber-100 text-amber-700' },
        to_truong: { label: 'Tổ trưởng', color: 'bg-blue-100 text-blue-700' },
        cong_nhan: { label: 'Công nhân', color: 'bg-slate-100 text-slate-700' },
        ctv: { label: 'CTV', color: 'bg-purple-100 text-purple-700' },
      };
      const info = roleMap[r.role] || { label: r.role, color: 'bg-gray-100' };
      return <span className={`px-2 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${info.color}`}>{info.label}</span>;
    }},
    { header: 'SĐT', accessor: 'phone', render: (r) => <span className="whitespace-nowrap">{r.phone || '-'}</span> },
    { header: 'Lương cơ bản', accessor: 'salary_base', render: (r) => <span className="font-semibold text-emerald-600 whitespace-nowrap">{Number(r.salary_base).toLocaleString('vi-VN')} đ</span> },
    { header: 'Thao tác', accessor: 'id', render: (r) => (
      <div className="flex gap-2">
        <button onClick={() => handleEdit(r)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="Sửa"><Edit2 size={16} /></button>
        <button onClick={() => handleResetPassword(r.id, r.username)} className="text-amber-600 hover:bg-amber-50 p-1.5 rounded" title="Cấp lại mật khẩu"><Key size={16} /></button>
        <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded" title="Cho nghỉ việc"><Trash2 size={16} /></button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      {/* HEADER: Mobile xếp dọc */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Nhân sự</h1>
          <p className="text-slate-500 text-sm mt-1">Hồ sơ nhân sự đầy đủ 25 trường thông tin.</p>
        </div>
        <button 
          onClick={handleAddNew} 
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm w-full sm:w-auto shrink-0"
        >
          <Plus size={18} /> Thêm nhân sự
        </button>
      </div>

      <DataTable columns={columns} data={users} loading={loading} />

      {/* Modal Full Trường (Dạng cuộn dọc) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-4 sm:px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">{currentUser ? 'Sửa hồ sơ nhân sự' : 'Thêm nhân sự mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 p-1"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto flex-1">
              
              {/* PHẦN 1: TÀI KHOẢN */}
              <h4 className="font-bold text-blue-600 flex items-center gap-2 mb-3 border-b pb-2"><User size={18}/> 1. Thông tin Tài khoản & Phân quyền</h4>
              {/* Grid: Mobile 1 cột, Tablet 2 cột, Desktop 4 cột */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div><label className="block text-sm font-medium mb-1">Tên đăng nhập *</label><input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-3 py-2 border rounded-lg disabled:bg-slate-100 focus:ring-2 focus:ring-blue-500" disabled={!!currentUser} /></div>
                <div><label className="block text-sm font-medium mb-1">Mật khẩu {currentUser ? '' : '*'}</label><input required={!currentUser} type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder={currentUser ? "Bỏ trống để giữ nguyên" : ""} /></div>
                <div><label className="block text-sm font-medium mb-1">Phân quyền *</label><select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"><option value="giam_doc">Giám đốc</option><option value="ke_toan">Kế toán</option><option value="to_truong">Tổ trưởng</option><option value="cong_nhan">Công nhân</option><option value="ctv">CTV</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Trạng thái</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"><option value="active">Đang làm việc</option><option value="suspended">Tạm đình chỉ</option></select></div>
              </div>

              {/* PHẦN 2: CÁ NHÂN */}
              <h4 className="font-bold text-blue-600 flex items-center gap-2 mb-3 border-b pb-2"><MapPin size={18}/> 2. Thông tin Cá nhân (Hồ sơ)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Họ và tên *</label><input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Ngày sinh</label><input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Giới tính</label><select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select></div>
                
                <div><label className="block text-sm font-medium mb-1">Số CCCD</label><input type="text" value={formData.cccd} onChange={e => setFormData({...formData, cccd: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Ngày cấp</label><input type="date" value={formData.cccd_date} onChange={e => setFormData({...formData, cccd_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Nơi cấp</label><input type="text" value={formData.cccd_place} onChange={e => setFormData({...formData, cccd_place: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>

                <div><label className="block text-sm font-medium mb-1">Số điện thoại</label><input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                <div className="sm:col-span-2 md:col-span-3"><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>

                <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Địa chỉ thường trú</label><input type="text" value={formData.permanent_address} onChange={e => setFormData({...formData, permanent_address: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1">Địa chỉ hiện tại</label><input type="text" value={formData.current_address} onChange={e => setFormData({...formData, current_address: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                <div className="sm:col-span-2 md:col-span-4"><label className="block text-sm font-medium mb-1">Người liên hệ khẩn cấp (Tên & SĐT)</label><input type="text" value={formData.emergency_contact} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
              </div>

              {/* PHẦN 3: CÔNG VIỆC & LƯƠNG */}
              <h4 className="font-bold text-blue-600 flex items-center gap-2 mb-3 border-b pb-2"><Briefcase size={18}/> 3. Công việc & Tài chính</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="block text-sm font-medium mb-1">Mã Tổ</label><input type="text" value={formData.team_id} onChange={e => setFormData({...formData, team_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Chức vụ</label><input type="text" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Ngày vào làm</label><input type="date" value={formData.join_date} onChange={e => setFormData({...formData, join_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Hợp đồng</label><select value={formData.contract_type} onChange={e => setFormData({...formData, contract_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"><option value="official">Chính thức</option><option value="probation">Thử việc</option><option value="seasonal">Thời vụ</option></select></div>
                
                <div className="sm:col-span-2"><label className="block text-sm font-medium text-blue-600 mb-1">Lương cơ bản (VNĐ) *</label><input required type="number" min="0" step="100000" value={formData.salary_base} onChange={e => setFormData({...formData, salary_base: Number(e.target.value)})} className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg font-bold text-blue-600 text-lg focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Số tài khoản NH</label><input type="text" value={formData.bank_account} onChange={e => setFormData({...formData, bank_account: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Tên Ngân hàng</label><input type="text" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                
                <div><label className="block text-sm font-medium mb-1">Mã số thuế cá nhân</label><input type="text" value={formData.tax_code} onChange={e => setFormData({...formData, tax_code: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm font-medium mb-1">Mã BHXH</label><input type="text" value={formData.bhxh_code} onChange={e => setFormData({...formData, bhxh_code: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
              </div>

              {/* Nút bấm: Mobile xếp dọc, ghim ở dưới cùng */}
              <div className="pt-6 mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3 border-t sticky bottom-0 bg-white">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg w-full sm:w-auto">Hủy</button>
                <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md font-bold w-full sm:w-auto">Lưu toàn bộ hồ sơ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}