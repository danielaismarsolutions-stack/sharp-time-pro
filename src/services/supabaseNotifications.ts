import { SUPABASE_CONFIG } from '@/config/api';

export interface DbNotification {
  id: string;
  user_id: string;
  type: 'booking_created' | 'booking_cancelled' | 'booking_modified' | 'booking_reminder' | 'client_created' | 'info';
  title: string;
  message: string;
  data: Record<string, any> | null;
  is_read: boolean;
  created_at: string;
}

const supabaseHeaders = {
  'apikey': SUPABASE_CONFIG.anonKey,
  'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
  'Content-Type': 'application/json',
};

export async function fetchNotifications(userId: string, limit = 20): Promise<DbNotification[]> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications?user_id=eq.${userId}&order=created_at.desc&limit=${limit}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: supabaseHeaders,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to fetch notifications:', errorText);
    throw new Error(`Failed to fetch notifications: ${response.status}`);
  }

  return response.json();
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications?user_id=eq.${userId}&is_read=eq.false&select=id`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...supabaseHeaders,
      'Prefer': 'count=exact',
    },
  });

  if (!response.ok) {
    console.error('❌ Failed to fetch unread count');
    return 0;
  }

  const contentRange = response.headers.get('content-range');
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  const data = await response.json();
  return Array.isArray(data) ? data.length : 0;
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications?id=eq.${notificationId}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      ...supabaseHeaders,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ is_read: true }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to mark notification as read:', errorText);
    throw new Error(`Failed to mark notification as read: ${response.status}`);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications?user_id=eq.${userId}&is_read=eq.false`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      ...supabaseHeaders,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ is_read: true }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to mark all notifications as read:', errorText);
    throw new Error(`Failed to mark all notifications as read: ${response.status}`);
  }
}

export async function clearAllNotifications(userId: string): Promise<void> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications?user_id=eq.${userId}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: supabaseHeaders,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to clear notifications:', errorText);
    throw new Error(`Failed to clear notifications: ${response.status}`);
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications?id=eq.${notificationId}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: supabaseHeaders,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to delete notification:', errorText);
    throw new Error(`Failed to delete notification: ${response.status}`);
  }
}
