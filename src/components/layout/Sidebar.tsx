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
} from 'lucide-react';
import { NexioMark } from '@/components/NexioLogo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
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

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { logout, user, isAdmin } = useAuth();

  const navItems = allNavItems.filter(item => !item.adminOnly || isAdmin);

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
            <span className="font-semibold text-sidebar-foreground">Nexio</span>
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
              {!collapsed && <span className="ml-3">Cerrar sesión</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">Logout</TooltipContent>
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
