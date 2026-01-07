import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { cn } from '@/lib/utils';

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Sidebar - hidden on mobile */}
      {!isMobile && (
        <div className="fixed left-0 top-0 z-40 h-screen">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>
      )}

      {/* Main content */}
      <div
        className={cn(
          'flex-1 flex flex-col min-h-screen transition-all duration-300',
          !isMobile && (sidebarCollapsed ? 'ml-16' : 'ml-60'),
          isMobile && 'ml-0'
        )}
      >
        <TopBar isMobile={isMobile} />
        <main className={cn(
          'flex-1 overflow-auto scrollbar-dark',
          isMobile ? 'pb-20' : ''
        )}>
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation - mobile only */}
      {isMobile && <BottomNav />}
    </div>
  );
}
