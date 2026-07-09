// NotificationContext - handles in-app notifications
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  DbNotification,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  deleteNotification,
} from '@/services/supabaseNotifications';
import { CalendarPlus, CalendarX, CalendarCog, CalendarMinus, Bell, User, UserPlus, UserCog, UserX, Info, MessageSquare, MessageSquareText, MessageSquareX, CalendarCheck, Scissors, SquarePen, SquareX, Clock, CalendarOff, Building2, Settings, LogIn, LogOut } from 'lucide-react';

export type NotificationType =
  | 'booking_created'
  | 'booking_cancelled'
  | 'booking_modified'
  | 'booking_deleted'
  | 'booking_status_changed'
  | 'booking_reminder'
  | 'event_created'
  | 'event_modified'
  | 'event_deleted'
  | 'client_created'
  | 'client_modified'
  | 'client_deleted'
  | 'consultation_created'
  | 'consultation_updated'
  | 'consultation_deleted'
  | 'service_created'
  | 'service_modified'
  | 'service_deleted'
  | 'barber_created'
  | 'barber_modified'
  | 'schedule_modified'
  | 'time_off_modified'
  | 'business_hours_modified'
  | 'business_settings_modified'
  | 'time_entry_clock_in'
  | 'time_entry_clock_out'
  | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  data?: Record<string, unknown>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Map DB notification to frontend notification
function mapDbToNotification(dbNotif: DbNotification): Notification {
  return {
    id: dbNotif.id,
    type: dbNotif.type,
    title: dbNotif.title,
    message: dbNotif.message,
    createdAt: new Date(dbNotif.created_at),
    read: dbNotif.is_read,
    data: dbNotif.metadata || undefined,
  };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the actual logged-in user's ID and business from the users table
  const userId = user?.id;
  const businessId = user?.businessId;

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchNotifications(userId, 20);
      const mapped = data.map(mapDbToNotification);
      setNotifications(mapped);
      setUnreadCount(mapped.filter((n) => !n.read).length);
    } catch (err) {
      setError('Error al cargar notificaciones');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial load - load when authenticated and user ID is available
  useEffect(() => {
    if (isAuthenticated && userId) {
      loadNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, userId, loadNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!isAuthenticated || !userId) return;


    const channelName = `notifications-${userId}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = mapDbToNotification(payload.new as DbNotification);
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedNotif = mapDbToNotification(payload.new as DbNotification);
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
          );
          // Recalculate unread count
          setNotifications((prev) => {
            setUnreadCount(prev.filter((n) => !n.read).length);
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setNotifications((prev) => {
            const updated = prev.filter((n) => n.id !== deletedId);
            setUnreadCount(updated.filter((n) => !n.read).length);
            return updated;
          });
        }
      )
      .subscribe();

    // Fallback: Poll for new notifications every 30 seconds if realtime fails
    const pollInterval = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, userId, loadNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    if (!businessId) return;
    try {
      await markNotificationAsRead(id, businessId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* ignored */ }
  }, [businessId]);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    
    try {
      await markAllNotificationsAsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignored */ }
  }, [userId]);

  const clearNotificationHandler = useCallback(async (id: string) => {
    if (!businessId) return;
    try {
      await deleteNotification(id, businessId);
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== id);
        setUnreadCount(updated.filter((n) => !n.read).length);
        return updated;
      });
    } catch { /* ignored */ }
  }, [businessId]);

  const clearAllHandler = useCallback(async () => {
    if (!userId) return;
    
    try {
      await clearAllNotifications(userId);
      setNotifications([]);
      setUnreadCount(0);
    } catch { /* ignored */ }
  }, [userId]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        error,
        refetch: loadNotifications,
        markAsRead,
        markAllAsRead,
        clearNotification: clearNotificationHandler,
        clearAll: clearAllHandler,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

// Helper to format notification time
export function formatNotificationTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

// Helper to get notification icon component based on type
export function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'booking_created':
      return CalendarPlus;
    case 'booking_cancelled':
      return CalendarX;
    case 'booking_modified':
      return CalendarCog;
    case 'booking_deleted':
      return CalendarMinus;
    case 'booking_status_changed':
      return CalendarCheck;
    case 'booking_reminder':
      return Bell;
    case 'event_created':
      return CalendarPlus;
    case 'event_modified':
      return CalendarCog;
    case 'event_deleted':
      return CalendarMinus;
    case 'client_created':
      return UserPlus;
    case 'client_modified':
      return UserCog;
    case 'client_deleted':
      return UserX;
    case 'consultation_created':
      return MessageSquare;
    case 'consultation_updated':
      return MessageSquareText;
    case 'consultation_deleted':
      return MessageSquareX;
    case 'service_created':
      return Scissors;
    case 'service_modified':
      return SquarePen;
    case 'service_deleted':
      return SquareX;
    case 'barber_created':
      return UserPlus;
    case 'barber_modified':
      return UserCog;
    case 'schedule_modified':
      return Clock;
    case 'time_off_modified':
      return CalendarOff;
    case 'business_hours_modified':
      return Clock;
    case 'business_settings_modified':
      return Settings;
    case 'time_entry_clock_in':
      return LogIn;
    case 'time_entry_clock_out':
      return LogOut;
    default:
      return Info;
  }
}

// Helper to get notification icon color based on type
export function getNotificationIconColor(type: NotificationType): string {
  switch (type) {
    case 'booking_created':
      return 'text-green-500';
    case 'booking_cancelled':
    case 'booking_deleted':
      return 'text-destructive';
    case 'booking_modified':
    case 'booking_status_changed':
      return 'text-orange-500';
    case 'booking_reminder':
      return 'text-blue-500';
    case 'event_created':
      return 'text-green-500';
    case 'event_modified':
      return 'text-orange-500';
    case 'event_deleted':
      return 'text-destructive';
    case 'client_created':
    case 'barber_created':
      return 'text-green-500';
    case 'client_modified':
    case 'barber_modified':
      return 'text-orange-500';
    case 'client_deleted':
      return 'text-destructive';
    case 'consultation_created':
      return 'text-violet-500';
    case 'consultation_updated':
      return 'text-blue-500';
    case 'consultation_deleted':
      return 'text-destructive';
    case 'service_created':
      return 'text-green-500';
    case 'service_modified':
      return 'text-orange-500';
    case 'service_deleted':
      return 'text-destructive';
    case 'schedule_modified':
    case 'time_off_modified':
      return 'text-blue-500';
    case 'business_hours_modified':
    case 'business_settings_modified':
      return 'text-primary';
    case 'time_entry_clock_in':
      return 'text-green-500';
    case 'time_entry_clock_out':
      return 'text-orange-500';
    default:
      return 'text-muted-foreground';
  }
}

// Build a path with query params, skipping empty/non-string values
function buildPath(base: string, params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value) {
      search.set(key, value);
    }
  }
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

// Helper to get navigation path for a notification.
// Uses the notification metadata (booking_id, event_id, client_id, ...) to
// deep-link to the specific item instead of just the section.
export function getNotificationPath(notification: Notification): string | null {
  const data = notification.data ?? {};
  switch (notification.type) {
    case 'booking_created':
    case 'booking_cancelled':
    case 'booking_modified':
    case 'booking_status_changed':
    case 'booking_reminder':
      return buildPath('/calendar', { booking: data.booking_id, date: data.booking_date });
    case 'booking_deleted':
      // The booking no longer exists — just go to its day in the calendar
      return buildPath('/calendar', { date: data.booking_date });
    case 'event_created':
    case 'event_modified':
      return buildPath('/calendar', { event: data.event_id, date: data.event_date });
    case 'event_deleted':
      return buildPath('/calendar', { date: data.event_date });
    case 'client_created':
    case 'client_modified':
      return typeof data.client_id === 'string' && data.client_id ? `/clients/${data.client_id}` : '/clients';
    case 'client_deleted':
      return '/clients';
    case 'consultation_created':
    case 'consultation_updated':
      return buildPath('/consultations', { consultation: data.consultation_id });
    case 'consultation_deleted':
      return '/consultations';
    case 'service_created':
    case 'service_modified':
    case 'service_deleted':
      return '/services';
    case 'barber_created':
    case 'barber_modified':
    case 'schedule_modified':
    case 'time_off_modified':
      return '/barbers';
    case 'business_hours_modified':
    case 'business_settings_modified':
      return '/settings';
    case 'time_entry_clock_in':
    case 'time_entry_clock_out':
      return '/time-tracking';
    default:
      return null;
  }
}
