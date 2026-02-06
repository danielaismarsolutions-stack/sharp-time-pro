import { format } from 'date-fns';
import { Search, Command, Settings, HelpCircle, User } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationSheet } from '@/components/notifications/NotificationSheet';

interface TopBarProps {
  onSearchOpen?: () => void;
  isMobile?: boolean;
}

export default function TopBar({ onSearchOpen, isMobile }: TopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <header className="h-14 md:h-16 bg-card border-b border-border flex items-center justify-between px-3 md:px-6 sticky top-0 z-30">
      {/* Left side - Search */}
      <div className="flex items-center gap-2 md:gap-4 flex-1 max-w-md">
        {isMobile && (
          <h1 className="font-bold text-lg">BarberPro</h1>
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
          <p className="text-sm font-medium">{format(new Date(), 'EEEE')}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(), 'MMM d, yyyy')}</p>
        </div>

        {/* Notifications */}
        <NotificationSheet />

        {/* User menu */}
        <DropdownMenu>
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
            <DropdownMenuItem 
              className="min-h-[44px] cursor-pointer"
              onClick={() => navigate('/settings')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Ajustes
            </DropdownMenuItem>
            <DropdownMenuItem className="min-h-[44px] cursor-pointer">
              <User className="h-4 w-4 mr-2" />
              Mi perfil
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
    </header>
  );
}
