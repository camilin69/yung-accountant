// contexts/ThemeContext.tsx
import React, { createContext, useEffect, useRef, useState } from 'react';
import { useUserStore } from '../store';

export type ThemeMode = 'dark' | 'light';
export type ThemeRole = 'estudiante' | 'trabajador' | 'ama-de-casa';

export interface ThemeContextType {
  currentRole: ThemeRole;
  currentMode: ThemeMode;
  currentTheme: string;
  setTheme: (role: ThemeRole, mode: ThemeMode) => void;
  setMode: (mode: ThemeMode) => void;
  setRole: (role: ThemeRole) => void;
  setThemeByRole: (role: string) => void;
  toggleMode: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'user-theme-preference';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUserStore();
  const [currentRole, setCurrentRole] = useState<ThemeRole>(() => {
    // Initialize from saved theme, but respect user role if already loaded
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      try {
        const { role } = JSON.parse(saved);
        const storeUser = useUserStore.getState().user;
        // If user is already loaded, their role takes priority over saved theme
        const effectiveRole = storeUser?.role?.toLowerCase() || role;
        if (['estudiante', 'trabajador', 'ama-de-casa'].includes(effectiveRole)) {
          return effectiveRole as ThemeRole;
        }
      } catch {}
    }
    const storeUser = useUserStore.getState().user;
    const role = storeUser?.role?.toLowerCase() || 'estudiante';
    return (['estudiante', 'trabajador', 'ama-de-casa'].includes(role) ? role : 'estudiante') as ThemeRole;
  });
  const [currentMode, setCurrentMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      try {
        const { mode } = JSON.parse(saved);
        if (mode === 'dark' || mode === 'light') return mode;
      } catch {}
    }
    return 'dark';
  });

  // Apply theme immediately on mount (before first paint if possible)
  const applyTheme = (role: ThemeRole, mode: ThemeMode) => {
    const themeName = `${role}-${mode}`;
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ role, mode }));
    localStorage.setItem('theme-mode', mode);
  };

  // Apply initial theme synchronously at module level
  useEffect(() => {
    applyTheme(currentRole, currentMode);
  }, []); // eslint-disable-line

  // Keep a ref to currentMode so subscribe callback always has latest value
  const currentModeRef = useRef(currentMode);
  currentModeRef.current = currentMode;

  // Listen to user store changes directly (faster than React re-render)
  useEffect(() => {
    const unsub = useUserStore.subscribe((state, prev) => {
      if (state.user?.role && state.user.role !== prev.user?.role) {
        const userRole = state.user.role.toLowerCase() as ThemeRole;
        if (['estudiante', 'trabajador', 'ama-de-casa'].includes(userRole)) {
          setCurrentRole(userRole);
          applyTheme(userRole, currentModeRef.current);
        }
      }
    });
    return unsub;
  }, []); // eslint-disable-line

  // React to user role changes (belt + suspenders with the subscribe above)
  useEffect(() => {
    if (user?.role) {
      const userRole = user.role.toLowerCase() as ThemeRole;
      const validRole = ['estudiante', 'trabajador', 'ama-de-casa'].includes(userRole)
        ? userRole
        : 'estudiante';
      if (validRole !== currentRole) {
        setCurrentRole(validRole);
        applyTheme(validRole, currentModeRef.current);
      }
    }
  }, [user?.role]); // eslint-disable-line

  // === Public API ===

  const getThemeName = (role: ThemeRole, mode: ThemeMode): string => `${role}-${mode}`;

  const setTheme = (role: ThemeRole, mode: ThemeMode) => {
    setCurrentRole(role);
    setCurrentMode(mode);
    applyTheme(role, mode);
  };

  const setMode = (mode: ThemeMode) => {
    setCurrentMode(mode);
    applyTheme(currentRole, mode);
  };

  const setThemeByRole = (role: string) => {
    const normalizedRole = role?.toLowerCase() as ThemeRole;
    const validRole = ['estudiante', 'trabajador', 'ama-de-casa'].includes(normalizedRole)
      ? normalizedRole
      : 'estudiante';
    setCurrentRole(validRole);
    applyTheme(validRole, currentModeRef.current);
  };

  const setRole = (role: ThemeRole) => {
    setCurrentRole(role);
    applyTheme(role, currentModeRef.current);
  };

  const toggleMode = () => {
    const newMode = currentMode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
  };

  return (
    <ThemeContext.Provider value={{
      currentRole,
      currentMode,
      currentTheme: getThemeName(currentRole, currentMode),
      setTheme,
      setMode,
      setRole,
      setThemeByRole,
      toggleMode,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};