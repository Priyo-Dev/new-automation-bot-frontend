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
});

// Add API key from localStorage if available
api.interceptors.request.use((config) => {
  const storedKey = localStorage.getItem('api_key');
  if (storedKey) {
    config.headers['X-API-Key'] = storedKey;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('API Authentication failed');
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

export default api;
