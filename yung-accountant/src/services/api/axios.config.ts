// services/api/axios.config.ts
import axios from 'axios';
import { MICROSERVICES } from './endpoints';

// Cliente para Auth
export const authAxios = axios.create({
  baseURL: MICROSERVICES.AUTH,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Cliente para Users
export const usersAxios = axios.create({
  baseURL: MICROSERVICES.AUTH,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Cliente para Posts
export const postsAxios = axios.create({
  baseURL: MICROSERVICES.POSTS,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Cliente base
export const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Interceptor para agregar token SOLO a requests que no son auth
const attachToken = (config: any) => {
  // NO agregar token a endpoints de login/register
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
axiosInstance.interceptors.request.use(attachToken);

// Interceptor para manejar refresh token
const handleUnauthorized = async (error: any) => {
  const originalRequest = error.config;
  
  // CRITICAL: NO interceptar errores de endpoints de autenticación
  const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                         originalRequest.url?.includes('/users/register') ||
                         originalRequest.url?.includes('/auth/refresh');
  
  if (isAuthEndpoint) {
    // Dejar que el error pase directamente al componente
    return Promise.reject(error);
  }
  
  // Solo intentar refresh si es 401 y no es endpoint de auth
  if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token');
      }
      
      // Usar una instancia limpia para evitar loops
      const response = await axios.post(
        `${MICROSERVICES.AUTH}/auth/refresh`, 
        { refreshToken },
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000 
        }
      );
      
      const { token: newAccessToken, refreshToken: newRefreshToken } = response.data;
      
      localStorage.setItem('access_token', newAccessToken);
      localStorage.setItem('refresh_token', newRefreshToken);
      
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      // Limpiar tokens pero NO redirigir automáticamente
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // Emitir evento para que el componente maneje la redirección
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      
      return Promise.reject(refreshError);
    }
  }
  
  return Promise.reject(error);
};

authAxios.interceptors.response.use((response) => response, handleUnauthorized);
usersAxios.interceptors.response.use((response) => response, handleUnauthorized);
postsAxios.interceptors.response.use((response) => response, handleUnauthorized);
axiosInstance.interceptors.response.use((response) => response, handleUnauthorized);