import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCog,
  MessageSquare,
  Fingerprint,
  CreditCard,
} from 'lucide-react';
import { NexioMark } from '@/components/NexioLogo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n';
import { useBusinessBrand } from '@/contexts/BusinessBrandContext';
import { useStaffTerms } from '@/hooks/useStaffTerms';
import { useTimeTrackingSettings } from '@/hooks/useQueryHooks';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const allNavItems: {
  icon: typeof Calendar;
  labelKey: TranslationKey;
  path: string;
  adminOnly: boolean;
  requiresTimeTracking: boolean;
}[] = [
  { icon: Calendar, labelKey: 'nav.calendar', path: '/calendar', adminOnly: false, requiresTimeTracking: false },
  { icon: MessageSquare, labelKey: 'nav.consultations', path: '/consultations', adminOnly: false, requiresTimeTracking: false },
  { icon: Fingerprint, labelKey: 'nav.timeTracking', path: '/time-tracking', adminOnly: false, requiresTimeTracking: true },
  { icon: Users, labelKey: 'nav.clients', path: '/clients', adminOnly: false, requiresTimeTracking: false },
  { icon: UserCog, labelKey: 'nav.staff', path: '/barbers', adminOnly: true, requiresTimeTracking: false },
  { icon: Scissors, labelKey: 'nav.services', path: '/services', adminOnly: true, requiresTimeTracking: false },
  { icon: LayoutDashboard, labelKey: 'nav.finances', path: '/dashboard', adminOnly: true, requiresTimeTracking: false },
  { icon: BarChart3, labelKey: 'nav.reports', path: '/reports', adminOnly: true, requiresTimeTracking: false },
  { icon: CreditCard, labelKey: 'nav.billing', path: '/billing', adminOnly: true, requiresTimeTracking: false },
  { icon: Settings, labelKey: 'nav.settings', path: '/settings', adminOnly: false, requiresTimeTracking: false },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { logout, user, isAdmin } = useAuth();
  const { t } = useTranslation();
  const { brand } = useBusinessBrand();
  const staffTerms = useStaffTerms();
  const { data: timeTrackingSettings } = useTimeTrackingSettings();

  const navItems = allNavItems
    .map(item => ({
      ...item,
      label: item.path === '/barbers' ? staffTerms.pluralCap : t(item.labelKey),
    }))
    .filter(item => {
      if (item.adminOnly && !isAdmin) return false;
      if (item.requiresTimeTracking && !timeTrackingSettings?.timeTrackingEnabled) return false;
      return true;
    });

  const navigate = useNavigate();

  const NavItem = ({ icon: Icon, label, path }: typeof navItems[0]) => {
    const isActive = location.pathname === path || location.pathname.startsWith(path + '/');

    const handleClick = (e: React.MouseEvent) => {
      if (path === '/calendar') {
        e.preventDefault();
        navigate('/calendar', { state: { resetView: Date.now() } });
      }
    };

    const content = (
      <Link
        to={path}
        onClick={handleClick}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
          'hover:bg-sidebar-accent',
          isActive && 'bg-sidebar-accent text-primary font-medium',
          !isActive && 'text-sidebar-foreground/80'
        )}
      >
        <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar-background border-r border-sidebar-border flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'h-16 flex items-center border-b border-sidebar-border px-4',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <NexioMark size="md" />
            <span className="font-semibold text-sidebar-foreground truncate">{brand.businessName || 'Nexio'}</span>
          </div>
        )}
        {collapsed && (
          <NexioMark size="md" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-dark">
        {navItems.map((item) => (
          <NavItem key={item.path} {...item} />
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && user && (
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'default'}
              className={cn(
                'w-full text-sidebar-foreground/80 hover:text-destructive hover:bg-destructive/10',
                !collapsed && 'justify-start'
              )}
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span className="ml-3">{t('auth.signOut')}</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">{t('auth.signOut')}</TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-sidebar-background border border-sidebar-border rounded-full flex items-center justify-center hover:bg-sidebar-accent transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </aside>
  );
}
