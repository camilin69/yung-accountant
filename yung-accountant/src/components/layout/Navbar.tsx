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
  ChartLine
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
    <nav className="fixed top-0 left-0 right-0 bg-[#1A1A2E] border-b border-white/10 z-50 h-[64px]">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left section - Logo + Mobile menu */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button 
            onClick={onMobileMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-400" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] rounded-lg flex items-center justify-center shadow-lg shadow-[#6C63FF]/20">
              <ChartLine className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold bg-gradient-to-r from-[#6C63FF] to-[#FF6584] bg-clip-text text-transparent">
                Yung Accountant
              </h1>
              <p className="text-[9px] text-gray-500">Track. Save. Grow.</p>
            </div>
          </div>
        </div>

        {/* Search - desktop */}
        <form onSubmit={handleSearch} className="hidden lg:flex items-center bg-[#0F0F1A] rounded-xl px-4 py-2 w-96 border border-white/10 focus-within:border-[#6C63FF] transition-all">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search transactions, goals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm ml-3 flex-1 text-white placeholder:text-gray-500"
          />
          <kbd className="hidden lg:inline text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">⌘K</kbd>
        </form>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors relative"
            >
              <Bell className="w-5 h-5 text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#1A1A2E] rounded-xl border border-white/10 shadow-xl z-50">
                  <div className="p-3 border-b border-white/10">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map(notif => (
                      <div key={notif.id} className={`p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer ${!notif.read ? 'bg-[#6C63FF]/5' : ''}`}>
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{notif.message}</p>
                        <p className="text-[10px] text-gray-600 mt-2">{notif.time}</p>
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
              className="flex items-center gap-2 pl-3 border-l border-white/10"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium">{user?.username}</p>
                <p className="text-[10px] text-gray-500 capitalize">{user?.plan}</p>
              </div>
              <div className="w-8 h-8 bg-gradient-to-r from-[#6C63FF] to-[#FF6584] rounded-full flex items-center justify-center text-xs font-semibold">
                {user?.username?.substring(0, 2).toUpperCase() || 'YN'}
              </div>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#1A1A2E] rounded-xl border border-white/10 shadow-xl z-50">
                  <div className="p-3 border-b border-white/10">
                    <p className="font-semibold text-sm">{user?.username}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2">
                      <User className="w-4 h-4" /> Profile
                    </button>
                    <button className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2">
                      <Settings className="w-4 h-4" /> Settings
                    </button>
                    <button className="w-full px-3 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" /> Help
                    </button>
                  </div>
                  <div className="border-t border-white/10 p-2">
                    <button className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 rounded-lg flex items-center gap-2">
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
      <div className="lg:hidden px-4 pb-3">
        <form onSubmit={handleSearch} className="flex items-center bg-[#0F0F1A] rounded-xl px-4 py-2 border border-white/10">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm ml-3 flex-1 text-white"
          />
        </form>
      </div>
    </nav>
  );
};

export default Navbar;