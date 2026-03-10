import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, Search, Command, Check, Trash2, Settings, HelpCircle, User, Loader2, Menu, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useNotifications, 
  formatNotificationTime, 
  getNotificationIcon,
  getNotificationIconColor,
  getNotificationPath
} from '@/contexts/NotificationContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useBusinessBrand } from '@/contexts/BusinessBrandContext';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';

interface TopBarProps {
  onSearchOpen?: () => void;
  isMobile?: boolean;
  onMenuClick?: () => void;
}

export default function TopBar({ onSearchOpen, isMobile, onMenuClick }: TopBarProps) {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { brand } = useBusinessBrand();
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    isLoading,
    markAsRead, 
    markAllAsRead, 
    clearAll 
  } = useNotifications();

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <header className="bg-card border-b border-border flex items-center justify-between px-3 md:px-6 sticky top-0 z-30" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', minHeight: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}>
      {/* Left side - Search */}
      <div className="flex items-center gap-2 md:gap-4 flex-1 max-w-md">
        {isMobile && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="h-10 w-10 min-h-[44px] min-w-[44px] -ml-1"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg">{brand.businessName || 'Nexio'}</h1>
          </>
        )}
        {!isMobile && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clientes, reservas..."
              className="pl-9 pr-12 h-10 bg-muted/50 border-transparent focus:border-border focus:bg-background"
              onClick={onSearchOpen}
              readOnly
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-50">
              <Command className="h-3 w-3" />K
            </kbd>
          </div>
        )}
      </div>

      {/* Right side - Date, Notifications, Profile */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Current date/time - hidden on mobile */}
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium capitalize">{format(new Date(), 'EEEE', { locale: es })}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(), "d 'de' MMM yyyy", { locale: es })}</p>
        </div>

        {/* Notifications */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10 min-h-[44px] min-w-[44px]">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
            <div className="flex items-center justify-between px-2">
              <DropdownMenuLabel className="flex items-center gap-2">
                Notificaciones
                {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              </DropdownMenuLabel>
              {notifications.length > 0 && (
                <div className="flex gap-1">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        markAllAsRead();
                      }}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Marcar leídas
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={(e) => {
                      e.preventDefault();
                      clearAll();
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  {isLoading ? 'Cargando...' : 'No hay notificaciones'}
                </div>
              ) : (
                notifications.map((notif) => {
                  const IconComponent = getNotificationIcon(notif.type);
                  const iconColor = getNotificationIconColor(notif.type);
                  
                  return (
                    <DropdownMenuItem
                      key={notif.id}
                      className={cn(
                        "flex items-start gap-3 py-3 min-h-[44px] cursor-pointer",
                        !notif.read && "bg-primary/5"
                      )}
                      onClick={() => {
                        markAsRead(notif.id);
                        const path = getNotificationPath(notif);
                        if (path) {
                          navigate(path);
                        }
                      }}
                    >
                      <div className={cn("flex-shrink-0 mt-0.5", iconColor)}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span className={cn("text-sm", !notif.read && "font-medium")}>
                          {notif.title}
                        </span>
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {notif.message}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatNotificationTime(notif.createdAt)}
                        </span>
                      </div>
                      {!notif.read && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </DropdownMenuItem>
                  );
                })
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 min-h-[44px] min-w-[44px] rounded-full">
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isAdmin && (
              <DropdownMenuItem
                className="min-h-[44px] cursor-pointer"
                onClick={() => navigate('/settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Ajustes
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="min-h-[44px] cursor-pointer"
              onClick={() => navigate('/settings?tab=account')}
            >
              <User className="h-4 w-4 mr-2" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-[44px] cursor-pointer"
              onClick={() => setChangePasswordOpen(true)}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Cambiar contraseña
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-[44px] cursor-pointer">
              <HelpCircle className="h-4 w-4 mr-2" />
              Ayuda y soporte
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={logout} 
              className="text-destructive focus:text-destructive min-h-[44px] cursor-pointer"
            >
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </header>
  );
}
