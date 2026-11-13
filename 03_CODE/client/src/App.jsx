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
import Attendance from './pages/Attendance';
import Payrolls from './pages/Payrolls';
import SOP from './pages/SOP';
import Assets from './pages/Assets';
import Costs from './pages/Costs';
import Marketing from './pages/Marketing';
import ShiftReports from './pages/ShiftReports'; 
import ChatHistory from './pages/ChatHistory'; 
import Incidents from './pages/Incidents'; // <-- Đã import

const ProtectedRoute = ({ children }) => {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />;
};

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
        
        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route index element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan']}><Dashboard /></RoleRoute>} />
          
          <Route path="users" element={<RoleRoute allowedRoles={['giam_doc']}><Users /></RoleRoute>} />
          <Route path="marketing" element={<RoleRoute allowedRoles={['giam_doc']}><Marketing /></RoleRoute>} />
          
          <Route path="items" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan']}><Items /></RoleRoute>} />
          <Route path="payrolls" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan']}><Payrolls /></RoleRoute>} />
          <Route path="costs" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan']}><Costs /></RoleRoute>} />
          <Route path="assets" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan']}><Assets /></RoleRoute>} />
          
          <Route path="partners" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan', 'ctv']}><Partners /></RoleRoute>} />
          <Route path="orders" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan', 'ctv']}><Orders /></RoleRoute>} />
          
          <Route path="stock" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan', 'to_truong']}><Stock /></RoleRoute>} />
          <Route path="tasks" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan', 'ctv']}><Tasks /></RoleRoute>} />
          <Route path="sop" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan', 'ctv']}><SOP /></RoleRoute>} />
          <Route path="attendance" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan', 'ctv']}><Attendance /></RoleRoute>} />
          <Route path="shift-reports" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan']}><ShiftReports /></RoleRoute>} />
          <Route path="chat-history" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan', 'ctv']}><ChatHistory /></RoleRoute>} />
          
          {/* ĐÃ THÊM ROUTE CHO TRANG XỬ LÝ VI PHẠM */}
          <Route path="incidents" element={<RoleRoute allowedRoles={['giam_doc', 'ke_toan', 'to_truong', 'cong_nhan']}><Incidents /></RoleRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}