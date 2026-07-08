// pages/Home/components/HeroSection.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Zap, Menu, X, Rocket, Sparkles, Orbit, LogIn, Moon, Sun, ChevronDown, Languages } from 'lucide-react';
import { useTranslation } from '../../i18n';
import { Logo } from '../../components/common/Logo';

type Role = 'estudiante' | 'trabajador' | 'ama-de-casa';

interface HeroSectionProps {
  onGetStarted: () => void;
  onLogin: () => void;
  heroRef: React.RefObject<HTMLDivElement>;
  showScrollIndicator: boolean;
  selectedRole: Role;
  currentMode: 'dark' | 'light';
  onRoleChange: (role: Role) => void;
  onToggleMode: () => void;
  roles: { id: Role; label: string; icon: React.ReactNode; description: string }[];
}

const navSections = [
  { id: 'dashboard', label: 'Dashboard', labelKey: 'nav.dashboard' },
  { id: 'wallets', label: 'Wallets', labelKey: 'nav.wallets' },
  { id: 'transactions', label: 'Transactions', labelKey: 'nav.transactions' },
  { id: 'calendar', label: 'Calendar', labelKey: 'nav.calendar' },
  { id: 'categories', label: 'Categories', labelKey: 'nav.categories' },
  { id: 'debts', label: 'Debts', labelKey: 'nav.debts' },
  { id: 'goals', label: 'Goals', labelKey: 'nav.goals' },
  { id: 'simulation', label: 'Simulation', labelKey: 'nav.simulation' },
  { id: 'habits', label: 'Habits', labelKey: 'nav.habits' },
];

const floatingWords = [
  { word: 'Freedom', x: 15, y: 25, delay: 0 },
  { word: 'Control', x: 80, y: 30, delay: 1.5 },
  { word: 'Growth', x: 10, y: 70, delay: 3 },
  { word: 'Power', x: 85, y: 65, delay: 2 },
  { word: 'Future', x: 50, y: 85, delay: 4 },
];

export const HeroSection: React.FC<HeroSectionProps> = ({ 
  onGetStarted, 
  onLogin, 
  heroRef, 
  showScrollIndicator,
  selectedRole,
  currentMode,
  onRoleChange,
  onToggleMode,
  roles,
}) => {
  const { t, language, setLanguage } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRefDesktop = useRef<HTMLDivElement>(null);
  const roleDropdownRefMobile = useRef<HTMLDivElement>(null);
  const roleButtonRefDesktop = useRef<HTMLButtonElement>(null);
  const roleButtonRefMobile = useRef<HTMLButtonElement>(null);
  const [roleDropdownPos, setRoleDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cursorGlow, setCursorGlow] = useState(false);

  const currentRoleData = roles.find(r => r.id === selectedRole) || roles[0];

  // Track mouse for interactive glow
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      setCursorGlow(true);
    };
    const handleMouseLeave = () => setCursorGlow(false);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleNavClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const updateRoleDropdownPos = () => {
    // Use the desktop button for positioning (mobile uses absolute positioning)
    if (roleButtonRefDesktop.current) {
      const rect = roleButtonRefDesktop.current.getBoundingClientRect();
      const dropdownHeight = roles.length * 56;
      let top = rect.bottom + 6;
      if (top + dropdownHeight > window.innerHeight && rect.top - dropdownHeight > 0) {
        top = rect.top - dropdownHeight - 6;
      }
      setRoleDropdownPos({ top, left: rect.left, width: Math.max(rect.width, 220) });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Check desktop button + dropdown
      const clickedInDesktopBtn = roleButtonRefDesktop.current?.contains(target);
      const clickedInDesktopDropdown = roleDropdownRefDesktop.current?.contains(target);
      // Check mobile button + dropdown
      const clickedInMobileBtn = roleButtonRefMobile.current?.contains(target);
      const clickedInMobileDropdown = roleDropdownRefMobile.current?.contains(target);

      if (
        (!clickedInDesktopBtn && !clickedInDesktopDropdown) &&
        (!clickedInMobileBtn && !clickedInMobileDropdown)
      ) {
        setRoleDropdownOpen(false);
      }
    };
    if (roleDropdownOpen) {
      updateRoleDropdownPos();
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [roleDropdownOpen]);

  useEffect(() => {
    if (roleDropdownOpen) {
      const handleUpdate = () => updateRoleDropdownPos();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);
      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [roleDropdownOpen]);

  return (
    <>
      {/* Navbar — Roca espacial flotante */}
      <nav className="fixed top-4 sm:top-6 left-3 sm:left-6 right-3 sm:right-6 z-50 transition-all duration-700">
        <div 
          className="max-w-[1800px] mx-auto rounded-[3rem] px-4 sm:px-6 lg:px-6 xl:px-8 py-3 sm:py-4"
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
          <div className="flex justify-between items-center gap-3 sm:gap-4 lg:gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Logo size="md" withText={false} />
              <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full animate-pulse-subtle"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  boxShadow: '0 0 24px -8px var(--theme-primary)',
                }}>
                <div className="relative flex-shrink-0">
                  <Orbit className="w-3 h-3 animate-rotate-slow" style={{ color: 'var(--theme-primary)' }} />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full" 
                    style={{ backgroundColor: 'var(--theme-primary)', boxShadow: '0 0 10px 3px var(--theme-primary)' }} />
                </div>
                <span className="text-[9px] font-medium tracking-[0.1em] uppercase" style={{ color: 'var(--theme-primary)', opacity: 0.75 }}>
                  {t('home.heroBadge1')}
                </span>
              </div>
            </div>
            
            {/* Desktop Navigation — TODAS las secciones con texto más pequeño y menos padding */}
            <div className="hidden lg:flex items-center gap-0 flex-1 justify-center overflow-x-auto">
              {navSections.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  onMouseEnter={() => setHoveredNav(item.id)}
                  onMouseLeave={() => setHoveredNav(null)}
                  className="relative px-2 xl:px-3 py-2 text-[10px] xl:text-[11px] font-medium transition-all duration-500 rounded-xl whitespace-nowrap flex-shrink-0"
                  style={{ 
                    color: hoveredNav === item.id ? 'var(--theme-text-primary)' : 'var(--theme-text-tertiary)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    background: hoveredNav === item.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                    boxShadow: hoveredNav === item.id ? '0 0 12px -4px var(--theme-primary)' : 'none',
                  }}
                >
                  <span className="relative z-10">{t(item.labelKey)}</span>
                </button>
              ))}
            </div>

            {/* Desktop Auth + Theme */}
            <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 flex-shrink-0">
              <div className="relative">
                <button
                  ref={roleButtonRefDesktop}
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="flex items-center gap-1 px-2.5 xl:px-3 py-2 xl:py-2.5 rounded-2xl text-[10px] xl:text-xs font-medium transition-all duration-500 hover:-translate-y-0.5 flex-shrink-0"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'var(--theme-text-secondary)',
                  }}
                >
                  <span style={{ color: 'var(--theme-primary)' }}>{currentRoleData.icon}</span>
                  <ChevronDown className={`w-2.5 h-2.5 xl:w-3 xl:h-3 transition-transform duration-500 ${roleDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }} />
                </button>

                {roleDropdownOpen && (
                  <div
                    ref={roleDropdownRefDesktop}
                    className="fixed z-[99999] rounded-2xl overflow-hidden py-1 animate-dropdown-in"
                    style={{
                      top: `${roleDropdownPos.top}px`,
                      left: `${roleDropdownPos.left}px`,
                      width: `${roleDropdownPos.width}px`,
                      background: 'var(--theme-background-secondary)',
                      backdropFilter: 'blur(80px) saturate(2)',
                      WebkitBackdropFilter: 'blur(80px) saturate(2)',
                      border: '1px solid var(--theme-border-dark)',
                      boxShadow: 'var(--shadow-glass-lg)',
                    }}
                  >
                    {roles.map((role) => {
                      const isSelected = selectedRole === role.id;
                      return (
                        <button
                          key={role.id}
                          onClick={() => { onRoleChange(role.id); setRoleDropdownOpen(false); }}
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
                            <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>
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

              <button
                onClick={() => setLanguage(language === 'es-CO' ? 'en-US' : 'es-CO')}
                className="p-2 xl:p-2.5 rounded-2xl transition-all duration-500 hover:-translate-y-0.5 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                title={language === 'es-CO' ? t('nav.switchToEnglish') : t('nav.switchToSpanish')}
              >
                <Languages className="w-3.5 h-3.5 xl:w-4 xl:h-4" style={{ color: 'var(--theme-text-secondary)' }} strokeWidth={1.5} />
              </button>

              <button
                onClick={onToggleMode}
                className="p-2 xl:p-2.5 rounded-2xl transition-all duration-500 hover:-translate-y-0.5 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {currentMode === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 xl:w-4 xl:h-4" style={{ color: 'var(--theme-text-secondary)' }} strokeWidth={1.5} />
                ) : (
                  <Moon className="w-3.5 h-3.5 xl:w-4 xl:h-4" style={{ color: 'var(--theme-text-secondary)' }} strokeWidth={1.5} />
                )}
              </button>

              <button
                onClick={onLogin}
                className="group relative px-3 xl:px-4 py-2 xl:py-2.5 rounded-2xl text-[10px] xl:text-xs font-medium transition-all duration-500 hover:-translate-y-1 flex items-center gap-1.5 xl:gap-2 overflow-hidden flex-shrink-0"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--theme-text-primary)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <LogIn className="w-3.5 h-3.5 xl:w-4 xl:h-4 relative z-10" strokeWidth={1.5} />
                <span className="relative z-10 font-medium">{t('login.signIn')}</span>
              </button>

              <button
                onClick={onGetStarted}
                className="group relative px-3 xl:px-5 py-2 xl:py-2.5 rounded-2xl text-[10px] xl:text-xs font-medium transition-all duration-500 hover:-translate-y-1.5 active:scale-95 flex items-center gap-1.5 xl:gap-2 overflow-hidden flex-shrink-0"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: '#FFFFFF',
                  boxShadow: '0 8px 32px -8px var(--theme-primary), 0 0 60px -10px var(--theme-primary)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 rounded-2xl" />
                <Rocket className="w-3.5 h-3.5 xl:w-4 xl:h-4 relative z-10 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-500" strokeWidth={2} />
                <span className="relative z-10 font-medium">{t('register.signUp')}</span>
                <Sparkles className="w-3 h-3 xl:w-3.5 xl:h-3.5 relative z-10 opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
              </button>
            </div>

            {/* Mobile: role + language + dark/light — LoginNavbar pattern */}
            <div className="lg:hidden flex items-center gap-2">
              {/* Role selector — same style as LoginNavbar */}
              <div className="relative">
                <button
                  ref={roleButtonRefMobile}
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-2xl text-[11px] font-medium transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--theme-text-secondary)' }}
                >
                  <span style={{ color: 'var(--theme-primary)' }}>{currentRoleData.icon}</span>
                  <span className="hidden xs:inline">{currentRoleData.label}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${roleDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }} />
                </button>
                {roleDropdownOpen && (
                  <div ref={roleDropdownRefMobile} className="absolute top-full mt-2 left-0 z-[99999] rounded-2xl overflow-hidden py-1 min-w-[180px] animate-dropdown-in"
                    style={{ background: 'var(--theme-background-secondary)', backdropFilter: 'blur(80px) saturate(2)', border: '1px solid var(--theme-border-dark)', boxShadow: 'var(--shadow-glass-lg)' }}>
                    {roles.map((role) => (
                      <button key={role.id}
                        onClick={() => { onRoleChange(role.id); setRoleDropdownOpen(false); }}
                        className="w-full px-4 py-3 text-left transition-all duration-200 hover:bg-[var(--theme-background-glass-hover)] flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[0.75rem] flex items-center justify-center"
                          style={{ backgroundColor: selectedRole === role.id ? 'var(--theme-background-glass-hover)' : 'transparent' }}>
                          <span style={{ color: selectedRole === role.id ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }}>{role.icon}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: selectedRole === role.id ? 'var(--theme-primary)' : 'var(--theme-text-primary)' }}>{role.label}</p>
                          <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>{role.description}</p>
                        </div>
                        {selectedRole === role.id && (
                          <div className="ml-auto w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Language toggle — icon + text label */}
              <button
                onClick={() => setLanguage(language === 'es-CO' ? 'en-US' : 'es-CO')}
                className="p-2 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 flex items-center gap-1"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                title={language === 'es-CO' ? 'Switch to English' : 'Cambiar a Español'}
              >
                <Languages className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-secondary)' }} strokeWidth={1.5} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>{language === 'es-CO' ? 'ES' : 'EN'}</span>
              </button>
              {/* Dark/Light toggle */}
              <button
                onClick={onToggleMode}
                className="p-2 rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                title={currentMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {currentMode === 'dark' ? (
                  <Sun className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-secondary)' }} strokeWidth={1.5} />
                ) : (
                  <Moon className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-secondary)' }} strokeWidth={1.5} />
                )}
              </button>
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 sm:p-3 rounded-2xl transition-all duration-300 hover:scale-110 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
                ) : (
                  <Menu className="w-5 h-5" style={{ color: 'var(--theme-text-tertiary)' }} />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1/2 h-[1px] opacity-25"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--theme-primary), transparent)',
            boxShadow: '0 0 24px 6px var(--theme-primary)',
          }} />
      </nav>

      {/* Mobile Menu — con TODAS las secciones */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-40 modal-overlay" onClick={() => setMobileMenuOpen(false)} />
          <div 
            className="fixed top-24 sm:top-28 left-4 sm:left-6 right-4 sm:right-6 z-50 rounded-[3rem] py-6 px-4 max-h-[calc(100vh-140px)] overflow-y-auto animate-fade-in-down"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(100px) saturate(3)',
              WebkitBackdropFilter: 'blur(100px) saturate(3)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 32px 80px -20px rgba(0,0,0,0.6)',
            }}
          >
            <div className="space-y-1">
              {navSections.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className="block w-full text-left px-5 py-3.5 rounded-2xl text-sm font-medium transition-all duration-300 hover:bg-[rgba(255,255,255,0.04)] hover:translate-x-1"
                  style={{ color: 'var(--theme-text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                >
                  {t(item.labelKey)}
                </button>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="my-4" />
            <div className="space-y-2.5 px-2">
              <button
                onClick={onLogin}
                className="w-full py-4 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center gap-2.5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--theme-text-primary)' }}
              >
                <LogIn className="w-4 h-4" strokeWidth={1.5} /> {t('login.signIn')}
              </button>
              <button
                onClick={onGetStarted}
                className="w-full py-4 rounded-2xl text-sm font-medium transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2.5"
                style={{ backgroundColor: 'var(--theme-primary)', color: '#FFFFFF', boxShadow: '0 8px 32px -8px var(--theme-primary)' }}
              >
                <Rocket className="w-4 h-4" strokeWidth={2} /> {t('register.signUp')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* HERO CONTENT */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-28 sm:pt-32 pb-24 sm:pb-32 overflow-hidden">
        
        {/* Cursor Glow */}
        {cursorGlow && (
          <div 
            className="fixed pointer-events-none z-0 transition-all duration-300 ease-out"
            style={{
              left: mousePos.x - 300,
              top: mousePos.y - 300,
              width: 600,
              height: 600,
              background: 'radial-gradient(circle, var(--theme-primary) 0%, transparent 70%)',
              opacity: 0.04,
              borderRadius: '50%',
            }}
          />
        )}

        {/* Holograma central */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-[800px] sm:w-[1000px] h-[800px] sm:h-[1000px] rounded-full border border-[var(--theme-border-dark)] animate-rotate-slow opacity-10" 
            style={{ borderStyle: 'dashed', animationDuration: '70s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] sm:w-[700px] h-[550px] sm:h-[700px] rounded-full border border-[var(--theme-border-dark)] animate-rotate-slow opacity-8" 
            style={{ borderStyle: 'dashed', animationDuration: '50s', animationDirection: 'reverse' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[450px] h-[350px] sm:h-[450px] rounded-full border border-[var(--theme-primary)]/10 animate-rotate-slow opacity-15" 
            style={{ borderStyle: 'dashed', animationDuration: '30s' }} />
        </div>

        {/* Puntos de radar */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
            <div
              key={i}
              className="absolute w-2.5 h-2.5 rounded-full animate-pulse-subtle"
              style={{
                backgroundColor: 'var(--theme-primary)',
                opacity: 0.5,
                top: `${-Math.cos((deg * Math.PI) / 180) * 380}px`,
                left: `${Math.sin((deg * Math.PI) / 180) * 380}px`,
                transform: 'translate(-50%, -50%)',
                animationDelay: `${i * 0.4}s`,
                boxShadow: '0 0 30px 10px var(--theme-primary)',
              }}
            />
          ))}
        </div>

        {/* Palabras flotantes */}
        {floatingWords.map((fw, i) => (
          <div
            key={i}
            className="absolute pointer-events-none animate-float hidden sm:block"
            style={{
              left: `${fw.x}%`,
              top: `${fw.y}%`,
              animationDuration: `${6 + i * 2}s`,
              animationDelay: `${fw.delay}s`,
              opacity: 0,
            }}
          >
            <span 
              className="text-6xl sm:text-7xl lg:text-8xl font-thin tracking-tighter"
              style={{ 
                color: 'var(--theme-text-primary)',
                opacity: 0.04,
                textShadow: '0 0 80px var(--theme-primary)',
              }}
            >
              {fw.word}
            </span>
          </div>
        ))}

        {/* Planetas decorativos */}
        <div className="absolute top-[8%] left-[5%] pointer-events-none animate-float" style={{ animationDuration: '14s' }}>
          <div className="w-24 h-24 rounded-full blur-lg opacity-10" style={{ background: 'var(--theme-gradient-primary)' }} />
        </div>
        <div className="absolute bottom-[12%] right-[4%] pointer-events-none animate-float" style={{ animationDuration: '16s', animationDelay: '5s' }}>
          <div className="w-20 h-20 rounded-full blur-lg opacity-8" style={{ background: 'var(--theme-gradient-accent)' }} />
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <div className="animate-fade-in-up">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full mb-8 sm:mb-10 animate-pulse-subtle"
              style={{
                background: 'rgba(255,255,255,0.025)',
                backdropFilter: 'blur(40px)',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 0 40px -12px var(--theme-primary)',
              }}>
              <Zap className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} />
              <span className="text-[11px] font-medium tracking-[0.08em] uppercase" style={{ color: 'var(--theme-primary)' }}>
                {t('home.heroBadge2')}
              </span>
              <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }} />
            </div>

            {/* Título Principal */}
            <h1 className="text-5xl sm:text-7xl lg:text-9xl font-thin mb-6 sm:mb-8 tracking-tighter leading-none" style={{ color: 'var(--theme-text-primary)' }}>
              <span className="block">{t('home.heroTitle1')}</span>
              <span className="block mt-3 sm:mt-4" style={{
                background: 'var(--theme-gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 100,
              }}>
                {t('home.heroTitle2')}
              </span>
            </h1>

            {/* Descripción */}
            <p className="text-lg sm:text-xl lg:text-2xl max-w-xl mx-auto mb-10 sm:mb-12 font-light leading-relaxed" style={{ color: 'var(--theme-text-tertiary)' }}>
              {t('home.heroDescription')}
            </p>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 sm:mb-16">
              <button
                onClick={onGetStarted}
                className="group relative px-10 sm:px-14 py-5 sm:py-6 rounded-2xl text-lg sm:text-xl font-medium flex items-center justify-center gap-3 transition-all duration-500 hover:-translate-y-2 active:scale-95 overflow-hidden"
                style={{ 
                  backgroundColor: 'var(--theme-primary)', 
                  color: '#FFFFFF', 
                  boxShadow: '0 20px 60px -15px var(--theme-primary), 0 0 120px -20px var(--theme-primary)' 
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1500 rounded-2xl" />
                <Rocket className="w-6 h-6 relative z-10 group-hover:translate-x-2 group-hover:-translate-y-2 transition-all duration-500" strokeWidth={1.5} />
                <span className="relative z-10">{t('home.getStarted')}</span>
                <Sparkles className="w-5 h-5 relative z-10 opacity-70 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500" />
              </button>
              <button
                onClick={onLogin}
                className="px-10 sm:px-14 py-5 sm:py-6 rounded-2xl text-lg sm:text-xl font-medium transition-all duration-500 hover:-translate-y-1.5 flex items-center justify-center gap-2.5"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(40px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--theme-text-primary)',
                  boxShadow: '0 8px 32px -8px rgba(0,0,0,0.3)',
                }}
              >
                <LogIn className="w-5 h-5" strokeWidth={1.5} />
                <span>{t('register.haveAccount')}</span>
              </button>
            </div>

          </div>
        </div>

        {/* Scroll indicator */}
        {showScrollIndicator && (
          <div className="absolute bottom-10 sm:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 animate-bounce">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--theme-primary)', boxShadow: '0 0 16px 6px var(--theme-primary)' }} />
            </div>
            <span className="text-[9px] font-medium tracking-[0.1em] uppercase" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.2 }}>
              {t('home.exploreStation')}
            </span>
          </div>
        )}
      </section>
    </>
  );
};