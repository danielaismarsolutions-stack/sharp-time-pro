import { Link, useLocation } from 'react-router-dom';
import {
  Calendar,
  Users,
  Scissors,
  LayoutDashboard,
  BarChart3,
  Settings,
  LogOut,
  UserCog,
  MessageSquare,
  Fingerprint,
  CreditCard,
  List,
  LayoutGrid,
  Columns3,
} from 'lucide-react';
import { NexioMark } from '@/components/NexioLogo';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessBrand } from '@/contexts/BusinessBrandContext';
import { useStaffTerms } from '@/hooks/useStaffTerms';
import { useTimeTrackingSettings } from '@/hooks/useQueryHooks';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/i18n';
import { cn } from '@/lib/utils';

type ViewMode = 'day' | '3day' | 'week' | 'month' | 'agenda';

interface MobileDrawerMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentViewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  showViewModeSelector?: boolean;
}

const allNavItems: {
  icon: typeof Calendar;
  labelKey: TranslationKey;
  path: string;
  adminOnly: boolean;
  requiresTimeTracking: boolean;
}[] = [
  { icon: Calendar, labelKey: 'calendar.drawer.nav.agenda', path: '/calendar', adminOnly: false, requiresTimeTracking: false },
  { icon: MessageSquare, labelKey: 'calendar.drawer.nav.consultations', path: '/consultations', adminOnly: false, requiresTimeTracking: false },
  { icon: Fingerprint, labelKey: 'calendar.drawer.nav.timeTracking', path: '/time-tracking', adminOnly: false, requiresTimeTracking: true },
  { icon: Users, labelKey: 'calendar.drawer.nav.clients', path: '/clients', adminOnly: false, requiresTimeTracking: false },
  { icon: UserCog, labelKey: 'calendar.drawer.nav.barbers', path: '/barbers', adminOnly: true, requiresTimeTracking: false },
  { icon: Scissors, labelKey: 'calendar.drawer.nav.services', path: '/services', adminOnly: true, requiresTimeTracking: false },
  { icon: LayoutDashboard, labelKey: 'calendar.drawer.nav.finance', path: '/dashboard', adminOnly: true, requiresTimeTracking: false },
  { icon: BarChart3, labelKey: 'calendar.drawer.nav.reports', path: '/reports', adminOnly: true, requiresTimeTracking: false },
  { icon: CreditCard, labelKey: 'calendar.drawer.nav.billing', path: '/billing', adminOnly: true, requiresTimeTracking: false },
  { icon: Settings, labelKey: 'calendar.drawer.nav.settings', path: '/settings', adminOnly: true, requiresTimeTracking: false },
];

const viewModeOptions: { value: ViewMode; labelKey: TranslationKey; icon: typeof List }[] = [
  { value: 'agenda', labelKey: 'calendar.views.agenda', icon: List },
  { value: 'day', labelKey: 'calendar.views.day', icon: LayoutGrid },
  { value: '3day', labelKey: 'calendar.views.threeDay', icon: Columns3 },
  { value: 'month', labelKey: 'calendar.views.month', icon: Calendar },
];

export function MobileDrawerMenu({
  open,
  onOpenChange,
  currentViewMode,
  onViewModeChange,
  showViewModeSelector = false,
}: MobileDrawerMenuProps) {
  const location = useLocation();
  const { logout, user, isAdmin } = useAuth();
  const { brand } = useBusinessBrand();
  const staffTerms = useStaffTerms();
  const { t } = useTranslation();
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

  const handleNavClick = () => {
    onOpenChange(false);
  };

  const handleViewModeSelect = (mode: ViewMode) => {
    onViewModeChange?.(mode);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Header with logo */}
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <NexioMark size="lg" />
            <SheetTitle className="text-lg font-semibold">{brand.businessName || 'Nexio'}</SheetTitle>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* View Mode Selector */}
          {showViewModeSelector && onViewModeChange && (
            <>
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {t('calendar.drawer.viewMode')}
                </p>
                <div className="space-y-1">
                  {viewModeOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = currentViewMode === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleViewModeSelect(option.value)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                          'hover:bg-muted',
                          isActive && 'bg-primary/10 text-primary font-medium'
                        )}
                      >
                        <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                        <span className="text-sm">{t(option.labelKey)}</span>
                        {isActive && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Separator className="mb-4" />
            </>
          )}

          {/* Navigation Items */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t('calendar.drawer.navigation')}
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(item.path + '/');

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={handleNavClick}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      'hover:bg-muted',
                      isActive && 'bg-primary/10 text-primary font-medium'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User section at bottom */}
        <div className="border-t border-border p-4 mt-auto">
          {user && (
            <div className="mb-3 px-3">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              logout();
              onOpenChange(false);
            }}
          >
            <LogOut className="h-5 w-5 mr-3" />
            {t('calendar.header.logout')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
