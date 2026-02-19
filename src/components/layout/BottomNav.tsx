import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Settings, ListTodo, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// Dynamic calendar icon component showing current date
function CalendarDateIcon({ className, isActive }: { className?: string; isActive?: boolean }) {
  const today = new Date().getDate();

  return (
    <div className={cn('relative w-6 h-6 flex items-center justify-center', className)}>
      {/* Calendar outline */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(isActive ? 'text-foreground' : 'text-gray-400')}
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      {/* Date number inside */}
      <span
        className={cn(
          'absolute text-[9px] font-bold',
          isActive ? 'text-foreground' : 'text-gray-400'
        )}
        style={{ top: '12px' }}
      >
        {today}
      </span>
    </div>
  );
}

// Smiley face icon for Customers
function SmileyIcon({ className, isActive }: { className?: string; isActive?: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('w-6 h-6', className, isActive ? 'text-foreground' : 'text-gray-400')}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: 'calendar' | 'services' | 'customers' | 'settings' | 'consultations';
  adminOnly?: boolean;
  barberOnly?: boolean;
}

const allNavItems: NavItem[] = [
  { id: 'calendar', icon: 'calendar', label: 'Agenda', path: '/calendar' },
  { id: 'consultations', icon: 'consultations', label: 'Consultas', path: '/consultations', barberOnly: true },
  { id: 'services', icon: 'services', label: 'Servicios', path: '/services', adminOnly: true },
  { id: 'customers', icon: 'customers', label: 'Clientes', path: '/clients' },
  { id: 'settings', icon: 'settings', label: 'Ajustes', path: '/settings', adminOnly: true },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isBarber } = useAuth();

  const navItems = allNavItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.barberOnly && !isBarber) return false;
    return true;
  });

  const renderIcon = (iconType: NavItem['icon'], isActive: boolean) => {
    switch (iconType) {
      case 'calendar':
        return <CalendarDateIcon isActive={isActive} />;
      case 'services':
        return <ListTodo className={cn('w-6 h-6', isActive ? 'text-foreground' : 'text-gray-400')} />;
      case 'customers':
        return <SmileyIcon isActive={isActive} />;
      case 'consultations':
        return <MessageSquare className={cn('w-6 h-6', isActive ? 'text-foreground' : 'text-gray-400')} />;
      case 'settings':
        return <Settings className={cn('w-6 h-6', isActive ? 'text-foreground' : 'text-gray-400')} />;
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/settings' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={(e) => {
                if (item.path === '/calendar') {
                  e.preventDefault();
                  navigate('/calendar', { state: { resetView: Date.now() } });
                }
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                'active:bg-muted'
              )}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.1 }}
              >
                {renderIcon(item.icon, isActive)}
              </motion.div>
              <span
                className={cn(
                  'text-[11px]',
                  isActive ? 'text-foreground font-medium' : 'text-gray-400'
                )}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
