import axios from 'axios';
import { MICROSERVICES } from './endpoints';
import { OfflineError } from './offline.types';
import { getAccessToken, getRefreshToken } from '../auth.service';

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

// ============================================
// ATTACH BEARER TOKEN FROM MEMORY
// ============================================

const attachToken = (config: any) => {
  // Don't attach to login, register, or refresh requests
  const isPublic = config.url?.includes('/auth/login') ||
                   config.url?.includes('/users/register') ||
                   config.url?.includes('/auth/refresh');
  if (isPublic) return config;

  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

// ============================================
// REFRESH TOKEN STATE
// ============================================

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

// ============================================
// ATTACH INTERCEPTORS TO ALL INSTANCES
// ============================================
const allAxiosInstances = [
  authAxios, usersAxios, categoriesAxios, debtsAxios, goalsAxios,
  habitsAxios, transactionsAxios, walletsAxios, simulationsAxios,
  communityAxios, axiosInstance,
];

// ============================================
// CANCEL ONLY SAFE READS WHEN OFFLINE
// Mutations (POST/PUT/PATCH/DELETE) must reach
// the service worker so BackgroundSyncPlugin can
// queue them for replay when back online.
// ============================================
const cancelWhenOffline = (config: any) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const method = (config.method || 'get').toLowerCase();
    // Only cancel safe / idempotent reads. Mutations go through to the SW.
    if (method === 'get' || method === 'head' || method === 'options') {
      const source = axios.CancelToken.source();
      config.cancelToken = source.token;
      source.cancel('OFFLINE');
    }
  }
  return config;
};

allAxiosInstances.forEach((instance) => {
  // 1. Cancel requests when offline (stops all network activity)
  instance.interceptors.request.use(cancelWhenOffline);
  // 2. Attach Bearer token
  instance.interceptors.request.use(attachToken);

  // Response: single unified error handler (offline → 401 → reject)
  instance.interceptors.response.use(
    (response) => {
      // Mark cache hits
      if (response.headers?.['x-served-from-cache'] === 'true') {
        (response.config as any).fromCache = true;
      }
      return response;
    },
    async (error) => {
      // 1. Check if offline first
      if (!error.response) {
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
        if (isOffline && (error.code === 'ERR_NETWORK' ||
            (error.code === 'ECONNABORTED' && error.message?.includes('timeout')))) {
          return Promise.reject(
            new OfflineError('You are offline. Cached data may be available.', false)
          );
        }
      }

      // 2. Handle 401 with token refresh
      if (error.response?.status === 401) {
        const originalRequest = error.config;

        // Don't intercept refresh/login/register
        if (originalRequest.url?.includes('/auth/refresh')) {
          refreshFailed = true;
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          return Promise.reject(error);
        }
        if (originalRequest.url?.includes('/auth/login') ||
            originalRequest.url?.includes('/users/register')) {
          return Promise.reject(error);
        }

        if (!originalRequest._retry && !refreshFailed) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            }).then(() => axios(originalRequest));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const refreshToken = getRefreshToken();
            if (!refreshToken) throw new Error('No refresh token');

            const response = await authAxios.post('/auth/refresh', { refreshToken });

            // Store new tokens in cookies
            if (response.data?.token) {
              document.cookie = `access_token=${response.data.token}; Path=/; SameSite=Lax; Max-Age=1800`;
            }
            if (response.data?.refreshToken) {
              document.cookie = `refresh_token=${response.data.refreshToken}; Path=/; SameSite=Lax; Max-Age=5184000`;
            }

            refreshFailed = false;
            processQueue(null, response.data?.token || 'refreshed');
            isRefreshing = false;

            // Reload page so all components re-fetch with new valid token
            // The SW precache makes this near-instant
            window.location.reload();
            return Promise.resolve(null);

          } catch (refreshError) {
            refreshFailed = true;
            processQueue(refreshError, null);
            isRefreshing = false;

            document.cookie = 'access_token=; Path=/; SameSite=Lax; Max-Age=0';
            document.cookie = 'refresh_token=; Path=/; SameSite=Lax; Max-Age=0';

            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
            return Promise.reject(refreshError);
          }
        }

        if (refreshFailed) {
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
      }

      return Promise.reject(error);
    }
  );
});
