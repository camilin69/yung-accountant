// store/user.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services';
import { userService } from '../services/user.service';
import { AppError, ErrorCode, mapBackendError, type ErrorCodeType } from '../services/types/error.types';
import type { 
  RegisterRequest, 
  UpdateUserRequest,
  UserProfile 
} from '../services/types/user.types';

interface UserStore {
  // Tokens
  accessToken: string | null;
  refreshToken: string | null;
  
  // Usuario cacheado
  user: UserProfile | null;
  
  // Estado
  isLoading: boolean;
  error: AppError | null;
  errorCode: ErrorCodeType | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  tokenExpiresAt: number | null;
  
  // Callbacks para UI
  onError?: (error: AppError) => void;
  onSuccess?: (message: string) => void;
  
  // Acciones de autenticación
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  initialize: () => Promise<void>;
  
  // Acciones de perfil
  loadUserProfile: (forceRefresh?: boolean) => Promise<UserProfile | null>;
  updateProfile: (data: UpdateUserRequest) => Promise<UserProfile | null>;
  deleteAccount: () => Promise<void>;
  
  // Acciones sociales
  followUser: (targetUserId: string) => Promise<void>;
  unfollowUser: (targetUserId: string) => Promise<void>;
  
  // Setters
  setLoading: (isLoading: boolean) => void;
  setError: (error: AppError | null) => void;
  clearError: () => void;
  clearCache: () => void;
  setCallbacks: (onError: (error: AppError) => void, onSuccess: (message: string) => void) => void;
}

// Helper para decodificar el token
const getTokenExpiry = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000;
  } catch {
    return null;
  }
};

let refreshTimeoutId: number | null = null;

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => {
      const clearRefreshTimeout = () => {
        if (refreshTimeoutId !== null) {
          clearTimeout(refreshTimeoutId);
          refreshTimeoutId = null;
        }
      };
      
      const scheduleTokenRefresh = () => {
        clearRefreshTimeout();
        
        const { accessToken } = get();
        if (!accessToken) return;
        
        const expiresAt = getTokenExpiry(accessToken);
        if (!expiresAt) return;
        
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 0);
        
        if (refreshTime > 0) {
          refreshTimeoutId = window.setTimeout(() => {
            get().refreshSession();
          }, refreshTime);
        }
      };

      const getErrorMessage = (error: AppError): string => {
        switch (error.code) {
          case ErrorCode.INVALID_CREDENTIALS:
            return 'Invalid email or password. Please check your credentials.';
          case ErrorCode.USER_NOT_FOUND:
            return 'No account found with this email. Please register first.';
          case ErrorCode.EMAIL_ALREADY_REGISTERED:
            return 'Email already registered. Please use a different email.';
          case ErrorCode.INVALID_ROLE:
            return 'Invalid role specified.';
          case ErrorCode.INVALID_CLIENT_ID:
            return 'Invalid client ID.';
          case ErrorCode.TOKEN_EXPIRED:
            return 'Session expired. Please login again.';
          case ErrorCode.TOKEN_INVALID:
            return 'Invalid session. Please login again.';
          case ErrorCode.NETWORK_ERROR:
            return 'Network error. Please check your internet connection.';
          case ErrorCode.TIMEOUT_ERROR:
            return 'Request timeout. Please try again.';
          case ErrorCode.SERVER_ERROR:
            return 'Server error. Please try again later.';
          default:
            return error.message || 'An error occurred. Please try again.';
        }
      };
      
      return {
        accessToken: null,
        refreshToken: null,
        user: null,
        isLoading: false,
        error: null,
        errorCode: null,
        isAuthenticated: false,
        isInitialized: false,
        tokenExpiresAt: null,
        
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error, errorCode: error?.code || null }),
        clearError: () => set({ error: null, errorCode: null }),
        clearCache: () => set({ user: null }),
        
        setCallbacks: (onError, onSuccess) => set({ onError, onSuccess }),
        
        initialize: async () => {
          set({ isLoading: true });
          
          try {
            const accessToken = localStorage.getItem('access_token');
            const refreshToken = localStorage.getItem('refresh_token');
            
            if (!refreshToken) {
              set({ 
                accessToken: null,
                refreshToken: null,
                user: null,
                isAuthenticated: false,
                isLoading: false,
                isInitialized: true 
              });
              return;
            }
            
            set({ accessToken, refreshToken, isAuthenticated: true });
            
            const cachedUser = localStorage.getItem('cached_user');
            if (cachedUser) {
              try {
                const user = JSON.parse(cachedUser);
                set({ user });
              } catch (e) {
                console.error('Error parsing cached user:', e);
              }
            }
            
            const expiresAt = getTokenExpiry(accessToken || '');
            const isValid = expiresAt ? Date.now() < expiresAt : false;
            
            if (!isValid && accessToken) {
              const refreshed = await get().refreshSession();
              if (refreshed) {
                await get().loadUserProfile(true);
              }
            } else if (accessToken) {
              scheduleTokenRefresh();
            }
            
            set({ 
              isLoading: false,
              isInitialized: true 
            });
            
          } catch (error) {
            console.error('Error initializing auth:', error);
            set({ 
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
              accessToken: null,
              refreshToken: null,
              user: null
            });
          }
        },
        
        refreshSession: async (): Promise<boolean> => {
          const { refreshToken } = get();
          if (!refreshToken) return false;
          
          set({ isLoading: true });
          
          try {
            const response = await authService.refreshToken();
            if (response) {
              const newExpiresAt = getTokenExpiry(response.token);
              
              set({ 
                accessToken: response.token,
                refreshToken: response.refreshToken,
                tokenExpiresAt: newExpiresAt,
                isLoading: false,
                isAuthenticated: true 
              });
              
              scheduleTokenRefresh();
              return true;
            }
          } catch (error) {
            console.error('Refresh session failed:', error);
            set({ isLoading: false });
          }
          
          return false;
        },
        
        // store/user.store.ts - Parte de la función login
        login: async (email, password) => {
          set({ isLoading: true, error: null, errorCode: null });
          try {
            console.log('Login attempt for:', email);
            const response = await authService.login({ email, password });
            console.log('Login success:', response);
            const expiresAt = getTokenExpiry(response.token);
            
            set({ 
              accessToken: response.token,
              refreshToken: response.refreshToken,
              tokenExpiresAt: expiresAt,
              isLoading: false, 
              isAuthenticated: true,
              error: null,
              errorCode: null
            });
            
            scheduleTokenRefresh();
            await get().loadUserProfile(true);
            
            const { onSuccess } = get();
            if (onSuccess) {
              onSuccess('Login successful. Welcome back!');
            }
            
          } catch (error: any) {
            console.log('Login error caught in store:', error);
            
            // Usar el mapper de errores
            const appError = error instanceof AppError 
              ? error 
              : mapBackendError(error);
            
            console.log('Mapped error:', appError);
            
            set({ 
              error: appError, 
              errorCode: appError.code,
              isLoading: false, 
              isAuthenticated: false,
              accessToken: null,
              refreshToken: null
            });
            
            // Limpiar tokens en caso de error
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            
            const { onError } = get();
            if (onError) {
              onError(appError);
            }
            
            throw appError;
          }
        },
        
        register: async (userData) => {
          set({ isLoading: true, error: null, errorCode: null });
          try {
            await authService.register(userData);
            await get().login(userData.email, userData.password);
            set({ isLoading: false });
            
            const { onSuccess } = get();
            if (onSuccess) {
              onSuccess('Registration successful! Welcome!');
            }
            
          } catch (error) {
            const appError = error as AppError;
            const errorMessage = getErrorMessage(appError);
            appError.message = errorMessage;
            
            set({ error: appError, errorCode: appError.code, isLoading: false });
            
            const { onError } = get();
            if (onError) {
              onError(appError);
            }
            
            throw appError;
          }
        },
        
        logout: async () => {
          clearRefreshTimeout();
          set({ isLoading: true });
          try {
            await authService.logout();
            set({ 
              accessToken: null,
              refreshToken: null,
              user: null,
              tokenExpiresAt: null,
              isLoading: false, 
              isAuthenticated: false,
              error: null,
              errorCode: null
            });
            localStorage.removeItem('cached_user');
            
            const { onSuccess } = get();
            if (onSuccess) {
              onSuccess('Logged out successfully');
            }
            
          } catch (error) {
            console.error('Logout error:', error);
            set({ 
              accessToken: null,
              refreshToken: null,
              user: null,
              tokenExpiresAt: null,
              isLoading: false, 
              isAuthenticated: false,
              error: null,
              errorCode: null
            });
            localStorage.removeItem('cached_user');
          }
        },
        
        loadUserProfile: async (forceRefresh = false): Promise<UserProfile | null> => {
          const { user, isAuthenticated, refreshSession } = get();
          
          if (!isAuthenticated) return null;
          
          if (user && !forceRefresh) {
            return user;
          }
          
          set({ isLoading: true });
          
          try {
            const profile = await userService.getMyProfile();
            if (profile) {
              localStorage.setItem('cached_user', JSON.stringify(profile));
              set({ user: profile, isLoading: false });
              return profile;
            }
          } catch (error: any) {
            if (error.response?.status === 401) {
              const refreshed = await refreshSession();
              if (refreshed) {
                const profile = await userService.getMyProfile();
                if (profile) {
                  localStorage.setItem('cached_user', JSON.stringify(profile));
                  set({ user: profile, isLoading: false });
                  return profile;
                }
              }
            }
            console.error('Error loading user profile:', error);
            set({ isLoading: false });
          }
          
          return null;
        },
        
        updateProfile: async (data): Promise<UserProfile | null> => {
          const { isAuthenticated, refreshSession, onSuccess, onError } = get();
          
          if (!isAuthenticated) return null;
          
          set({ isLoading: true });
          
          try {
            await userService.updateMyProfile(data);
            const updatedProfile = await userService.getMyProfile();
            if (updatedProfile) {
              localStorage.setItem('cached_user', JSON.stringify(updatedProfile));
              set({ user: updatedProfile, isLoading: false });
              
              if (onSuccess) {
                onSuccess('Profile updated successfully');
              }
              
              return updatedProfile;
            }
          } catch (error: any) {
            if (error.response?.status === 401) {
              const refreshed = await refreshSession();
              if (refreshed) {
                const updatedProfile = await userService.getMyProfile();
                if (updatedProfile) {
                  localStorage.setItem('cached_user', JSON.stringify(updatedProfile));
                  set({ user: updatedProfile, isLoading: false });
                  
                  if (onSuccess) {
                    onSuccess('Profile updated successfully');
                  }
                  
                  return updatedProfile;
                }
              }
            }
            
            const appError = error as AppError;
            if (onError) {
              onError(appError);
            }
            
            console.error('Error updating profile:', error);
            set({ isLoading: false });
            throw error;
          }
          
          return null;
        },
        
        deleteAccount: async () => {
          const { isAuthenticated, onSuccess, onError } = get();
          if (!isAuthenticated) return;
          
          try {
            await userService.deleteMyAccount();
            await get().logout();
            
            if (onSuccess) {
              onSuccess('Account deleted successfully');
            }
            
          } catch (error) {
            const appError = error as AppError;
            if (onError) {
              onError(appError);
            }
            console.error('Error deleting account:', error);
            throw error;
          }
        },
        
        followUser: async (targetUserId: string) => {
          const { onSuccess, onError } = get();
          try {
            await userService.followUser(targetUserId);
            if (onSuccess) {
              onSuccess('User followed successfully');
            }
          } catch (error) {
            const appError = error as AppError;
            if (onError) {
              onError(appError);
            }
            console.error('Error following user:', error);
            throw error;
          }
        },
        
        unfollowUser: async (targetUserId: string) => {
          const { onSuccess, onError } = get();
          try {
            await userService.unfollowUser(targetUserId);
            if (onSuccess) {
              onSuccess('User unfollowed successfully');
            }
          } catch (error) {
            const appError = error as AppError;
            if (onError) {
              onError(appError);
            }
            console.error('Error unfollowing user:', error);
            throw error;
          }
        },
      };
    },
    {
      name: 'yung-accountant-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
    }
  )
);