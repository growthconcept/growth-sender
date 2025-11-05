import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me')
};

// Connections
export const connections = {
  list: () => api.get('/connections'),
  sync: () => api.post('/connections/sync'),
  getOne: (id) => api.get(`/connections/${id}`),
  updateStatus: (id) => api.put(`/connections/${id}/status`),
  getGroups: (id) => api.get(`/connections/${id}/groups`),
  delete: (id) => api.delete(`/connections/${id}`)
};

// Templates
export const templates = {
  list: () => api.get('/templates'),
  getOne: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.put(`/templates/${id}`, data),
  delete: (id) => api.delete(`/templates/${id}`)
};

// Campaigns
export const campaigns = {
  list: (params) => api.get('/campaigns', { params }),
  getOne: (id) => api.get(`/campaigns/${id}`),
  getLogs: (id, params) => api.get(`/campaigns/${id}/logs`, { params }),
  create: (data) => api.post('/campaigns', data),
  pause: (id) => api.post(`/campaigns/${id}/pause`),
  cancel: (id) => api.post(`/campaigns/${id}/cancel`),
  resume: (id) => api.post(`/campaigns/${id}/resume`),
  delete: (id) => api.delete(`/campaigns/${id}`)
};

// Dashboard
export const dashboard = {
  getMetrics: () => api.get('/dashboard/metrics'),
  getRecentCampaigns: (params) => api.get('/dashboard/recent-campaigns', { params }),
  getStats: (params) => api.get('/dashboard/stats', { params })
};

export default api;
