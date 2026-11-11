import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Partners from './pages/Partners';
import Users from './pages/Users';
import Items from './pages/Items';
import Orders from './pages/Orders';
import Stock from './pages/Stock';
import Tasks from './pages/Tasks';
import Payrolls from './pages/Payrolls';
import SOP from './pages/SOP';
import Assets from './pages/Assets';
import Costs from './pages/Costs';
import Marketing from './pages/Marketing';

// 1. Chặn nếu chưa đăng nhập
const ProtectedRoute = ({ children }) => {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />;
};

// 2. Chặn nếu đăng nhập rồi nhưng KHÔNG CÓ QUYỀN (Gõ link trực tiếp)
const RoleRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.role) return <Navigate to="/login" />;
  return allowedRoles.includes(user.role) ? children : <Navigate to="/" />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Các trang chỉ Giám đốc mới được vào */}
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan']}><Dashboard /></RoleRoute>} />
          <Route path="users" element={<RoleRoute allowedRoles={['giam_doc']}><Users /></RoleRoute>} />
          <Route path="marketing" element={<RoleRoute allowedRoles={['giam_doc']}><Marketing /></RoleRoute>} />
          
          {/* Các trang Kế toán được vào */}
          <Route path="items" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan']}><Items /></RoleRoute>} />
          <Route path="payrolls" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan']}><Payrolls /></RoleRoute>} />
          <Route path="costs" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan']}><Costs /></RoleRoute>} />
          <Route path="assets" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan']}><Assets /></RoleRoute>} />
          
          {/* Các trang dùng chung (Kinh doanh, Kho, CTV) */}
          <Route path="partners" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan', 'ctv']}><Partners /></RoleRoute>} />
          <Route path="orders" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan', 'ctv']}><Orders /></RoleRoute>} />
          
          {/* Các trang mọi người đều vào được */}
          <Route path="stock" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan', 'to_truong']}><Stock /></RoleRoute>} />
          <Route path="tasks" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan', 'ctv']}><Tasks /></RoleRoute>} />
          <Route path="sop" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan', 'ctv']}><SOP /></RoleRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}