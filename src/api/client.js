import axios from 'axios';

// Use environment variable or fallback to direct backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const API_KEY = import.meta.env.VITE_API_KEY || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
  withCredentials: true, // Enable sending cookies (for HttpOnly admin_token cookie)
});

// Add API key from localStorage (admin token now in HttpOnly cookie)
api.interceptors.request.use((config) => {
  const storedKey = localStorage.getItem('api_key');
  if (storedKey) {
    config.headers['X-API-Key'] = storedKey;
  }
  
  // Note: admin_token is now stored in HttpOnly cookie, so we don't need to set it here
  // The browser will automatically send cookies with requests
  
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login if not already on login page
      const isLoginRequest = error.config?.url?.includes('/admin/login');
      if (!isLoginRequest) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        // Trigger a page reload to show login
        window.dispatchEvent(new Event('auth-expired'));
      }
    }
    return Promise.reject(error);
  }
);

// Health & Stats
export const getHealth = () => api.get('/health');
export const getStats = () => api.get('/stats');
export const getConfig = () => api.get('/config');
export const updateConfig = (updates) => api.put('/config', updates);

// News Items
export const getNews = (params = {}) => api.get('/news', { params });
export const getNewsItem = (id) => api.get(`/news/${id}`);
export const editNewsItem = (id, data) => api.put(`/news/${id}/edit`, data);
export const deleteNewsItem = (id) => api.delete(`/news/${id}`);
export const approveNewsItem = (id) => api.post(`/news/${id}/approve`);
export const rejectNewsItem = (id) => api.post(`/news/${id}/reject`);
export const regenerateText = (id) => api.post(`/news/${id}/regenerate-text`);
export const regenerateImage = (id) => api.post(`/news/${id}/regenerate-image`);
export const generateContent = (id) => api.post(`/news/${id}/generate`);

// Pipeline Controls
export const runScan = (blocking = false) => api.post(`/system/run-scan?blocking=${blocking}`);
export const runGeneration = (blocking = false) => api.post(`/system/run-generation?blocking=${blocking}`);
export const runFullPipeline = (blocking = false) => api.post(`/system/run-full-pipeline?blocking=${blocking}`);
export const runAutoPublish = (minScore = 5) => api.post(`/system/auto-publish?min_score=${minScore}`);

// Jobs
export const getJobs = () => api.get('/system/jobs');
export const getJobStatus = (jobId) => api.get(`/system/jobs/${jobId}`);

// Logs
export const getLogs = (params = {}) => api.get('/logs', { params });
export const getLogsSummary = () => api.get('/logs/summary');
export const clearLogs = () => api.delete('/logs');

// Manual Post
export const createManualPost = (text, imageUrl = null, link = null) => {
  const params = new URLSearchParams({ text });
  if (imageUrl) params.append('image_url', imageUrl);
  if (link) params.append('link', link);
  return api.post(`/post/manual?${params.toString()}`);
};

// Admin Authentication
export const adminLogin = (username, password) => 
  api.post('/admin/login', { username, password });

export const adminLogout = () => api.post('/admin/logout');

export const getCurrentAdmin = () => api.get('/admin/me');

export const listAdmins = () => api.get('/admin/list');

export const createAdmin = (username, password, role = 'admin') =>
  api.post('/admin/create', { username, password, role });

export const deleteAdmin = (username) => api.delete(`/admin/${username}`);

export default api;
