// components/layout/Navbar.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Search, Menu, LogOut, User, Settings, HelpCircle,
  X, ArrowLeft, FileText, Users, ArrowRight, Languages
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useUserStore } from '../../store';
import { Avatar } from '../common/Avatar';
import { Logo } from '../common/Logo';
import Tooltip from '../common/Tooltip';

interface NavbarProps {
  onMobileMenuClick: () => void;
}

type SearchMode = 'posts' | 'users';

const Navbar: React.FC<NavbarProps> = ({ onMobileMenuClick }) => {
  const { t, language, setLanguage } = useTranslation();
  const { user, logout } = useUserStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('posts');
  const navigate = useNavigate();
  const location = useLocation();

  const searchHandledRef = useRef<string>('');

  useEffect(() => {
    searchHandledRef.current = '';
  }, [location.pathname, location.search]);


  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchQuery.trim().length < 2) return;
    
    const searchKey = `${searchQuery.trim()}:${searchMode}`;
    
    // Evitar búsqueda duplicada
    if (searchHandledRef.current === searchKey) return;
    searchHandledRef.current = searchKey;
    
    // Redirigir a community con los parametros
    navigate(`/community?search=${encodeURIComponent(searchQuery.trim())}&mode=${searchMode}`);
    setSearchQuery('');
    setShowMobileSearch(false);
  };


  const handleNavigation = (path: string) => {
    navigate(path);
    setShowUserMenu(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowUserMenu(false);
  };

  const displayName = user?.displayName || user?.firstName || user?.username || 'User';
  const userPlan = user?.plan || 'free';

  // Validar si la búsqueda se puede ejecutar
  const canSearch = searchQuery.trim().length >= 2;

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-[68px]"
        style={{
          background: 'var(--theme-background-glass)',
          backdropFilter: 'blur(60px) saturate(2)',
          WebkitBackdropFilter: 'blur(60px) saturate(2)',
          borderBottom: '1px solid var(--theme-border-dark)',
          boxShadow: '0 4px 24px -8px rgba(0,0,0,0.15)',
        }}
      >
        <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-4 lg:gap-6">
          {/* Left section */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={onMobileMenuClick}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110"
              style={{
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--theme-text-tertiary)'
              }}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div 
              onClick={() => handleNavigation('/dashboard')}
              className="flex items-center gap-2.5 cursor-pointer transition-all duration-500 hover:opacity-80"
            >
              <Logo size="sm" withText={false} />
              <div className="hidden sm:flex items-center gap-2">
                <div className="hidden lg:block">
                  <h1 className="text-sm font-medium tracking-[-0.01em]" style={{ color: 'var(--theme-text-primary)' }}>{t('nav.appName')}</h1>
                  <p className="text-[9px] font-medium tracking-[0.04em] uppercase" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>{t('nav.tagline')}</p>
                </div>
                <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full animate-pulse-subtle"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--theme-border-dark)',
                    boxShadow: '0 0 16px -6px var(--theme-primary)',
                  }}>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex items-center flex-1 justify-center max-w-xl mx-auto">
            <form onSubmit={handleSearch} className="flex items-center w-full rounded-2xl px-4 py-2 transition-all duration-500"
              style={{ 
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid var(--theme-border-dark)',
              }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }} />
              <input
                type="text"
                placeholder={t('nav.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                className="bg-transparent border-none outline-none text-sm ml-3 flex-1 font-medium placeholder:opacity-20"
                style={{ color: 'var(--theme-text-secondary)' }}
                autoComplete="off"
                maxLength={50}
              />
              
              {/* Search mode toggle */}
              <div className="flex items-center gap-0.5 ml-2 p-0.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <button
                  type="button"
                  onClick={() => setSearchMode('posts')}
                 
                  aria-pressed={searchMode === 'posts'}
                  className={`p-1.5 rounded-lg transition-all duration-300 hover:scale-110 ${
                    searchMode === 'posts' ? 'bg-[var(--theme-background-glass-hover)]' : ''
                  }`}
                  style={{ color: searchMode === 'posts' ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }}
                 
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode('users')}
                 
                  aria-pressed={searchMode === 'users'}
                  className={`p-1.5 rounded-lg transition-all duration-300 hover:scale-110 ${
                    searchMode === 'users' ? 'bg-[var(--theme-background-glass-hover)]' : ''
                  }`}
                  style={{ color: searchMode === 'users' ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }}
                 
                >
                  <Users className="w-3.5 h-3.5" />
                </button>
              </div>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                 
                  className="ml-2 p-1 rounded-lg transition-all duration-300 hover:scale-110"
                  style={{ color: 'var(--theme-text-tertiary)' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="submit"
                disabled={!canSearch}
               
                className={`ml-2 p-2 rounded-lg transition-all duration-300 ${
                  canSearch ? 'hover:scale-110' : 'cursor-not-allowed'
                }`}
                style={{
                  color: canSearch ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)',
                  opacity: canSearch ? 1 : 0.2,
                }}
               
              >
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </button>
            </form>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <Tooltip content={t('common.search')} position="bottom">
              <button
                onClick={() => setShowMobileSearch(true)}
               
                className="md:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110"
                style={{ color: 'var(--theme-text-tertiary)' }}
              >
                <Search className="w-5 h-5" />
              </button>
            </Tooltip>

            {/* Language Toggle */}
            <Tooltip content={language === 'es-CO' ? 'Switch to English' : 'Cambiar a Español'} position="bottom">
              <button
                onClick={() => setLanguage(language === 'es-CO' ? 'en-US' : 'es-CO')}
                className="p-2 rounded-2xl transition-all duration-300 hover:scale-110"
                style={{ color: 'var(--theme-text-tertiary)' }}
               
               
              >
                <Languages className="w-5 h-5" />
              </button>
            </Tooltip>

            {/* User menu */}
            <div className="relative">
              <Tooltip content={t('nav.profile')} position="bottom">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                 
                  aria-expanded={showUserMenu}
                  className="flex items-center gap-2 pl-2.5 sm:pl-3 rounded-2xl transition-all duration-300 px-2 py-1.5 hover:bg-[rgba(255,255,255,0.03)]"
                >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-medium" style={{ color: 'var(--theme-text-primary)' }}>{displayName}</p>
                  <p className="text-[9px] font-medium capitalize" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>{userPlan}</p>
                </div>
                  <Avatar user={user} size="md" />
                </button>
              </Tooltip>
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div 
                    className="absolute right-0 top-full mt-2 w-56 rounded-2xl shadow-2xl z-50 overflow-hidden animate-dropdown-in"
                    style={{ 
                      background: 'var(--theme-background-secondary)',
                      backdropFilter: 'blur(80px) saturate(2)',
                      WebkitBackdropFilter: 'blur(80px) saturate(2)',
                      border: '1px solid var(--theme-border-dark)',
                      boxShadow: 'var(--shadow-glass-lg)',
                    }}>
                    <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
                      <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{displayName}</p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--theme-text-tertiary)' }}>{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button 
                        onClick={() => handleNavigation(`/profile/${user?.username}`)} 
                        className="w-full px-5 py-3 text-left text-sm font-medium transition-all duration-300 hover:bg-[var(--theme-background-glass-hover)] hover:translate-x-1 flex items-center gap-3"
                        style={{ color: 'var(--theme-text-secondary)' }}>
                        <User className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} /> {t('nav.profile')}
                      </button>
                      <button 
                        onClick={() => handleNavigation('/settings')} 
                        className="w-full px-5 py-3 text-left text-sm font-medium transition-all duration-300 hover:bg-[var(--theme-background-glass-hover)] hover:translate-x-1 flex items-center gap-3"
                        style={{ color: 'var(--theme-text-secondary)' }}>
                        <Settings className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} /> {t('nav.settings')}
                      </button>
                      <button 
                        onClick={() => handleNavigation('/help')} 
                        className="w-full px-5 py-3 text-left text-sm font-medium transition-all duration-300 hover:bg-[var(--theme-background-glass-hover)] hover:translate-x-1 flex items-center gap-3"
                        style={{ color: 'var(--theme-text-secondary)' }}>
                        <HelpCircle className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} /> {t('nav.help')}
                      </button>
                    </div>
                    <div style={{ borderTop: '1px solid var(--theme-border-dark)' }} className="p-2">
                      <button 
                        onClick={handleLogout} 
                        className="w-full px-5 py-3 text-left text-sm font-medium rounded-2xl transition-all duration-300 hover:bg-[rgba(239,68,68,0.06)] flex items-center gap-3"
                        style={{ color: 'var(--semantic-expense)', opacity: 0.75 }}>
                        <LogOut className="w-4 h-4" strokeWidth={1.5} /> {t('nav.logout')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Search Modal */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-50 animate-fade-in-up" style={{ backgroundColor: 'var(--theme-background-primary)' }}>
          <div className="flex flex-col h-full">
            <div
              className="flex items-center gap-3 p-4"
              style={{
                background: 'var(--theme-background-glass)',
                backdropFilter: 'blur(60px) saturate(2)',
                WebkitBackdropFilter: 'blur(60px) saturate(2)',
                borderBottom: '1px solid var(--theme-border-dark)',
              }}>
              <button
                onClick={() => setShowMobileSearch(false)}
                aria-label={t('common.close')}
                className="p-2 rounded-2xl transition-all duration-300 hover:scale-110"
                style={{ color: 'var(--theme-text-tertiary)' }}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <form onSubmit={handleSearch} className="flex items-center gap-2 rounded-2xl px-3 py-2"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid var(--theme-border-dark)',
                }}>
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }} />
                <input
                  type="text"
                  placeholder={t('nav.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm font-medium"
                  style={{ color: 'var(--theme-text-primary)' }}
                  autoFocus
                  maxLength={50}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label={t('common.clear')}
                    className="p-1 rounded-lg flex-shrink-0"
                    style={{ color: 'var(--theme-text-tertiary)' }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!canSearch}
                  aria-label={t('common.search')}
                  className={`p-1.5 rounded-lg transition-all duration-300 flex-shrink-0 ${
                    canSearch ? 'hover:scale-110' : 'cursor-not-allowed'
                  }`}
                  style={{
                    color: canSearch ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)',
                    opacity: canSearch ? 1 : 0.2,
                  }}>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </button>
              </form>
            </div>
            {/* Mode toggle — below search bar on mobile */}
            <div className="flex items-center gap-2 px-4 py-2">
              <button
                type="button"
                onClick={() => setSearchMode('posts')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                  searchMode === 'posts' ? '' : ''
                }`}
                style={{
                  background: searchMode === 'posts' ? 'var(--theme-background-glass-hover)' : 'rgba(255,255,255,0.02)',
                  color: searchMode === 'posts' ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)',
                  border: searchMode === 'posts' ? '1px solid var(--theme-primary)' : '1px solid var(--theme-border-dark)',
                }}>
                <FileText className="w-4 h-4 inline mr-2" />
                {t('nav.searchPosts')}
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('users')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-300`}
                style={{
                  background: searchMode === 'users' ? 'var(--theme-background-glass-hover)' : 'rgba(255,255,255,0.02)',
                  color: searchMode === 'users' ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)',
                  border: searchMode === 'users' ? '1px solid var(--theme-primary)' : '1px solid var(--theme-border-dark)',
                }}>
                <Users className="w-4 h-4 inline mr-2" />
                {t('nav.searchUsers')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 smooth-scroll flex items-center justify-center">
              <p className="text-sm font-medium text-center" style={{ color: 'var(--theme-text-tertiary)' }}>
                {canSearch
                  ? t('nav.searchHint', { mode: searchMode === 'posts' ? t('nav.searchPosts') : t('nav.searchUsers') })
                  : t('nav.searchMinChars', { mode: searchMode === 'posts' ? t('nav.searchPosts') : t('nav.searchUsers') })
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;