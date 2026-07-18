// store/user.store.ts - Versión Optimizada
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, userService } from '../services';
import { isOfflineMutationError } from '../services/offlineHelper';
import { scheduleProactiveRefresh } from '../services/auth.service';
import type { UserProfile, UpdateUserRequest, RegisterRequest, PublicProfileUser } from '../services/types/user.types';

interface UserStore {
  accessToken: string | null;
  refreshToken: string | null;
  
  user: UserProfile | null;
  userCache: Map<string, { user: PublicProfileUser; timestamp: number }>;
  userLastFetch: number | null;
  userTTL: number;
  
  // Estado
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  
  // Acciones
  login: (email: string, password: string, turnstileToken?: string) => Promise<void>;
  register: (data: RegisterRequest, turnstileToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  initialize: () => Promise<void>;
  
  loadUserProfile: (forceRefresh?: boolean) => Promise<UserProfile | null>;
  getUserByUsername: (username: string) => Promise<PublicProfileUser | null>;
  updateProfile: (data: UpdateUserRequest) => Promise<UserProfile | null>;
  deleteAccount: () => Promise<void>;
  
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  
  clearCache: () => void;
  clearError: () => void;
}

const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      userCache: new Map(),
      user: null,
      userLastFetch: null,
      userTTL: USER_CACHE_TTL,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      isInitialized: false,
      clearError: () => set({ error: null }),
      
      initialize: async () => {
        // Set authenticated flag from stored tokens (no HTTP request).
        // The profile (/users/me) is loaded lazily by the Navbar/Dashboard
        // when the user enters a protected route — never on the landing page.
        const hasToken = document.cookie.includes('access_token=')
                      || !!localStorage.getItem('refresh_token');
        set({ isAuthenticated: hasToken, isInitialized: true });

        // Start proactive token refresh if authenticated
        if (hasToken) {
          scheduleProactiveRefresh();
        }
      },
      
      loadUserProfile: async (forceRefresh = false) => {
        const { user, userLastFetch, userTTL, isAuthenticated, refreshSession } = get();
        
        if (!isAuthenticated) return null;
        
        // Usar caché de memoria si es válido
        if (!forceRefresh && user && userLastFetch && 
            (Date.now() - userLastFetch) < userTTL) {
          return user;
        }
        
        set({ isLoading: true });
        
        try {
          const profile = await userService.getMyProfile();
          set({ 
            user: profile, 
            userLastFetch: Date.now(),
            isLoading: false 
          });
          return profile;
        } catch (error: any) {
          if (error.response?.status === 401) {
            const refreshed = await refreshSession();
            if (refreshed) {
              const profile = await userService.getMyProfile();
              set({ user: profile, userLastFetch: Date.now(), isLoading: false });
              return profile;
            }
          }
          set({ isLoading: false, error: error.message });
          return null;
        }
      },
      
      getUserByUsername: async (username: string) => {
        const { userCache } = get();
        
        // Verificar caché primero
        const cached = userCache.get(username);
        if (cached && (Date.now() - cached.timestamp) < USER_CACHE_TTL) {
          return cached.user;
        }
        
        set({ isLoading: true, error: null });
        
        try {
          const user = await userService.getUserByUsername(username);
          
          // Guardar en caché
          const newCache = new Map(userCache);
          newCache.set(username, { user, timestamp: Date.now() });
          set({ userCache: newCache, isLoading: false });
          
          return user;
        } catch (error: any) {
          set({ isLoading: false, error: error.message });
          return null;
        }
      },

      
      updateProfile: async (data) => {
        set({ isLoading: true });
        const prevUser = get().user;
        // Apply optimistic update to local state immediately
        if (prevUser) {
          set({
            user: { ...prevUser, ...data },
          });
        }
        try {
          await userService.updateMyProfile(data);
          const updatedProfile = await userService.getMyProfile();
          set({
            user: updatedProfile,
            userLastFetch: Date.now(),
            isLoading: false
          });
          return updatedProfile;
        } catch (error: any) {
          if (isOfflineMutationError(error)) {
            // Keep the optimistic update, SW queued it
            set({ isLoading: false });
            window.dispatchEvent(new CustomEvent('bg-sync:pending'));
            return get().user;
          }
          // Hard error — rollback
          set({ user: prevUser, isLoading: false, error: error.message });
          throw error;
        }
      },
      
      refreshSession: async () => {
        try {
          const success = await authService.refreshToken();
          if (success) {
            set({ isAuthenticated: true });
            scheduleProactiveRefresh();
            return true;
          }
        } catch (error) {
          console.error('Refresh failed:', error);
        }

        return false;
      },
      
      login: async (email, password, turnstileToken?) => {
        set({ isLoading: true, error: null });

        try {
            const response = await authService.login({ email, password, turnstileToken });

            // Tokens are now HttpOnly cookies set by the backend
            // Only store clientId for the interceptor fallback
            localStorage.setItem('client_id', response.clientId);

            // Update store for UI state
            set({
                isAuthenticated: true,
                isLoading: false
            });

            await get().loadUserProfile(true);
        } catch (error: any) {
            set({ error: error.message, isLoading: false, isAuthenticated: false });
            throw error;
        }
    },

      
      register: async (data, turnstileToken?) => {
        set({ isLoading: true, error: null });

        try {
          await authService.register({ ...data, turnstileToken });
          await get().login(data.email, data.password);
          set({ isLoading: false });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },
      
      logout: async () => {
          await authService.logout();
          // Cookies are cleared by the backend via Set-Cookie header
          localStorage.removeItem('client_id');
          set({
              user: null,
              userLastFetch: null, isAuthenticated: false,
              isLoading: false, error: null
          });
      },
      
      deleteAccount: async () => {
        await userService.deleteMyAccount();
        await get().logout();
      },
      
      followUser: async (userId) => {
        await userService.followUser(userId);
        // Invalidar caché del perfil (ya que followers cambió)
        set({ userLastFetch: null });
      },
      
      unfollowUser: async (userId) => {
        await userService.unfollowUser(userId);
        set({ userLastFetch: null });
      },
      
      clearCache: () => {
        set({ userLastFetch: null });
      }
    }),
    {
      name: 'yung-accountant-auth',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);