import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { MobileDrawerMenu } from '@/components/calendar/MobileDrawerMenu';
import { cn } from '@/lib/utils';

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Check if we're on the calendar page - it has its own header
  const isCalendarPage = location.pathname === '/calendar' || location.pathname === '/';

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
      {/* Sidebar - hidden on mobile and on calendar page */}
      {!isMobile && !isCalendarPage && (
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
          !isMobile && !isCalendarPage && (sidebarCollapsed ? 'ml-16' : 'ml-60'),
          (isMobile || isCalendarPage) && 'ml-0'
        )}
      >
        {/* Hide TopBar on calendar page - it has its own header */}
        {!isCalendarPage && <TopBar isMobile={isMobile} onMenuClick={() => setIsMobileMenuOpen(true)} />}
        <main className={cn(
          'flex-1 scrollbar-dark',
          isCalendarPage ? 'overflow-hidden' : 'overflow-auto',
          isMobile && !isCalendarPage && 'pb-16'
        )}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Drawer Menu - available on all non-calendar pages */}
      {isMobile && !isCalendarPage && (
        <MobileDrawerMenu
          open={isMobileMenuOpen}
          onOpenChange={setIsMobileMenuOpen}
        />
      )}

      {/* Bottom Navigation - mobile only */}
      {isMobile && <BottomNav />}
    </div>
  );
}
