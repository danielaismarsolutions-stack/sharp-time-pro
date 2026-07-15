import { useState, useRef, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { Menu, ChevronDown, ChevronLeft, ChevronRight, Bell, List, LayoutGrid, Calendar as CalendarIcon, Filter, Settings, HelpCircle, User, Check, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  useNotifications,
  formatNotificationTime,
  getNotificationIcon,
  getNotificationIconColor,
  getNotificationPath
} from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';
import { MonthPickerOverlay } from './MonthPickerOverlay';

type ViewMode = 'day' | '3day' | 'week' | 'month' | 'agenda';

interface SetmoreHeaderProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onMenuClick?: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  barberNames: string[];
  selectedBarber: string | null;
  onBarberChange: (barber: string | null) => void;
  isMobile?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onMonthPickerOpenChange?: (isOpen: boolean) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  onGoToToday?: () => void;
}

export function SetmoreHeader({
  currentDate,
  onDateChange,
  onMenuClick,
  viewMode,
  onViewModeChange,
  barberNames,
  selectedBarber,
  onBarberChange,
  isMobile = false,
  onRefresh,
  isRefreshing = false,
  onMonthPickerOpenChange,
  onNavigate,
  onGoToToday,
}: SetmoreHeaderProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    onMonthPickerOpenChange?.(isMonthPickerOpen);
  }, [isMonthPickerOpen, onMonthPickerOpenChange]);

  // Get user initials
  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const handleMonthSelect = (date: Date) => {
    onDateChange(date);
    setIsMonthPickerOpen(false);
  };

  const toggleMonthPicker = () => {
    setIsMonthPickerOpen(!isMonthPickerOpen);
  };

  return (
    <div className="bg-background border-b border-border sticky top-0 z-30" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left: Hamburger menu */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="h-10 w-10"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Center: Month/Year with dropdown */}
        <Button
          ref={toggleButtonRef}
          variant="ghost"
          onClick={toggleMonthPicker}
          className="font-medium text-base md:text-lg gap-1 px-2"
        >
          <span className="capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 opacity-60 transition-transform duration-200",
            isMonthPickerOpen && "rotate-180"
          )} />
        </Button>

        {/* Right: Notifications + Avatar */}
        <div className="flex items-center gap-2">
          {/* Notifications Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 min-h-[44px] min-w-[44px] relative"
              >
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

          {/* User Menu Dropdown */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 min-h-[44px] min-w-[44px] rounded-full p-0">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-foreground text-background text-sm font-medium">
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
      </div>

      {/* Month Picker Overlay */}
      <MonthPickerOverlay
        currentDate={currentDate}
        isOpen={isMonthPickerOpen}
        onDateSelect={handleMonthSelect}
        onClose={() => setIsMonthPickerOpen(false)}
        onToggle={toggleMonthPicker}
        toggleButtonRef={toggleButtonRef}
      />

      {/* View Switcher + Barber Filter Row */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-card">
        {/* Navigation buttons - tablet/desktop only */}
        {!isMobile && (
          <div className="flex items-center gap-1 shrink-0 mr-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onNavigate?.('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={isSameDay(currentDate, new Date()) ? "ghost" : "outline"}
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => onGoToToday?.()}
              disabled={isSameDay(currentDate, new Date())}
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onNavigate?.('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)} className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="h-9">
            <TabsTrigger value="agenda" className="text-xs px-1.5 md:px-3 min-h-[40px]">
              <List className="h-4 w-4 mr-1" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="day" className="text-xs px-1.5 md:px-3 min-h-[40px]">
              <LayoutGrid className="h-4 w-4 mr-1" />
              Día
            </TabsTrigger>
            <TabsTrigger value="3day" className="text-xs px-1.5 md:px-3 min-h-[40px]">
              <CalendarIcon className="h-4 w-4 mr-1" />
              3 Días
            </TabsTrigger>
            {!isMobile && (
              <TabsTrigger value="week" className="text-xs px-1.5 md:px-3 min-h-[40px]">
                <LayoutGrid className="h-4 w-4 mr-1" />
                Semana
              </TabsTrigger>
            )}
            <TabsTrigger value="month" className="text-xs px-1.5 md:px-3 min-h-[40px]">
              <CalendarIcon className="h-4 w-4 mr-1" />
              Mes
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 shrink-0">
          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          )}

        {/* Barber Filter - shown for all users; barber users default to their own name */}
        {barberNames.length > 0 && (
          <Select
            value={selectedBarber || 'all'}
            onValueChange={(v) => onBarberChange(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-[76px] md:w-[140px] h-9">
              <Filter className="h-4 w-4 mr-1 shrink-0" />
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {barberNames.map((barberName) => (
                <SelectItem key={barberName} value={barberName}>
                  {barberName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        </div>
      </div>
    </div>
  );
}
