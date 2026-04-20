// components/layout/Layout.tsx

import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout: React.FC = () => {
  const location = useLocation();
  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="h-screen flex flex-col bg-[#0F0F1A] overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden pt-[64px]">
        <Sidebar />
        <main 
          ref={mainContentRef}
          className="flex-1 overflow-y-auto bg-[#0F0F1A]"
        >
          <div className="p-6 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;