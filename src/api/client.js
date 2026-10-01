import axios from 'axios';

const PRODUCTION_API_URL = 'https://documind-ai-backend-8ssm.onrender.com/api';

// Base URL resolution:
// In production builds (e.g. Vercel deployment), ensure we never accidentally target localhost or relative proxy.
let API_BASE_URL = import.meta.env.VITE_API_URL || PRODUCTION_API_URL;

if (import.meta.env.PROD) {
  if (
    !API_BASE_URL ||
    API_BASE_URL.includes('localhost') ||
    API_BASE_URL.includes('127.0.0.1') ||
    API_BASE_URL === '/api'
  ) {
    API_BASE_URL = PRODUCTION_API_URL;
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s timeout to allow for Render free-tier cold starts
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('documind_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor for clear, user-facing error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected network error occurred. Please check your connection.';
    if (error.response) {
      if (error.response.status === 401 || error.response.status === 403) {
        // Clear token on auth failure
        if (!window.location.pathname.includes('/auth')) {
          localStorage.removeItem('documind_token');
          localStorage.removeItem('documind_user');
          window.location.href = '/auth';
        }
      }
      message = error.response.data?.error || message;
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      message = 'The server is taking longer than usual to respond (Render free-tier cold start). Please wait a few moments and try again.';
    } else if (error.request) {
      message = 'Cannot connect to DocuMind API server. If the backend is waking up, please give it 30 seconds and refresh.';
    }
    return Promise.reject(new Error(message));
  }
);
