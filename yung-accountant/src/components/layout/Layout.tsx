// components/layout/Layout.tsx

import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout: React.FC = () => {
  const location = useLocation();
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Scroll to top on route change
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  const handleMobileMenuClick = () => {
    window.dispatchEvent(new CustomEvent('mobile-sidebar-toggle'));
  };

  return (
    <div className="h-screen flex flex-col bg-[#0F0F1A] overflow-hidden">
      <Navbar onMobileMenuClick={handleMobileMenuClick} />
      <div className="flex flex-1 overflow-hidden pt-[64px]">
        <Sidebar />
        <main 
          ref={mainContentRef}
          className="flex-1 overflow-y-auto bg-[#0F0F1A]"
        >
          <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;