// components/layout/Navbar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, Search, Menu, LogOut, User, Settings, HelpCircle,
  X, ArrowLeft, FileText, Users, ArrowRight
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store';
import { Avatar } from '../common/Avatar';
import { Logo } from '../common/Logo';

interface NavbarProps {
  onMobileMenuClick: () => void;
}

type SearchMode = 'posts' | 'users';

const Navbar: React.FC<NavbarProps> = ({ onMobileMenuClick }) => {
  const { user, logout } = useUserStore();
  const [showNotifications, setShowNotifications] = useState(false);
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
    setShowNotifications(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setShowUserMenu(false);
  };

  const notifications = [
    { id: 1, title: 'Goal almost achieved!', message: '90% close to "Buy a motorcycle"', time: '2h ago', read: false },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;
  const displayName = user?.displayName || user?.firstName || user?.username || 'User';
  const userPlan = user?.plan || 'free';

  // Validar si la búsqueda se puede ejecutar
  const canSearch = searchQuery.trim().length >= 2;

  return (
    <>
      <nav 
        className="fixed top-0 left-0 right-0 z-50 h-[68px]"
        style={{
          background: 'rgba(255,255,255,0.02)',
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
                  <h1 className="text-sm font-medium tracking-[-0.01em]" style={{ color: 'var(--theme-text-primary)' }}>Yung Accountant</h1>
                  <p className="text-[9px] font-medium tracking-[0.04em] uppercase" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>Track. Save. Grow.</p>
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
                placeholder={searchMode === 'posts' ? 'Search posts...' : 'Search users...'}
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
                  className={`p-1.5 rounded-lg transition-all duration-300 hover:scale-110 ${
                    searchMode === 'posts' ? 'bg-[var(--theme-background-glass-hover)]' : ''
                  }`}
                  style={{ color: searchMode === 'posts' ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }}
                  title="Search posts"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSearchMode('users')}
                  className={`p-1.5 rounded-lg transition-all duration-300 hover:scale-110 ${
                    searchMode === 'users' ? 'bg-[var(--theme-background-glass-hover)]' : ''
                  }`}
                  style={{ color: searchMode === 'users' ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }}
                  title="Search users"
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
                title="Search"
              >
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </button>
            </form>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <button 
              onClick={() => setShowMobileSearch(true)}
              className="md:hidden p-2 rounded-2xl transition-all duration-300 hover:scale-110"
              style={{ color: 'var(--theme-text-tertiary)' }}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-2xl transition-all duration-300 relative hover:scale-110"
                style={{ color: 'var(--theme-text-tertiary)' }}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse" 
                    style={{ backgroundColor: '#EF4444', boxShadow: '0 0 8px 3px #EF4444' }} />
                )}
              </button>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div 
                    className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-dropdown-in"
                    style={{ 
                      background: 'var(--theme-background-secondary)',
                      backdropFilter: 'blur(80px) saturate(2)',
                      WebkitBackdropFilter: 'blur(80px) saturate(2)',
                      border: '1px solid var(--theme-border-dark)',
                      boxShadow: 'var(--shadow-glass-lg)',
                    }}>
                    <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
                      <h3 className="text-sm font-medium tracking-[0.02em]" style={{ color: 'var(--theme-text-primary)' }}>Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto modal-scroll">
                      {notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`px-5 py-4 transition-colors cursor-pointer hover:bg-[var(--theme-background-glass-hover)] ${
                            !notif.read ? 'bg-[var(--theme-background-glass-hover)]' : ''
                          }`}
                          style={{ borderBottom: '1px solid var(--theme-border-dark)' }}>
                          <div className="flex items-start gap-3">
                            {!notif.read && (
                              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: 'var(--theme-primary)' }} />
                            )}
                            <div>
                              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>{notif.title}</p>
                              <p className="text-xs mt-1" style={{ color: 'var(--theme-text-tertiary)' }}>{notif.message}</p>
                              <p className="text-[10px] font-medium mt-2" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.5 }}>{notif.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-2.5 sm:pl-3 rounded-2xl transition-all duration-300 px-2 py-1.5 hover:bg-[rgba(255,255,255,0.03)]"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-medium" style={{ color: 'var(--theme-text-primary)' }}>{displayName}</p>
                  <p className="text-[9px] font-medium capitalize" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.6 }}>{userPlan}</p>
                </div>
                <Avatar user={user} size="md" />
              </button>
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
                        <User className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} /> Profile
                      </button>
                      <button 
                        onClick={() => handleNavigation('/settings')} 
                        className="w-full px-5 py-3 text-left text-sm font-medium transition-all duration-300 hover:bg-[var(--theme-background-glass-hover)] hover:translate-x-1 flex items-center gap-3"
                        style={{ color: 'var(--theme-text-secondary)' }}>
                        <Settings className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} /> Settings
                      </button>
                      <button 
                        onClick={() => handleNavigation('/help')} 
                        className="w-full px-5 py-3 text-left text-sm font-medium transition-all duration-300 hover:bg-[var(--theme-background-glass-hover)] hover:translate-x-1 flex items-center gap-3"
                        style={{ color: 'var(--theme-text-secondary)' }}>
                        <HelpCircle className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} strokeWidth={1.5} /> Help & FAQ
                      </button>
                    </div>
                    <div style={{ borderTop: '1px solid var(--theme-border-dark)' }} className="p-2">
                      <button 
                        onClick={handleLogout} 
                        className="w-full px-5 py-3 text-left text-sm font-medium rounded-2xl transition-all duration-300 hover:bg-[rgba(239,68,68,0.06)] flex items-center gap-3"
                        style={{ color: '#EF4444', opacity: 0.75 }}>
                        <LogOut className="w-4 h-4" strokeWidth={1.5} /> Logout
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
                background: 'rgba(255,255,255,0.02)',
                backdropFilter: 'blur(60px) saturate(2)',
                WebkitBackdropFilter: 'blur(60px) saturate(2)',
                borderBottom: '1px solid var(--theme-border-dark)',
              }}>
              <button 
                onClick={() => setShowMobileSearch(false)} 
                className="p-2 rounded-2xl transition-all duration-300 hover:scale-110"
                style={{ color: 'var(--theme-text-tertiary)' }}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <form onSubmit={handleSearch} className="flex-1 flex items-center rounded-2xl px-4 py-2"
                style={{ 
                  background: 'rgba(255,255,255,0.025)', 
                  border: '1px solid var(--theme-border-dark)',
                }}>
                <Search className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)', opacity: 0.4 }} />
                <input
                  type="text"
                  placeholder={`Search ${searchMode}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                  className="flex-1 bg-transparent border-none outline-none text-sm ml-3 font-medium"
                  style={{ color: 'var(--theme-text-primary)' }}
                  autoFocus
                  maxLength={50}
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    onClick={() => setSearchQuery('')} 
                    className="p-1 rounded-lg"
                    style={{ color: 'var(--theme-text-tertiary)' }}>
                    <X className="w-4 h-4" />
                  </button>
                )}
                <div className="flex items-center gap-0.5 ml-2 p-0.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <button 
                    type="button" 
                    onClick={() => setSearchMode('posts')} 
                    className={`p-1.5 rounded-lg transition-all ${searchMode === 'posts' ? 'bg-[var(--theme-background-glass-hover)]' : ''}`}
                    style={{ color: searchMode === 'posts' ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }}>
                    <FileText className="w-4 h-4" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setSearchMode('users')} 
                    className={`p-1.5 rounded-lg transition-all ${searchMode === 'users' ? 'bg-[var(--theme-background-glass-hover)]' : ''}`}
                    style={{ color: searchMode === 'users' ? 'var(--theme-primary)' : 'var(--theme-text-tertiary)' }}>
                    <Users className="w-4 h-4" />
                  </button>
                </div>
                
                <button
                  type="submit"
                  disabled={!canSearch}
                  className={`ml-2 p-2 rounded-lg transition-all duration-300 ${
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
            <div className="flex-1 overflow-y-auto p-4 smooth-scroll flex items-center justify-center">
              <p className="text-sm font-medium" style={{ color: 'var(--theme-text-tertiary)' }}>
                {canSearch 
                  ? `Press Enter or tap → to search ${searchMode}`
                  : `Type at least 2 characters to search ${searchMode}`
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