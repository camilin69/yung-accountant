// components/layout/Navbar.tsx
import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  Menu,
  LogOut,
  User,
  Settings,
  HelpCircle,
  X,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store';
import { Avatar } from '../common/Avatar';

// SVG Logo component con colores del tema
const LogoIcon: React.FC = () => (
  <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="15" width="70" height="70" rx="16" fill="var(--theme-background-glass)" stroke="var(--theme-border-light)" strokeWidth="1.5"/>
    <polyline points="25,65 40,50 55,55 70,35" stroke="var(--theme-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <rect x="25" y="70" width="6" height="15" rx="1" fill="var(--theme-text-tertiary)"/>
    <rect x="40" y="55" width="6" height="30" rx="1" fill="var(--theme-text-secondary)"/>
    <rect x="55" y="60" width="6" height="25" rx="1" fill="var(--theme-text-tertiary)"/>
    <rect x="70" y="40" width="6" height="45" rx="1" fill="var(--theme-text-secondary)"/>
    <circle cx="70" cy="35" r="2.5" fill="var(--theme-text-primary)"/>
  </svg>
);

interface NavbarProps {
  onMobileMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMobileMenuClick }) => {
  const { user, logout } = useUserStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/transactions?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setShowMobileSearch(false);
      setShowNotifications(false);
      setShowUserMenu(false);
    }
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

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 backdrop-blur-xl border-b z-50 h-[64px]" style={{ backgroundColor: 'var(--theme-background-glass)', borderColor: 'var(--theme-border-light)' }}>
        <div className="h-full px-3 sm:px-4 md:px-6 flex items-center justify-between">
          {/* Left section */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={onMobileMenuClick}
              className="lg:hidden p-2 rounded-lg transition-all duration-300"
              style={{ color: 'var(--theme-text-tertiary)' }}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div 
              onClick={() => handleNavigation('/dashboard')}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <LogoIcon />
              <div className="hidden sm:block">
                <h1 className="text-sm font-light tracking-tight" style={{ color: 'var(--theme-text-primary)' }}>
                  Yung Accountant
                </h1>
                <p className="text-[9px] font-light" style={{ color: 'var(--theme-text-tertiary)' }}>Track. Save. Grow.</p>
              </div>
            </div>
          </div>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center backdrop-blur-sm rounded-lg px-3 py-1.5 w-64 lg:w-96 transition-all duration-300" style={{ backgroundColor: 'var(--theme-background-glass)', border: `1px solid var(--theme-border-light)` }}>
            <Search className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm ml-2 flex-1 font-light placeholder:opacity-20"
              style={{ color: 'var(--theme-text-secondary)' }}
              autoComplete="off"
            />
            <kbd className="hidden lg:inline text-[10px] px-1.5 py-0.5 rounded" style={{ color: 'var(--theme-text-tertiary)', backgroundColor: 'rgba(255,255,255,0.05)' }}>⌘K</kbd>
          </form>

          {/* Right section */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={() => setShowMobileSearch(true)}
              className="md:hidden p-2 rounded-lg transition-all duration-300"
              style={{ color: 'var(--theme-text-tertiary)' }}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg transition-all duration-300 relative"
                style={{ color: 'var(--theme-text-tertiary)' }}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
              
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 backdrop-blur-xl border rounded-xl shadow-2xl z-50 overflow-hidden" style={{ backgroundColor: 'var(--theme-background-secondary)', borderColor: 'var(--theme-border-light)' }}>
                    <div className="p-3 border-b" style={{ borderColor: 'var(--theme-border-light)' }}>
                      <h3 className="text-sm font-light" style={{ color: 'var(--theme-text-primary)' }}>Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto modal-scroll">
                      {notifications.map(notif => (
                        <div key={notif.id} className={`p-3 border-b transition-colors cursor-pointer ${!notif.read ? 'bg-[var(--theme-primary)]/5' : ''}`} style={{ borderColor: 'var(--theme-border-dark)' }}>
                          <p className="text-sm font-light" style={{ color: 'var(--theme-text-primary)' }}>{notif.title}</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--theme-text-tertiary)' }}>{notif.message}</p>
                          <p className="text-[10px] mt-2" style={{ color: 'var(--theme-text-tertiary)' }}>{notif.time}</p>
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
                className="flex items-center gap-2 pl-2 sm:pl-3 rounded-lg transition-all duration-300 px-2 py-1.5"
                style={{ borderLeft: `1px solid var(--theme-border-light)` }}
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-light" style={{ color: 'var(--theme-text-primary)' }}>{displayName}</p>
                  <p className="text-[9px] capitalize" style={{ color: 'var(--theme-text-tertiary)' }}>{userPlan}</p>
                </div>
                <Avatar user={user} size="md" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 backdrop-blur-xl border rounded-xl shadow-2xl z-50 overflow-hidden" style={{ backgroundColor: 'var(--theme-background-secondary)', borderColor: 'var(--theme-border-light)' }}>
                    <div className="p-3 border-b" style={{ borderColor: 'var(--theme-border-light)' }}>
                      <p className="text-sm font-light" style={{ color: 'var(--theme-text-primary)' }}>{displayName}</p>
                      <p className="text-xs" style={{ color: 'var(--theme-text-tertiary)' }}>{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button 
                        onClick={() => handleNavigation(`/profile/${user?.id}`)}
                        className="w-full px-3 py-2 text-left text-sm font-light transition-colors flex items-center gap-2"
                        style={{ color: 'var(--theme-text-secondary)' }}
                      >
                        <User className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} /> Profile
                      </button>
                      <button 
                        onClick={() => handleNavigation('/settings')}
                        className="w-full px-3 py-2 text-left text-sm font-light transition-colors flex items-center gap-2"
                        style={{ color: 'var(--theme-text-secondary)' }}
                      >
                        <Settings className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} /> Settings
                      </button>
                      <button 
                        onClick={() => handleNavigation('/help')}
                        className="w-full px-3 py-2 text-left text-sm font-light transition-colors flex items-center gap-2"
                        style={{ color: 'var(--theme-text-secondary)' }}
                      >
                        <HelpCircle className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} /> Help & FAQ
                      </button>
                    </div>
                    <div className="border-t p-2" style={{ borderColor: 'var(--theme-border-light)' }}>
                      <button 
                        onClick={handleLogout}
                        className="w-full px-3 py-2 text-left text-sm font-light text-red-500/80 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" /> Logout
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
        <div className="fixed inset-0 z-50 animate-in fade-in duration-200" style={{ backgroundColor: 'var(--theme-background-primary)' }}>
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 p-4 border-b backdrop-blur-md" style={{ backgroundColor: 'var(--theme-background-glass)', borderColor: 'var(--theme-border-light)' }}>
              <button 
                onClick={() => setShowMobileSearch(false)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--theme-text-tertiary)' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <form onSubmit={handleSearch} className="flex-1 flex items-center backdrop-blur-sm rounded-lg px-4 py-2 border" style={{ backgroundColor: 'var(--theme-background-glass)', borderColor: 'var(--theme-border-light)' }}>
                <Search className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} />
                <input
                  type="text"
                  placeholder="Search transactions, goals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm ml-3 font-light"
                  style={{ color: 'var(--theme-text-primary)' }}
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-lg"
                    style={{ color: 'var(--theme-text-tertiary)' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>
            </div>
            <div className="flex-1 overflow-y-auto p-4 smooth-scroll">
              <p className="text-xs mb-3" style={{ color: 'var(--theme-text-tertiary)' }}>Recent searches</p>
              <div className="space-y-2">
                {['Food', 'Transport', 'Salary', 'Shopping'].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setSearchQuery(suggestion);
                      navigate(`/transactions?search=${encodeURIComponent(suggestion)}`);
                      setShowMobileSearch(false);
                    }}
                    className="w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3"
                    style={{ backgroundColor: 'var(--theme-background-glass)' }}
                  >
                    <Search className="w-4 h-4" style={{ color: 'var(--theme-text-tertiary)' }} />
                    <span className="text-sm" style={{ color: 'var(--theme-text-secondary)' }}>{suggestion}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;