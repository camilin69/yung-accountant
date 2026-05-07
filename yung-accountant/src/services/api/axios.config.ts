import axios from 'axios';
import { MICROSERVICES } from './endpoints';

export const authAxios = axios.create({
  baseURL: MICROSERVICES.AUTH,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const usersAxios = axios.create({
  baseURL: MICROSERVICES.AUTH,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const postsAxios = axios.create({
  baseURL: MICROSERVICES.POSTS,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const categoriesAxios = axios.create({
  baseURL: MICROSERVICES.CATEGORIES,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const debtsAxios = axios.create({
  baseURL: MICROSERVICES.DEBTS,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const axiosInstance = axios.create({
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Interceptor para agregar token
const attachToken = (config: any) => {
  const isAuthEndpoint = config.url?.includes('/auth/login') || 
                         config.url?.includes('/users/register') ||
                         config.url?.includes('/auth/refresh');
  
  if (!isAuthEndpoint) {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
};

authAxios.interceptors.request.use(attachToken);
usersAxios.interceptors.request.use(attachToken);
postsAxios.interceptors.request.use(attachToken);
categoriesAxios.interceptors.request.use(attachToken);
debtsAxios.interceptors.request.use(attachToken);
axiosInstance.interceptors.request.use(attachToken);

// Interceptor para refresh token
const handleUnauthorized = async (error: any) => {
  const originalRequest = error.config;
  
  const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                         originalRequest.url?.includes('/users/register') ||
                         originalRequest.url?.includes('/auth/refresh');
  
  if (isAuthEndpoint) return Promise.reject(error);
  
  if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      const clientId = localStorage.getItem('client_id');
      if (!refreshToken) throw new Error('No refresh token');
      
      const response = await axios.post(
        `${MICROSERVICES.AUTH}/auth/refresh`, 
        { refreshToken, clientId },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );
      
      localStorage.setItem('access_token', response.data.token);
      localStorage.setItem('refresh_token', response.data.refreshToken);
      if (response.data.clientId) localStorage.setItem('client_id', response.data.clientId);
      
      originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('client_id');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      return Promise.reject(refreshError);
    }
  }
  
  return Promise.reject(error);
};

authAxios.interceptors.response.use((r) => r, handleUnauthorized);
usersAxios.interceptors.response.use((r) => r, handleUnauthorized);
postsAxios.interceptors.response.use((r) => r, handleUnauthorized);
categoriesAxios.interceptors.response.use((r) => r, handleUnauthorized);
debtsAxios.interceptors.response.use((r) => r, handleUnauthorized);
axiosInstance.interceptors.response.use((r) => r, handleUnauthorized);