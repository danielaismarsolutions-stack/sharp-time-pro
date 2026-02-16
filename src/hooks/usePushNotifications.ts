import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const VAPID_PUBLIC_KEY = 'BKKBmrY_U1UnpLeNNiqbDnoZYR7H-j4j-vMhjaIOwlsi_XOZSqFGijgwI9bonM5fpz3OCseDt44tx6BWr7-bsG0';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(userId: string | null, businessId: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !userId) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (e) {
      console.error('Error checking push subscription:', e);
    }
  }, [userId]);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, [userId, checkSubscription]);

  const subscribe = useCallback(async () => {
    console.log('🔔 Subscribe called:', { userId, businessId, isSupported });
    if (!userId || !businessId) {
      console.warn('🔔 Cannot subscribe: missing userId or businessId', { userId, businessId });
      return;
    }
    if (!isSupported) {
      console.warn('🔔 Cannot subscribe: push not supported');
      return;
    }
    setIsLoading(true);

    try {
      // Register service worker
      console.log('🔔 Registering service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      console.log('🔔 Service worker ready');

      // Request permission
      console.log('🔔 Requesting notification permission...');
      const perm = await Notification.requestPermission();
      console.log('🔔 Permission result:', perm);
      setPermission(perm);
      
      if (perm !== 'granted') {
        console.log('🔔 Push notification permission denied');
        setIsLoading(false);
        return;
      }

      // Subscribe to push
      console.log('🔔 Subscribing to push manager...');
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      const subJson = subscription.toJSON();
      console.log('🔔 Push subscription created:', subJson.endpoint);

      // Save to database
      console.log('🔔 Saving subscription to database...');
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        business_id: businessId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      }, {
        onConflict: 'endpoint'
      });

      if (error) {
        console.error('🔔 Error saving push subscription:', error);
        throw error;
      }
      
      console.log('✅ Push notifications enabled successfully');
      setIsSubscribed(true);
    } catch (e) {
      console.error('🔔 Error subscribing to push notifications:', e);
    } finally {
      setIsLoading(false);
    }
  }, [userId, businessId, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);

        if (error) {
          console.error('Error removing push subscription from database:', error);
        }
      }
      
      console.log('✅ Push notifications disabled');
      setIsSubscribed(false);
    } catch (e) {
      console.error('Error unsubscribing from push notifications:', e);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const toggle = useCallback(async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  return { 
    permission, 
    isSubscribed, 
    isLoading, 
    isSupported,
    subscribe, 
    unsubscribe,
    toggle
  };
}
