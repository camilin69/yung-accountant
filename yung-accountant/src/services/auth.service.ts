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
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${value}; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
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
// PROACTIVE TOKEN REFRESH
// ============================================

const REFRESH_MARGIN_SECONDS = 0; // refresh right at token expiry (30 min)
const ACCESS_TOKEN_TTL = 1800;      // 30 min — must match backend

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Parse the JWT access token and schedule a refresh before it expires.
 * If the token can't be parsed, fall back to the default 30-min TTL
 * and refresh after 25 minutes.
 */
export function scheduleProactiveRefresh(): void {
  cancelProactiveRefresh();

  const token = getAccessToken();
  let expiresIn = ACCESS_TOKEN_TTL; // fallback: 30 min

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp) {
        const expMs = payload.exp * 1000;
        const nowMs = Date.now();
        const remaining = Math.floor((expMs - nowMs) / 1000);
        // Use the actual remaining time minus margin, or fallback
        if (remaining > REFRESH_MARGIN_SECONDS) {
          expiresIn = remaining - REFRESH_MARGIN_SECONDS;
        } else if (remaining > 60) {
          // Less than 5 min left but more than 1 min — refresh soon
          expiresIn = 60;
        } else {
          // Token already expired or about to — refresh immediately
          expiresIn = 5;
        }
      } else {
        // No exp claim — use fallback TTL minus margin
        expiresIn = ACCESS_TOKEN_TTL - REFRESH_MARGIN_SECONDS;
      }
    } catch {
      // Can't parse token — use fallback
      expiresIn = ACCESS_TOKEN_TTL - REFRESH_MARGIN_SECONDS;
    }
  } else {
    // No access token at all — check if we have a refresh token and try now
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      expiresIn = 5; // refresh almost immediately
    } else {
      return; // no tokens, nothing to schedule
    }
  }

  const delayMs = Math.max(1000, expiresIn * 1000);
  console.log(`[Auth] Scheduling token refresh in ${Math.round(delayMs / 1000)}s (${Math.round(delayMs / 60000)}min)`);

  refreshTimer = setTimeout(async () => {
    console.log('[Auth] Proactive refresh timer fired — calling /auth/refresh');
    const success = await refreshTokenInternal();
    if (success) {
      // Schedule the NEXT refresh based on the new token
      scheduleProactiveRefresh();
    } else {
      console.warn('[Auth] Proactive refresh failed — will retry on next 401');
      // Retry in 60 seconds
      refreshTimer = setTimeout(() => scheduleProactiveRefresh(), 60_000);
    }
  }, delayMs);
}

export function cancelProactiveRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Internal refresh that returns success but does NOT reload the page.
 * Used by the proactive timer so it can re-schedule.
 */
async function refreshTokenInternal(): Promise<boolean> {
  const currentRefresh = getRefreshToken();
  if (!currentRefresh) return false;

  try {
    const response = await authAxios.post<{ token?: string; refreshToken?: string }>(
      ENDPOINTS.AUTH.REFRESH,
      { refreshToken: currentRefresh }
    );

    if (response.data.token) {
      setCookieValue('access_token', response.data.token, ACCESS_TOKEN_TTL);
    }
    if (response.data.refreshToken) {
      setCookieValue('refresh_token', response.data.refreshToken, 5184000); // 60 days
    }

    return !!(response.data.token || getAccessToken());
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
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
      setCookieValue('access_token', response.data.token, ACCESS_TOKEN_TTL);
      setCookieValue('refresh_token', response.data.refreshToken || '', 5184000); // 60 days
      // Start proactive refresh timer
      scheduleProactiveRefresh();
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
    cancelProactiveRefresh();
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
        setCookieValue('access_token', response.data.token, ACCESS_TOKEN_TTL);
      }
      if (response.data.refreshToken) {
        setCookieValue('refresh_token', response.data.refreshToken, 5184000);
      }

      const success = !!(response.data.token || getAccessToken());
      if (success) {
        // Re-schedule proactive refresh based on the new token
        scheduleProactiveRefresh();
      }
      return success;
    } catch (error) {
      console.error('Error refreshing token:', error);
      deleteCookie('access_token');
      deleteCookie('refresh_token');
      cancelProactiveRefresh();
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
