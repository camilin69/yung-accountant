// components/layout/Navbar.tsx

import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { 
  Bell, 
  Search, 
  Menu,
  LogOut,
  User,
  Settings,
  HelpCircle,
  Sparkles,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onMobileMenuClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMobileMenuClick }) => {
  const { user } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/transactions?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  const notifications = [
    { id: 1, title: 'Goal almost achieved!', message: '90% close to "Buy a motorcycle"', time: '2h ago', read: false },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/[0.03] backdrop-blur-md border-b border-white/10 z-50 h-[64px]">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onMobileMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-all duration-300 hover:scale-105"
          >
            <Menu className="w-5 h-5 text-white/60" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-lg blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-300" />
              <div className="relative w-8 h-8 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-light bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tight">
                Yung Accountant
              </h1>
              <p className="text-[9px] text-white/30 font-light">Track. Save. Grow.</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center bg-white/[0.03] backdrop-blur-sm rounded-lg px-4 py-2 w-96 border border-white/10 focus-within:border-[#6366F1]/50 transition-all duration-300">
          <Search className="w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search transactions, goals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm ml-3 flex-1 text-white/80 placeholder:text-white/30 font-light"
          />
          <kbd className="hidden lg:inline text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">⌘K</kbd>
        </form>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg hover:bg-white/10 transition-all duration-300 hover:scale-105 relative"
            >
              <Bell className="w-5 h-5 text-white/60" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
            
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-white/10">
                    <h3 className="text-sm font-light text-white">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map(notif => (
                      <div key={notif.id} className={`p-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${!notif.read ? 'bg-[#6366F1]/5' : ''}`}>
                        <p className="text-sm font-light text-white">{notif.title}</p>
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
              className="flex items-center gap-3 pl-3 border-l border-white/10 hover:bg-white/5 rounded-lg transition-all duration-300 px-3 py-1.5"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-light text-white">{user?.username}</p>
                <p className="text-[9px] text-white/40 capitalize">{user?.plan}</p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-full blur-sm opacity-50" />
                <div className="relative w-8 h-8 bg-gradient-to-r from-[#6366F1] to-[#EC4899] rounded-full flex items-center justify-center text-xs font-light">
                  {user?.username?.substring(0, 2).toUpperCase() || 'YN'}
                </div>
              </div>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-white/10">
                    <p className="text-sm font-light text-white">{user?.username}</p>
                    <p className="text-xs text-white/40">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button className="w-full px-3 py-2 text-left text-sm font-light text-white/80 hover:bg-white/10 transition-colors flex items-center gap-2">
                      <User className="w-4 h-4 text-white/40" /> Profile
                    </button>
                    <button className="w-full px-3 py-2 text-left text-sm font-light text-white/80 hover:bg-white/10 transition-colors flex items-center gap-2">
                      <Settings className="w-4 h-4 text-white/40" /> Settings
                    </button>
                    <button className="w-full px-3 py-2 text-left text-sm font-light text-white/80 hover:bg-white/10 transition-colors flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-white/40" /> Help
                    </button>
                  </div>
                  <div className="border-t border-white/10 p-2">
                    <button className="w-full px-3 py-2 text-left text-sm font-light text-red-500/80 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-2">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="lg:hidden px-6 pb-3">
        <form onSubmit={handleSearch} className="flex items-center bg-white/[0.03] backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
          <Search className="w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm ml-3 flex-1 text-white/80 placeholder:text-white/30 font-light"
          />
        </form>
      </div>
    </nav>
  );
};

export default Navbar;