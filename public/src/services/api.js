import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3002/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-auth-token'] = token;
    console.log('Token being sent:', token.substring(0, 20) + '...');
  } else {
    console.log('No token found in localStorage');
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Add response interceptor to handle token errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      console.log('Authentication error, clearing localStorage');
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      // Optionally redirect to login
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;