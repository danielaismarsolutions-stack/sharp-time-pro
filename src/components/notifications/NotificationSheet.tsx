import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import {
  useNotifications,
  formatNotificationTime,
  getNotificationIcon,
  getNotificationIconColor,
  getNotificationPath,
} from '@/contexts/NotificationContext';

interface NotificationSheetProps {
  children?: React.ReactNode;
}

export function NotificationSheet({ children }: NotificationSheetProps) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications();

  const trigger = children || (
    <Button variant="ghost" size="icon" className="h-10 w-10 relative">
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
  );

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-96 p-0">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              Notificaciones
              {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            </SheetTitle>
            {notifications.length > 0 && (
              <div className="flex gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => markAllAsRead()}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Marcar leídas
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => clearAll()}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              {isLoading ? 'Cargando...' : 'No hay notificaciones'}
            </div>
          ) : (
            notifications.map((notif) => {
              const IconComponent = getNotificationIcon(notif.type);
              const iconColor = getNotificationIconColor(notif.type);

              return (
                <button
                  key={notif.id}
                  className={cn(
                    'flex items-start gap-3 py-3 px-4 w-full text-left transition-colors hover:bg-muted/50',
                    !notif.read && 'bg-primary/5'
                  )}
                  onClick={() => {
                    markAsRead(notif.id);
                    const path = getNotificationPath(notif);
                    if (path) {
                      navigate(path);
                    }
                  }}
                >
                  <div className={cn('flex-shrink-0 mt-0.5', iconColor)}>
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className={cn('text-sm', !notif.read && 'font-medium')}>
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
                </button>
              );
            })
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
