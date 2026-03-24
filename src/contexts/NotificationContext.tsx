import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { sendWeatherAlertEmail } from '../services/weatherEmailService';

export interface Subscription {
  city: string;
  windThreshold: number;
  tempDropThreshold: number;
  lastWindSpeed: number | null;
  lastTemp: number | null;
  enabled: boolean;
  addedAt: string;
}

export interface AppNotification {
  id: number;
  type: 'wind_alert' | 'wind_change' | 'temp_alert' | 'energy_opportunity' | 'info' | 'location';
  city: string;
  message: string;
  detail: string;
  timestamp: string;
  read: boolean;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
}

interface NotificationContextType {
  subscriptions: Subscription[];
  notifications: AppNotification[];
  unreadCount: number;
  permissionGranted: boolean;
  addSubscription: (city: string, windThreshold?: number, tempDropThreshold?: number) => void;
  removeSubscription: (city: string) => void;
  updateSubscription: (city: string, updates: Partial<Subscription>) => void;
  markAllRead: () => void;
  markRead: (id: number) => void;
  clearNotifications: () => void;
  requestPermission: () => Promise<void>;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  isSubscribed: (city: string) => boolean;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const API_KEY = '1f17f795128639f79920cea6fe9dcfd4';
const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes for real-time feel

// Show notification via service worker (works on mobile) or fallback to browser Notification API
async function showMobileNotification(title: string, body: string, tag: string) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag,
        // vibrate: [200, 100, 200],
        // @ts-ignore - actions supported in Chrome
        actions: [{ action: 'view', title: 'View Details' }],
      });
      return;
    } catch (_) { /* fall through */ }
  }
  // Fallback: regular Notification API
  if (Notification.permission === 'granted') {
    try { new Notification(title, { body, tag }); } catch (_) { /* ignore */ }
  }
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    try { return JSON.parse(localStorage.getItem('windcast_subscriptions') || '[]'); }
    catch { return []; }
  });
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try { return JSON.parse(localStorage.getItem('windcast_notifications') || '[]'); }
    catch { return []; }
  });
  const [permissionGranted, setPermissionGranted] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  const subscriptionsRef = useRef(subscriptions);
  const pollTimeoutRef = useRef<number | null>(null);

  useEffect(() => { subscriptionsRef.current = subscriptions; }, [subscriptions]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const saveSubscriptions = useCallback((subs: Subscription[]) => {
    setSubscriptions(subs);
    subscriptionsRef.current = subs;
    localStorage.setItem('windcast_subscriptions', JSON.stringify(subs));
    // Notify service worker about updated subscriptions
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'WEATHER_POLL', subscriptions: subs });
    }
  }, []);

  const saveNotifications = (notifs: AppNotification[]) => {
    const trimmed = notifs.slice(0, 50);
    setNotifications(trimmed);
    localStorage.setItem('windcast_notifications', JSON.stringify(trimmed));
  };

  // Listen for messages from service worker (subscription updates)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SUBS_UPDATED' && Array.isArray(event.data.subscriptions)) {
        setSubscriptions(event.data.subscriptions);
        subscriptionsRef.current = event.data.subscriptions;
        localStorage.setItem('windcast_subscriptions', JSON.stringify(event.data.subscriptions));
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notification,
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev].slice(0, 50);
      localStorage.setItem('windcast_notifications', JSON.stringify(updated));
      return updated;
    });
    // Mobile-first notification
    const iconMap: Record<string, string> = {
      wind_alert: '⚡', wind_change: '💨', temp_alert: '🌡️',
      energy_opportunity: '🌿', info: 'ℹ️', location: '📍',
    };
    const icon = iconMap[notification.type] ?? '';
    showMobileNotification(
      `WindCast Pro — ${notification.city}`,
      `${icon} ${notification.message}`,
      `wc-${notification.city}-${notification.type}`
    );
  }, []);

  const requestPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const permission = await Notification.requestPermission();
      setPermissionGranted(permission === 'granted');
    }
  };

  const addSubscription = (city: string, windThreshold = 10, tempDropThreshold = 5) => {
    const existing = subscriptionsRef.current.find(
      s => s.city.toLowerCase() === city.toLowerCase()
    );
    if (!existing) {
      const newSub: Subscription = {
        city,
        windThreshold,
        tempDropThreshold,
        lastWindSpeed: null,
        lastTemp: null,
        enabled: true,
        addedAt: new Date().toISOString(),
      };
      saveSubscriptions([...subscriptionsRef.current, newSub]);
    }
  };

  const removeSubscription = (city: string) => {
    saveSubscriptions(subscriptionsRef.current.filter(s => s.city !== city));
  };

  const updateSubscription = (city: string, updates: Partial<Subscription>) => {
    saveSubscriptions(subscriptionsRef.current.map(s => s.city === city ? { ...s, ...updates } : s));
  };

  const isSubscribed = (city: string) =>
    subscriptionsRef.current.some(s => s.city.toLowerCase() === city.toLowerCase());

  const markAllRead = () => saveNotifications(notifications.map(n => ({ ...n, read: true })));
  const markRead = (id: number) => saveNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  const clearNotifications = () => saveNotifications([]);

  // ── Background polling: every 2 minutes ─────────────────────────────────────
  const pollSubscriptions = useCallback(async () => {
    const currentSubs = subscriptionsRef.current;
    const enabledSubs = currentSubs.filter(s => s.enabled);
    if (enabledSubs.length === 0) {
      pollTimeoutRef.current = window.setTimeout(pollSubscriptions, POLL_INTERVAL);
      return;
    }

    const updatedSubs = [...currentSubs];
    const newNotifications: AppNotification[] = [];

    for (const sub of enabledSubs) {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(sub.city)}&appid=${API_KEY}&units=metric`,
          { cache: 'no-store' }
        );
        if (!res.ok) continue;
        const data = await res.json();
        const newWindSpeed = Math.round(data.wind.speed * 10) / 10;
        const newTemp = Math.round(data.main.temp * 10) / 10;

        const idx = updatedSubs.findIndex(s => s.city === sub.city);
        if (idx === -1) continue;
        const prev = updatedSubs[idx];

        if (prev.lastWindSpeed !== null) {
          const change = newWindSpeed - prev.lastWindSpeed;
          const absChange = Math.abs(change);

          // Wind change ≥ 3 m/s → alert
          if (absChange >= 3) {
            const dir = change > 0 ? 'increased' : 'decreased';
            newNotifications.push({
              id: Date.now() + Math.random(),
              type: 'wind_change',
              city: sub.city,
              message: `Wind ${dir} by ${absChange.toFixed(1)} m/s`,
              detail: `Now ${newWindSpeed} m/s (was ${prev.lastWindSpeed} m/s)`,
              timestamp: new Date().toISOString(),
              read: false,
              severity: absChange >= 6 ? 'high' : absChange >= 4 ? 'medium' : 'low',
            });
          }

          // Threshold breach
          if (newWindSpeed > sub.windThreshold && prev.lastWindSpeed <= sub.windThreshold) {
            newNotifications.push({
              id: Date.now() + Math.random(),
              type: 'wind_alert',
              city: sub.city,
              message: `Wind exceeded your ${sub.windThreshold} m/s threshold!`,
              detail: `Current: ${newWindSpeed} m/s`,
              timestamp: new Date().toISOString(),
              read: false,
              severity: newWindSpeed > 15 ? 'critical' : 'high',
            });
          }
        }

        if (prev.lastTemp !== null) {
          const tempDrop = prev.lastTemp - newTemp;
          if (tempDrop >= sub.tempDropThreshold) {
            newNotifications.push({
              id: Date.now() + Math.random(),
              type: 'temp_alert',
              city: sub.city,
              message: `Temperature dropped ${tempDrop.toFixed(1)}°C`,
              detail: `Now ${newTemp}°C (was ${prev.lastTemp}°C)`,
              timestamp: new Date().toISOString(),
              read: false,
              severity: 'medium',
            });
          }
        }

        // Energy opportunity
        if (newWindSpeed >= 8 && newWindSpeed <= 15) {
          const score = Math.round((newWindSpeed / 15) * 100);
          if (score >= 65 && (prev.lastWindSpeed === null || Math.abs(newWindSpeed - prev.lastWindSpeed) >= 2)) {
            newNotifications.push({
              id: Date.now() + Math.random(),
              type: 'energy_opportunity',
              city: sub.city,
              message: `Optimal wind energy window — Score: ${score}/100`,
              detail: `Wind: ${newWindSpeed} m/s — ideal for power generation`,
              timestamp: new Date().toISOString(),
              read: false,
              severity: 'info',
            });
          }
        }

        updatedSubs[idx] = { ...prev, lastWindSpeed: newWindSpeed, lastTemp: newTemp };
      } catch (_) { /* silent fail */ }
    }

    saveSubscriptions(updatedSubs);

    if (newNotifications.length > 0) {
      setNotifications(prev => {
        const updated = [...newNotifications, ...prev].slice(0, 50);
        localStorage.setItem('windcast_notifications', JSON.stringify(updated));
        return updated;
      });

      // Get logged-in user's email for email alerts
      let userEmail = '';
      let userName  = '';
      try {
        const u = JSON.parse(localStorage.getItem('windcast_user') || '{}');
        userEmail = u.email || '';
        userName  = u.name  || 'WindCast User';
      } catch (_) {}

      const iconMap: Record<string, string> = {
        wind_alert: '⚡', wind_change: '💨', temp_alert: '🌡️',
        energy_opportunity: '🌿', info: 'ℹ️', location: '📍',
      };

      for (const n of newNotifications) {
        // 1. Mobile push notification
        await showMobileNotification(
          `WindCast Pro — ${n.city}`,
          `${iconMap[n.type] ?? ''} ${n.message}`,
          `wc-${n.city}-${n.type}`
        );

        // 2. Email alert to registered user
        if (userEmail) {
          const sub = updatedSubs.find(s => s.city === n.city);
          sendWeatherAlertEmail({
            userEmail,
            userName,
            city:        n.city,
            alertType:   n.type === 'wind_change'        ? 'Wind Change Alert'
                       : n.type === 'wind_alert'         ? 'High Wind Alert'
                       : n.type === 'temp_alert'         ? 'Temperature Drop Alert'
                       : n.type === 'energy_opportunity' ? 'Energy Opportunity Alert'
                       : 'Weather Alert',
            message:     n.message,
            detail:      n.detail,
            windSpeed:   sub?.lastWindSpeed ?? 0,
            temperature: sub?.lastTemp      ?? 0,
          });
        }
      }
    }

    pollTimeoutRef.current = window.setTimeout(pollSubscriptions, POLL_INTERVAL);
  }, []); // eslint-disable-line

  useEffect(() => {
    // First poll after 15 seconds, then every 2 minutes
    pollTimeoutRef.current = window.setTimeout(pollSubscriptions, 15000);
    return () => { if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current); };
  }, []); // eslint-disable-line

  // Also poll when user returns to the tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && subscriptionsRef.current.some(s => s.enabled)) {
        if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = window.setTimeout(pollSubscriptions, 2000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [pollSubscriptions]);

  return (
    <NotificationContext.Provider value={{
      subscriptions, notifications, unreadCount, permissionGranted,
      addSubscription, removeSubscription, updateSubscription,
      markAllRead, markRead, clearNotifications, requestPermission,
      addNotification, isSubscribed,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
