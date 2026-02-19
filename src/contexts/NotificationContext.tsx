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
import { CalendarPlus, CalendarX, CalendarCog, Bell, User, Info, MessageSquare, MessageSquareText } from 'lucide-react';

export type NotificationType = 
  | 'booking_created' 
  | 'booking_cancelled' 
  | 'booking_modified' 
  | 'booking_reminder' 
  | 'client_created' 
  | 'consultation_created'
  | 'consultation_updated'
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
    data: dbNotif.data || undefined,
  };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the actual logged-in user's ID from the users table
  const userId = user?.id;

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      console.log('🔔 No user ID available, skipping notification fetch');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔔 Fetching notifications for user:', userId);
      const data = await fetchNotifications(userId, 20);
      const mapped = data.map(mapDbToNotification);
      setNotifications(mapped);
      setUnreadCount(mapped.filter((n) => !n.read).length);
      console.log('🔔 Notifications loaded:', mapped.length, 'for user:', userId);
    } catch (err) {
      console.error('Failed to load notifications:', err);
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

    console.log('🔔 Setting up real-time notification subscription for user:', userId);

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
          console.log('🔔 New notification received:', payload.new);
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
          console.log('🔔 Notification updated:', payload.new);
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
          console.log('🔔 Notification deleted:', payload.old);
          const deletedId = (payload.old as { id: string }).id;
          setNotifications((prev) => {
            const updated = prev.filter((n) => n.id !== deletedId);
            setUnreadCount(updated.filter((n) => !n.read).length);
            return updated;
          });
        }
      )
      .subscribe((status, err) => {
        console.log('🔔 Notification subscription status:', status);
        if (err) {
          console.error('🔔 Subscription error:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time notifications connected successfully');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time channel error - falling back to polling');
        } else if (status === 'TIMED_OUT') {
          console.error('❌ Real-time connection timed out');
        }
      });

    // Fallback: Poll for new notifications every 30 seconds if realtime fails
    const pollInterval = setInterval(() => {
      console.log('🔔 Polling for notifications...');
      loadNotifications();
    }, 30000);

    return () => {
      console.log('🔔 Cleaning up notification subscription');
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, userId, loadNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    
    try {
      await markAllNotificationsAsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, [userId]);

  const clearNotificationHandler = useCallback(async (id: string) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== id);
        setUnreadCount(updated.filter((n) => !n.read).length);
        return updated;
      });
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }, []);

  const clearAllHandler = useCallback(async () => {
    if (!userId) return;
    
    try {
      await clearAllNotifications(userId);
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to clear all notifications:', err);
    }
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
    case 'booking_reminder':
      return Bell;
    case 'client_created':
      return User;
    case 'consultation_created':
      return MessageSquare;
    case 'consultation_updated':
      return MessageSquareText;
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
      return 'text-destructive';
    case 'booking_modified':
      return 'text-orange-500';
    case 'booking_reminder':
      return 'text-blue-500';
    case 'client_created':
      return 'text-primary';
    case 'consultation_created':
      return 'text-violet-500';
    case 'consultation_updated':
      return 'text-blue-500';
    default:
      return 'text-muted-foreground';
  }
}

// Helper to get navigation path for a notification
export function getNotificationPath(notification: Notification): string | null {
  switch (notification.type) {
    case 'booking_created':
    case 'booking_cancelled':
    case 'booking_modified':
    case 'booking_reminder':
      return '/calendar';
    case 'client_created':
      return notification.data?.client_id ? `/clients/${notification.data.client_id}` : '/clients';
    case 'consultation_created':
    case 'consultation_updated':
      return '/consultations';
    default:
      return null;
  }
}
