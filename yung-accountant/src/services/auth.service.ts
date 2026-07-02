// services/auth.service.ts
import { authAxios } from './api/axios.config';
import { ENDPOINTS } from './api/endpoints';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from './types/user.types';

// ============================================
// COOKIE HELPERS — storage layer (replaces localStorage)
// ============================================

function setCookieValue(name: string, value: string, maxAgeSeconds: number) {
  // Not HttpOnly — JS needs to read access_token for Bearer header
  document.cookie = `${name}=${value}; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

function getCookieValue(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Path=/; SameSite=Lax; Max-Age=0`;
}

// ============================================
// PUBLIC API — used by axios interceptor
// ============================================

export function getAccessToken(): string | null {
  return getCookieValue('access_token');
}

export function getRefreshToken(): string | null {
  return getCookieValue('refresh_token');
}

// ============================================
// AUTH SERVICE
// ============================================

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await authAxios.post<LoginResponse>(
      ENDPOINTS.AUTH.LOGIN,
      data
    );

    // Store tokens in cookies (replaces localStorage)
    if (response.data.token) {
      setCookieValue('access_token', response.data.token, 1800);      // 30 min
      setCookieValue('refresh_token', response.data.refreshToken || '', 5184000); // 60 days
    }

    return response.data;
  },

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await authAxios.post<RegisterResponse>(
      ENDPOINTS.USERS.REGISTER,
      data
    );
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await authAxios.post(ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Error en logout:', error);
    }
    deleteCookie('access_token');
    deleteCookie('refresh_token');
  },

  async refreshToken(): Promise<boolean> {
    const currentRefresh = getRefreshToken();
    if (!currentRefresh) return false;

    try {
      const response = await authAxios.post<{ token?: string; refreshToken?: string }>(
        ENDPOINTS.AUTH.REFRESH,
        { refreshToken: currentRefresh }
      );

      if (response.data.token) {
        setCookieValue('access_token', response.data.token, 1800);
      }
      if (response.data.refreshToken) {
        setCookieValue('refresh_token', response.data.refreshToken, 5184000);
      }

      return !!(response.data.token || getAccessToken());
    } catch (error) {
      console.error('Error refreshing token:', error);
      deleteCookie('access_token');
      deleteCookie('refresh_token');
      return false;
    }
  },

  isAuthenticated(): boolean {
    const token = getAccessToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return Date.now() < payload.exp * 1000;
      } catch {}
    }
    return !!getRefreshToken();
  },
};
