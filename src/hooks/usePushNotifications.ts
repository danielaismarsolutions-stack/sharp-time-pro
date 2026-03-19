import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const VAPID_PUBLIC_KEY = 'BPIaRLAEnHh6fqFv5MTZIe0Pgy39eihEetnOhlXV8DGcrBI0FVdki0mYulZVQy4qWHRnkv5fLpKgixqFWcR8gJ8';

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscription = await (registration as any).pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch { /* ignored */ }
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
    if (!userId || !businessId) {
      return;
    }
    if (!isSupported) {
      return;
    }
    setIsLoading(true);

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm !== 'granted') {
        setIsLoading(false);
        return;
      }

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      const subJson = subscription.toJSON();

      // Save to database
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
        throw error;
      }
      
      setIsSubscribed(true);
    } catch { /* ignored */ } finally {
      setIsLoading(false);
    }
  }, [userId, businessId, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscription = await (registration as any).pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);

        if (error) { /* ignored */ }
      }
      
      setIsSubscribed(false);
    } catch { /* ignored */ } finally {
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
