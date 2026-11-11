import axios from 'axios';

// Trỏ thẳng link Backend Render của bạn
const api = axios.create({ 
  baseURL: 'https://newsunny.onrender.com/api' 
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;