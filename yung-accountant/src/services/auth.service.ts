// services/auth.service.ts
import { authAxios } from './api/axios.config';
import { ENDPOINTS } from './api/endpoints';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from './types/user.types';

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await authAxios.post<LoginResponse>(
        ENDPOINTS.AUTH.LOGIN,
        data
      );
      
      if (response.data.token) {
        localStorage.setItem('access_token', response.data.token);
        localStorage.setItem('refresh_token', response.data.refreshToken);
      }
      
      return response.data;
    } catch (error: any) {
      // Limpiar tokens en caso de error de login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // Propagar el error para que el componente lo maneje
      throw error;
    }
  },
  
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await authAxios.post<RegisterResponse>(
      ENDPOINTS.USERS.REGISTER,
      data
    );
    return response.data;
  },
  
  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
      try {
        await authAxios.post(ENDPOINTS.AUTH.LOGOUT, { refreshToken });
      } catch (error) {
        console.error('Error en logout:', error);
      }
    }
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
  
  async refreshToken(): Promise<{ token: string; refreshToken: string } | null> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return null;
    
    try {
      const response = await authAxios.post<{ token: string; refreshToken: string }>(
        ENDPOINTS.AUTH.REFRESH,
        { refreshToken }
      );
      
      if (response.data.token) {
        localStorage.setItem('access_token', response.data.token);
        if (response.data.refreshToken) {
          localStorage.setItem('refresh_token', response.data.refreshToken);
        }
        return response.data;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    
    return null;
  },
  
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      return Date.now() < exp;
    } catch {
      return false;
    }
  },
  
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  },
  
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  },
};