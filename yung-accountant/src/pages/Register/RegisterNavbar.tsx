// pages/Register/RegisterNavbar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Briefcase, Heart, ChevronDown, Moon, Sun, Languages } from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { useTranslation } from '../../i18n';

type Role = 'estudiante' | 'trabajador' | 'ama-de-casa';

const roles: { id: Role; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'estudiante', label: '', icon: <GraduationCap className="w-4 h-4" />, description: '' },
  { id: 'trabajador', label: '', icon: <Briefcase className="w-4 h-4" />, description: '' },
  { id: 'ama-de-casa', label: '', icon: <Heart className="w-4 h-4" />, description: '' },
];

export const RegisterNavbar: React.FC = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();

  // Resolve role labels and descriptions using i18n keys matching role IDs
  const resolvedRoles = roles.map(role => ({
    ...role,
    label: t('theme.' + role.id),
    description: t('theme.' + role.id + 'Desc'),
  }));
  const [selectedRole, setSelectedRole] = useState<Role>('estudiante');
  const [currentMode, setCurrentMode] = useState<'dark' | 'light'>('dark');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const currentRoleData = resolvedRoles.find(r => r.id === selectedRole) || resolvedRoles[0];

  // Inicializar tema
  useEffect(() => {
    const savedTheme = localStorage.getItem('preview-theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      const [role, mode] = savedTheme.split('-');
      if (role) setSelectedRole(role as Role);
      if (mode) setCurrentMode(mode as 'dark' | 'light');
    } else {
      document.documentElement.setAttribute('data-theme', `${selectedRole}-${currentMode}`);
    }
  }, []);

  // Cambiar el tema al seleccionar rol
  const handleRoleChange = (role: Role) => {
    setSelectedRole(role);
    setIsOpen(false);
    const newTheme = `${role}-${currentMode}`;
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('preview-theme', newTheme);
  };

  // Toggle modo claro/oscuro
  const toggleMode = () => {
    const newMode = currentMode === 'dark' ? 'light' : 'dark';
    setCurrentMode(newMode);
    const newTheme = `${selectedRole}-${newMode}`;
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('preview-theme', newTheme);
  };

  // Actualizar posición del dropdown (MISMA LÓGICA QUE FUNCIONABA)
  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = resolvedRoles.length * 56;
      let top = rect.bottom + 6;
      if (top + dropdownHeight > window.innerHeight && rect.top - dropdownHeight > 0) {
        top = rect.top - dropdownHeight - 6;
      }
      setDropdownPosition({ top, left: rect.left, width: Math.max(rect.width, 220) });
    }
  };

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      updatePosition();
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Actualizar posición en scroll/resize
  useEffect(() => {
    if (isOpen) {
      const handleUpdate = () => updatePosition();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [isOpen]);

  return (
    <nav className="fixed top-4 sm:top-6 left-3 sm:left-6 right-3 sm:right-6 z-50 transition-all duration-700">
      <div 
        className="max-w-[1600px] mx-auto rounded-[3rem] px-4 sm:px-6 lg:px-8 py-3 sm:py-4"
        style={{
          background: 'rgba(255,255,255,0.025)',
          backdropFilter: 'blur(80px) saturate(2.5)',
          WebkitBackdropFilter: 'blur(80px) saturate(2.5)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: `
            0 32px 80px -20px rgba(0,0,0,0.6),
            0 0 0 1px rgba(255,255,255,0.04),
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 0 120px -30px var(--theme-primary)
          `,
        }}
      >
        <div className="flex justify-between items-center gap-4 sm:gap-6">
          <Logo size="md" withText={true} />
          
          <div className="flex items-center gap-3">
            {/* Role Toggle */}
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={() => { setIsOpen(!isOpen); }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-medium transition-all duration-500 hover:-translate-y-0.5"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'var(--theme-text-secondary)',
                }}
              >
                <span style={{ color: 'var(--theme-primary)' }}>{currentRoleData.icon}</span>
                <span>{currentRoleData.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }} />
              </button>

              {isOpen && (
                <div
                  ref={dropdownRef}
                  className="fixed z-[99999] rounded-2xl overflow-hidden animate-dropdown-in py-1"
                  style={{
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`,
                    background: 'var(--theme-background-secondary)',
                    backdropFilter: 'blur(80px) saturate(2)',
                    WebkitBackdropFilter: 'blur(80px) saturate(2)',
                    border: '1px solid var(--theme-border-dark)',
                    boxShadow: 'var(--shadow-glass-lg)',
                  }}
                >
                  {resolvedRoles.map((role) => {
                    const isSelected = selectedRole === role.id;
                    return (
                      <button
                        key={role.id}
                        onClick={() => handleRoleChange(role.id)}
                        className="w-full px-4 py-3.5 text-left transition-all duration-300 hover:bg-[var(--theme-background-glass-hover)] flex items-center gap-3"
                      >
                        <div 
                          className="w-9 h-9 rounded-[0.85rem] flex items-center justify-center transition-transform duration-300 hover:scale-110"
                          style={{ backgroundColor: isSelected ? 'var(--theme-background-glass-hover)' : 'transparent' }}
                        >
                          <span style={{ color: isSelected ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }}>
                            {role.icon}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: isSelected ? 'var(--theme-primary)' : 'var(--theme-text-primary)' }}>
                            {role.label}
                          </p>
                          <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>
                            {role.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === 'es-CO' ? 'en-US' : 'es-CO')}
              className="p-2.5 rounded-2xl transition-all duration-500 hover:-translate-y-0.5 flex items-center gap-1.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              title={language === 'es-CO' ? t('nav.switchToEnglish') : t('nav.switchToSpanish')}
            >
              <Languages className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} strokeWidth={1.5} />
              <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>
                {language === 'es-CO' ? 'ES' : 'EN'}
              </span>
            </button>

            {/* Dark/Light Toggle */}
            <button
              onClick={toggleMode}
              className="p-2.5 rounded-2xl transition-all duration-500 hover:-translate-y-0.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              title={currentMode === 'dark' ? t('nav.switchToLightMode') : t('nav.switchToDarkMode')}
            >
              {currentMode === 'dark' ? (
                <Sun className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} strokeWidth={1.5} />
              ) : (
                <Moon className="w-4 h-4" style={{ color: 'var(--theme-text-secondary)' }} strokeWidth={1.5} />
              )}
            </button>

            {/* Back to Home */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-medium transition-all duration-500 hover:-translate-x-1"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'var(--theme-text-secondary)',
              }}
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-500 group-hover:-translate-x-1" strokeWidth={1.5} />
              {t('common.back')}
            </button>
          </div>
        </div>
      </div>

      {/* Línea de energía */}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1/2 h-[1px] opacity-25"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--theme-primary), transparent)',
          boxShadow: '0 0 24px 6px var(--theme-primary)',
        }} />
    </nav>
  );
};