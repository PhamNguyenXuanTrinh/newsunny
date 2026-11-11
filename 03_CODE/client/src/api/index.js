import axios from 'axios';

// ============================================================
// CẤU HÌNH BASE URL
// ============================================================
// Bỏ comment 1 trong 2 dòng dưới để chọn môi trường:

// --- Môi trường LOCAL ---
const BASE_URL = 'http://localhost:3000/api';

// --- Môi trường RENDER (production) ---
// const BASE_URL = 'https://newsunny.onrender.com/api';

const api = axios.create({ 
  baseURL: BASE_URL 
});

// Gắn token tự động vào mỗi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;