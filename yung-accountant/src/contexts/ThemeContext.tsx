// contexts/ThemeContext.tsx
import React, { createContext, useEffect, useState } from 'react';
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
  const [currentRole, setCurrentRole] = useState<ThemeRole>('estudiante');
  const [currentMode, setCurrentMode] = useState<ThemeMode>('dark');

  // Construir el nombre del tema completo
  const getThemeName = (role: ThemeRole, mode: ThemeMode): string => {
    return `${role}-${mode}`;
  };

  // Aplicar el tema al DOM
  const applyTheme = (role: ThemeRole, mode: ThemeMode) => {
    const themeName = getThemeName(role, mode);
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ role, mode }));
    
    // Guardar también el modo para uso rápido
    localStorage.setItem('theme-mode', mode);
  };

  // Cargar tema guardado o usar valores por defecto
  const loadSavedTheme = () => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      try {
        const { role, mode } = JSON.parse(saved);
        if (role && mode) {
          setCurrentRole(role);
          setCurrentMode(mode);
          applyTheme(role, mode);
          return;
        }
      } catch (e) {
        console.error('Error parsing saved theme', e);
      }
    }
    
    // Si no hay tema guardado, usar el rol del usuario o default
    const userRole = user?.role?.toLowerCase() as ThemeRole || 'estudiante';
    const validRole = ['estudiante', 'trabajador', 'ama-de-casa'].includes(userRole) 
      ? userRole 
      : 'estudiante';
    const defaultMode = 'dark';
    
    setCurrentRole(validRole);
    setCurrentMode(defaultMode);
    applyTheme(validRole, defaultMode);
  };

  // Cambiar el tema completo
  const setTheme = (role: ThemeRole, mode: ThemeMode) => {
    setCurrentRole(role);
    setCurrentMode(mode);
    applyTheme(role, mode);
  };

  // Cambiar solo el modo (oscuro/claro)
  const setMode = (mode: ThemeMode) => {
    setCurrentMode(mode);
    applyTheme(currentRole, mode);
  };

  const setThemeByRole = (role: string) => {
    const normalizedRole = role?.toLowerCase() as ThemeRole;
    const validRole = ['estudiante', 'trabajador', 'ama-de-casa'].includes(normalizedRole) 
      ? normalizedRole 
      : 'estudiante';
    setRole(validRole);
  };

  // Cambiar solo el rol (manteniendo el modo actual)
  const setRole = (role: ThemeRole) => {
    setCurrentRole(role);
    applyTheme(role, currentMode);
  };

  // Alternar entre modo oscuro y claro
  const toggleMode = () => {
    const newMode = currentMode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
  };

  // Escuchar cambios en el rol del usuario
  useEffect(() => {
    if (user?.role) {
      const userRole = user.role.toLowerCase() as ThemeRole;
      const validRole = ['estudiante', 'trabajador', 'ama-de-casa'].includes(userRole) 
        ? userRole 
        : 'estudiante';
      
      if (validRole !== currentRole) {
        setRole(validRole);
      }
    }
  }, [user?.role]);

  // Cargar tema al iniciar
  useEffect(() => {
    loadSavedTheme();
  }, []);

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