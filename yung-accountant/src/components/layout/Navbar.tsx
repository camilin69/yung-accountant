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

// SVG Logo component
const LogoIcon: React.FC = () => (
  <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="15" y="15" width="70" height="70" rx="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"/>
    <polyline points="25,65 40,50 55,55 70,35" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <rect x="25" y="70" width="6" height="15" rx="1" fill="rgba(255,255,255,0.3)"/>
    <rect x="40" y="55" width="6" height="30" rx="1" fill="rgba(255,255,255,0.5)"/>
    <rect x="55" y="60" width="6" height="25" rx="1" fill="rgba(255,255,255,0.4)"/>
    <rect x="70" y="40" width="6" height="45" rx="1" fill="rgba(255,255,255,0.6)"/>
    <circle cx="70" cy="35" r="2.5" fill="rgba(255,255,255,0.9)"/>
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

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 bg-[#1A1A2E]/80 backdrop-blur-md border-b border-white/10 z-50 h-[64px]">
        <div className="h-full px-3 sm:px-4 md:px-6 flex items-center justify-between">
          {/* Left section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile menu button */}
            <button 
              onClick={onMobileMenuClick}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-all duration-300"
            >
              <Menu className="w-5 h-5 text-white/60" />
            </button>

            {/* Logo - click to go to dashboard */}
            <div 
              onClick={() => handleNavigation('/dashboard')}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <LogoIcon />
              <div className="hidden sm:block">
                <h1 className="text-sm font-light tracking-tight text-white/90">
                  Yung Accountant
                </h1>
                <p className="text-[9px] text-white/30 font-light">Track. Save. Grow.</p>
              </div>
            </div>
          </div>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center bg-white/[0.03] backdrop-blur-sm rounded-lg px-3 py-1.5 w-64 lg:w-96 border border-white/10 focus-within:border-white/20 transition-all duration-300">
            <Search className="w-4 h-4 text-white/30" />
            <input
              id="search"
              name="search"
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm ml-2 flex-1 text-white/70 placeholder:text-white/20 font-light"
              autoComplete="off"
            />
            <kbd className="hidden lg:inline text-[10px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded">⌘K</kbd>
          </form>

          {/* Right section */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mobile search button */}
            <button 
              onClick={() => setShowMobileSearch(true)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-all duration-300"
            >
              <Search className="w-5 h-5 text-white/60" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg hover:bg-white/10 transition-all duration-300 relative"
              >
                <Bell className="w-5 h-5 text-white/60" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
              
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#1A1A2E]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-white/10">
                      <h3 className="text-sm font-light text-white/80">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map(notif => (
                        <div key={notif.id} className={`p-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${!notif.read ? 'bg-white/5' : ''}`}>
                          <p className="text-sm font-light text-white/80">{notif.title}</p>
                          <p className="text-xs text-white/40 mt-1">{notif.message}</p>
                          <p className="text-[10px] text-white/30 mt-2">{notif.time}</p>
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
                className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-white/10 hover:bg-white/5 rounded-lg transition-all duration-300 px-2 py-1.5"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-light text-white/80">{user?.displayName || user?.username}</p>
                  <p className="text-[9px] text-white/40 capitalize">{user?.plan}</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-white/5 rounded-full blur-sm" />
                  <div className="relative w-8 h-8 bg-gradient-to-br from-[#6366F1] to-[#EC4899] rounded-full flex items-center justify-center text-xs font-light text-white border border-white/10">
                    {user?.displayName?.substring(0, 2).toUpperCase() || user?.username?.substring(0, 2).toUpperCase() || 'YN'}
                  </div>
                </div>
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#1A1A2E]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-white/10">
                      <p className="text-sm font-light text-white/80">{user?.displayName || user?.username}</p>
                      <p className="text-xs text-white/40">{user?.email}</p>
                    </div>
                    <div className="py-1">
                      <button 
                        onClick={() => handleNavigation(`/profile/${user?.id}`)}
                        className="w-full px-3 py-2 text-left text-sm font-light text-white/60 hover:bg-white/5 transition-colors flex items-center gap-2"
                      >
                        <User className="w-4 h-4 text-white/40" /> Profile
                      </button>
                      <button 
                        onClick={() => handleNavigation('/settings')}
                        className="w-full px-3 py-2 text-left text-sm font-light text-white/60 hover:bg-white/5 transition-colors flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4 text-white/40" /> Settings
                      </button>
                      <button 
                        onClick={() => handleNavigation('/help')}
                        className="w-full px-3 py-2 text-left text-sm font-light text-white/60 hover:bg-white/5 transition-colors flex items-center gap-2"
                      >
                        <HelpCircle className="w-4 h-4 text-white/40" /> Help & FAQ
                      </button>
                    </div>
                    <div className="border-t border-white/10 p-2">
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
        <div className="fixed inset-0 bg-[#0F0F1A] z-50 animate-in fade-in duration-200">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-[#1A1A2E]/80 backdrop-blur-md">
              <button 
                onClick={() => setShowMobileSearch(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/60" />
              </button>
              <form onSubmit={handleSearch} className="flex-1 flex items-center bg-white/[0.03] backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
                <Search className="w-4 h-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Search transactions, goals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm ml-3 text-white/80 placeholder:text-white/30 font-light"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-lg hover:bg-white/10"
                  >
                    <X className="w-4 h-4 text-white/40" />
                  </button>
                )}
              </form>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-xs text-white/40 mb-3">Recent searches</p>
              <div className="space-y-2">
                {['Food', 'Transport', 'Salary', 'Shopping'].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setSearchQuery(suggestion);
                      navigate(`/transactions?search=${encodeURIComponent(suggestion)}`);
                      setShowMobileSearch(false);
                    }}
                    className="w-full text-left p-3 rounded-lg bg-white/[0.03] hover:bg-white/10 transition-colors flex items-center gap-3"
                  >
                    <Search className="w-4 h-4 text-white/30" />
                    <span className="text-sm text-white/80">{suggestion}</span>
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