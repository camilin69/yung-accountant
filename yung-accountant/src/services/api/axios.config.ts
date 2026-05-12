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

export const goalsAxios = axios.create({
  baseURL: MICROSERVICES.GOALS,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const habitsAxios = axios.create({
  baseURL: MICROSERVICES.HABITS,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }, 
  withCredentials: true,
});

export const transactionsAxios = axios.create({
  baseURL: MICROSERVICES.TRANSACTIONS,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const walletsAxios = axios.create({
  baseURL: MICROSERVICES.WALLETS,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});


export const simulationsAxios = axios.create({
  baseURL: MICROSERVICES.SIMULATIONS,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const communityAxios = axios.create({
  baseURL: MICROSERVICES.COMMUNITY,
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
categoriesAxios.interceptors.request.use(attachToken);
debtsAxios.interceptors.request.use(attachToken);
goalsAxios.interceptors.request.use(attachToken);
habitsAxios.interceptors.request.use(attachToken);
transactionsAxios.interceptors.request.use(attachToken);
walletsAxios.interceptors.request.use(attachToken);
simulationsAxios.interceptors.request.use(attachToken);
communityAxios.interceptors.request.use(attachToken);
axiosInstance.interceptors.request.use(attachToken);

let isRefreshing = false;
let refreshFailed = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any = null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor para refresh token
const handleUnauthorized = async (error: any) => {
  const originalRequest = error.config;
  
  const isAuth = originalRequest.url?.includes('/auth/login') || 
                 originalRequest.url?.includes('/users/register') ||
                 originalRequest.url?.includes('/auth/refresh');
  
  if (isAuth) return Promise.reject(error);
  
  if (error.response?.status === 401 && !originalRequest._retry) {
    // Si el refresh ya falló, no seguir intentando
    if (refreshFailed) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      return Promise.reject(error);
    }
    
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => axiosInstance(originalRequest));
    }
    
    originalRequest._retry = true;
    isRefreshing = true;
    
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      const clientId = localStorage.getItem('client_id');
      if (!refreshToken) throw new Error('No refresh token');
      
      const response = await axios.post(
        `${MICROSERVICES.AUTH}/auth/refresh`, 
        { refreshToken, clientId },
        { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
      );
      
      localStorage.setItem('access_token', response.data.token);
      localStorage.setItem('refresh_token', response.data.refreshToken);
      if (response.data.clientId) localStorage.setItem('client_id', response.data.clientId);
      
      refreshFailed = false; // Resetear al tener éxito
      processQueue(null, response.data.token);
      
      originalRequest.headers.Authorization = `Bearer ${response.data.token}`;
      return axiosInstance(originalRequest);
      
    } catch (refreshError) {
      refreshFailed = true; // Marcar como fallido
      processQueue(refreshError, null);
      
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('client_id');
      
      // Solo disparar UNA VEZ
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
  
  return Promise.reject(error);
};


authAxios.interceptors.response.use((r) => r, handleUnauthorized);
usersAxios.interceptors.response.use((r) => r, handleUnauthorized);
categoriesAxios.interceptors.response.use((r) => r, handleUnauthorized);
debtsAxios.interceptors.response.use((r) => r, handleUnauthorized);
goalsAxios.interceptors.response.use((r) => r, handleUnauthorized);
habitsAxios.interceptors.response.use((r) => r, handleUnauthorized);
transactionsAxios.interceptors.response.use((r) => r, handleUnauthorized);
walletsAxios.interceptors.response.use((r) => r, handleUnauthorized);
simulationsAxios.interceptors.response.use((r) => r, handleUnauthorized);
communityAxios.interceptors.response.use((r) => r, handleUnauthorized);
axiosInstance.interceptors.response.use((r) => r, handleUnauthorized);