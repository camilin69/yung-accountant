// services/api/auth.interceptor.ts
import { authAxios, usersAxios, postsAxios, axiosInstance } from './axios.config';
import { useUserStore } from '../../store/user.store';
import { mapBackendError } from '../types/error.types';

// Cola de peticiones mientras se refresca el token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

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

const isAuthEndpoint = (url: string = '') => {
  return url.includes('/auth/login') ||
         url.includes('/users/register') ||
         url.includes('/auth/refresh') ||
         url.includes('/auth/logout');
};



const handleUnauthorized = async (error: any) => {
  const originalRequest = error.config;
  
  // CRITICAL: No interceptar errores de endpoints de autenticación
  if (isAuthEndpoint()) {
    // Mapear el error antes de rechazar
    const mappedError = mapBackendError(error);
    return Promise.reject(mappedError);
  }
  
  // Evitar loops infinitos
  if (originalRequest._retry) {
    return Promise.reject(error);
  }
  
  if (error.response?.status === 401) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => axiosInstance(originalRequest))
        .catch(err => Promise.reject(err));
    }
    
    originalRequest._retry = true;
    isRefreshing = true;
    
    try {
      const { refreshSession } = useUserStore.getState();
      const refreshed = await refreshSession();
      
      if (refreshed) {
        const newToken = localStorage.getItem('access_token');
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } else {
        processQueue(new Error('Refresh failed'), null);
        // CRITICAL: No redirigir automáticamente, dejar que el componente maneje
        useUserStore.getState().logout();
        return Promise.reject(error);
      }
    } catch (refreshError) {
      processQueue(refreshError, null);
      useUserStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
  
  return Promise.reject(error);
};

// Aplicar interceptores
authAxios.interceptors.response.use((response) => response, handleUnauthorized);
usersAxios.interceptors.response.use((response) => response, handleUnauthorized);
postsAxios.interceptors.response.use((response) => response, handleUnauthorized);
axiosInstance.interceptors.response.use((response) => response, handleUnauthorized);