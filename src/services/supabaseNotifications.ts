import { SUPABASE_CONFIG } from '@/config/api';
import { getAuthHeaders } from '@/lib/supabase';

const NOTIFICATION_URL_MAP: Record<string, string> = {
  booking_created: '/calendar',
  booking_cancelled: '/calendar',
  booking_modified: '/calendar',
  booking_deleted: '/calendar',
  booking_status_changed: '/calendar',
  booking_reminder: '/calendar',
  event_created: '/calendar',
  event_modified: '/calendar',
  event_deleted: '/calendar',
  client_created: '/clients',
  client_modified: '/clients',
  client_deleted: '/clients',
  consultation_created: '/consultations',
  consultation_updated: '/consultations',
  consultation_deleted: '/consultations',
  service_created: '/services',
  service_modified: '/services',
  service_deleted: '/services',
};

async function sendPushNotification(userId: string, title: string, message: string, type: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    const url = `${SUPABASE_CONFIG.url}/functions/v1/send-push-notification`;
    await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        title,
        message,
        url: NOTIFICATION_URL_MAP[type] || '/',
      }),
    });
  } catch {
    // Push is best-effort, don't block on failure
  }
}

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
  business_id: string;
  type: DbNotificationType;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
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

export async function markNotificationAsRead(notificationId: string, businessId: string): Promise<void> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications?id=eq.${notificationId}&business_id=eq.${businessId}`;
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

export async function deleteNotification(notificationId: string, businessId: string): Promise<void> {
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications?id=eq.${notificationId}&business_id=eq.${businessId}`;
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
  const notification = notifications[0];

  // Fire push notification (best-effort, non-blocking)
  sendPushNotification(data.user_id, data.title, data.message, data.type);

  return notification;
}

// Fetch all admin/owner user IDs for a business
async function fetchAdminUserIds(businessId: string): Promise<string[]> {
  const headers = await getAuthHeaders();
  const url = `${SUPABASE_CONFIG.url}/rest/v1/users?business_id=eq.${businessId}&or=(role.eq.admin,role.eq.owner)&select=id`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    return [];
  }

  const users: { id: string }[] = await response.json();
  return users.map((u) => u.id);
}

export interface NotifyAdminsData {
  business_id: string;
  type: DbNotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates a notification for ALL admin/owner users in the business.
 * This ensures admins see all bookings, consultations, changes, and deletions.
 */
export async function notifyAllAdmins(data: NotifyAdminsData): Promise<void> {
  const adminIds = await fetchAdminUserIds(data.business_id);
  if (adminIds.length === 0) return;

  const headers = await getAuthHeaders();
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications`;

  // Create one notification row per admin user
  const rows = adminIds.map((adminId) => ({
    user_id: adminId,
    business_id: data.business_id,
    type: data.type,
    title: data.title,
    message: data.message,
    metadata: data.metadata || null,
    is_read: false,
  }));

  // Batch insert all notifications in a single request
  const response = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to notify admins: ${response.status}`);
  }

  // Fire push notifications for each admin (best-effort, non-blocking)
  for (const adminId of adminIds) {
    sendPushNotification(adminId, data.title, data.message, data.type);
  }
}

export interface NotifyBookingUsersData {
  business_id: string;
  type: DbNotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  /** The barber's user_id from the booking (booking.user_id) */
  barber_user_id?: string | null;
  /** The user_id of whoever performed the action (for skip-self logic) */
  performed_by_user_id: string;
}

/**
 * Creates notifications for booking events:
 * - All admin/owner users in the business (they see all bookings)
 * - The assigned barber (if role=barber, they only see their own)
 *
 * Includes performed_by_user_id in metadata so the DB trigger
 * can skip sending push to the person who performed the action.
 * Push notifications are handled by the DB trigger (not client-side).
 */
export async function notifyBookingUsers(data: NotifyBookingUsersData): Promise<void> {
  const adminIds = await fetchAdminUserIds(data.business_id);

  // Collect all user IDs to notify (admins + barber, deduplicated)
  const userIdsToNotify = new Set(adminIds);
  if (data.barber_user_id) {
    userIdsToNotify.add(data.barber_user_id);
  }

  if (userIdsToNotify.size === 0) return;

  const headers = await getAuthHeaders();
  const url = `${SUPABASE_CONFIG.url}/rest/v1/notifications`;

  // Ensure performed_by_user_id is in metadata for the DB trigger's skip-self logic
  const metadata = {
    ...(data.metadata || {}),
    performed_by_user_id: data.performed_by_user_id,
  };

  const rows = Array.from(userIdsToNotify).map((userId) => ({
    user_id: userId,
    business_id: data.business_id,
    type: data.type,
    title: data.title,
    message: data.message,
    metadata,
    is_read: false,
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to notify booking users: ${response.status}`);
  }

  // Push notifications are handled by the DB trigger (send_push_on_notification)
  // which filters for booking types and skips self-actions automatically.
  // No client-side sendPushNotification calls needed here.
}
