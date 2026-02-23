import { SUPABASE_CONFIG } from '@/config/api';
import { getAuthHeaders } from '@/lib/supabase';

export type DbNotificationType =
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
  | 'info';

export interface DbNotification {
  id: string;
  user_id: string;
  type: DbNotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export async function fetchNotifications(userId: string, limit = 20): Promise<DbNotification[]> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications?user_id=eq.${userId}&order=created_at.desc&limit=${limit}`;
  const headers = await getAuthHeaders();

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch notifications: ${response.status}`);
  }

  return response.json();
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications?user_id=eq.${userId}&is_read=eq.false&select=id`;
  const headers = await getAuthHeaders();

  const response = await fetch(url, {
    method: 'GET',
    headers: { ...headers, 'Prefer': 'count=exact' },
  });

  if (!response.ok) {
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
  const headers = await getAuthHeaders();

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ is_read: true }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to mark notification as read: ${response.status}`);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications?user_id=eq.${userId}&is_read=eq.false`;
  const headers = await getAuthHeaders();

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({ is_read: true }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to mark all notifications as read: ${response.status}`);
  }
}

export async function clearAllNotifications(userId: string): Promise<void> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications?user_id=eq.${userId}`;
  const headers = await getAuthHeaders();

  const response = await fetch(url, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to clear notifications: ${response.status}`);
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications?id=eq.${notificationId}`;
  const headers = await getAuthHeaders();

  const response = await fetch(url, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete notification: ${response.status}`);
  }
}

export interface CreateNotificationData {
  user_id: string;
  business_id: string;
  type: DbNotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(data: CreateNotificationData): Promise<DbNotification> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications`;
  const headers = await getAuthHeaders();

  const response = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({
      user_id: data.user_id,
      business_id: data.business_id,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata || null,
      is_read: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create notification: ${response.status}`);
  }

  const notifications = await response.json();
  return notifications[0];
}
