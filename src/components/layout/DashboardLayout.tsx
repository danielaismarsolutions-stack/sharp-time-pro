import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { MobileDrawerMenu } from '@/components/calendar/MobileDrawerMenu';
import SubscriptionBanner from '@/components/billing/SubscriptionBanner';
import { cn } from '@/lib/utils';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { useBillingInfo } from '@/hooks/useQueryHooks';

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { data: billing } = useBillingInfo(isAdmin);
  const showPastDueBanner = isAdmin && billing?.subscription_status === 'past_due';

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
    <div className="min-h-screen bg-background flex w-full overflow-x-hidden max-w-[100vw]">
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
          'flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 w-full min-w-0',
          !isMobile && !isCalendarPage && (sidebarCollapsed ? 'ml-16' : 'ml-60'),
          (isMobile || isCalendarPage) && 'ml-0'
        )}
      >
        {/* Hide TopBar on calendar page - it has its own header */}
        {!isCalendarPage && <TopBar isMobile={isMobile} onMenuClick={() => setIsMobileMenuOpen(true)} />}
        {showPastDueBanner && <SubscriptionBanner />}
        <main className={cn(
          'flex-1 scrollbar-dark overflow-x-hidden w-full max-w-full',
          isCalendarPage ? 'overflow-y-hidden' : 'overflow-y-auto',
          isMobile && !isCalendarPage && 'pb-16'
        )}>
          <ErrorBoundary compact>
            <Outlet />
          </ErrorBoundary>
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
