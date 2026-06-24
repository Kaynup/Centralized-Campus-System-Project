import axios from 'axios';

import { setupMockInterceptor } from './mockInterceptor';

// TODO(security): Storing JWT tokens in localStorage makes them vulnerable to XSS.
// A more secure approach for production is HttpOnly cookies.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

setupMockInterceptor(apiClient);

// Request interceptor: Attach JWT token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('campus_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        // Clear token and emit an event so the AuthProvider can redirect smoothly
        localStorage.removeItem('campus_token');
        window.dispatchEvent(new CustomEvent('auth-unauthorized'));
      } else if (status === 500) {
        console.error('Server Error (500): Something went wrong.');
        window.dispatchEvent(new CustomEvent('toast-alert', {
          detail: { message: 'Something went wrong. Please try again.', type: 'error' }
        }));
      }
    } else {
      // Network or timeout errors
      window.dispatchEvent(new CustomEvent('toast-alert', {
        detail: { message: 'Something went wrong. Please try again.', type: 'error' }
      }));
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('campus_token', token);
  } else {
    localStorage.removeItem('campus_token');
  }
};

export default apiClient;
