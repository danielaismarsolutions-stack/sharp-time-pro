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
import { cn } from '@/lib/utils';

type ViewMode = 'day' | '3day' | 'week' | 'month' | 'agenda';

interface MobileDrawerMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentViewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  showViewModeSelector?: boolean;
}

const allNavItems = [
  { icon: Calendar, label: 'Agenda', path: '/calendar', adminOnly: false },
  { icon: MessageSquare, label: 'Consultas', path: '/consultations', adminOnly: false },
  { icon: Users, label: 'Clientes', path: '/clients', adminOnly: false },
  { icon: UserCog, label: 'Barberos', path: '/barbers', adminOnly: true },
  { icon: Scissors, label: 'Servicios', path: '/services', adminOnly: true },
  { icon: LayoutDashboard, label: 'Finanzas', path: '/dashboard', adminOnly: true },
  { icon: BarChart3, label: 'Informes', path: '/reports', adminOnly: true },
  { icon: Settings, label: 'Ajustes', path: '/settings', adminOnly: true },
];

const viewModeOptions = [
  { value: 'agenda' as ViewMode, label: 'Agenda', icon: List },
  { value: 'day' as ViewMode, label: 'Día', icon: LayoutGrid },
  { value: '3day' as ViewMode, label: '3 Días', icon: Columns3 },
  { value: 'month' as ViewMode, label: 'Mes', icon: Calendar },
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

  const navItems = allNavItems.filter(item => !item.adminOnly || isAdmin);

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
            <SheetTitle className="text-lg font-semibold">Nexio</SheetTitle>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* View Mode Selector */}
          {showViewModeSelector && onViewModeChange && (
            <>
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Modo de vista
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
                        <span className="text-sm">{option.label}</span>
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
              Navegación
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
            Cerrar sesión
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
