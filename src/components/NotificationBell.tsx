import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCheck, Trash2, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';

const severityDot: Record<string, string> = {
  info: 'bg-blue-400',
  low: 'bg-green-400',
  medium: 'bg-yellow-400',
  high: 'bg-orange-400',
  critical: 'bg-red-500',
};

const typeIcon: Record<string, string> = {
  wind_alert: '⚡',
  wind_change: '💨',
  temp_alert: '🌡️',
  energy_opportunity: '🌿',
  info: 'ℹ️',
  location: '📍',
};

const NotificationBell: React.FC = () => {
  const {
    notifications, unreadCount, markAllRead, markRead,
    clearNotifications, permissionGranted, requestPermission,
  } = useNotifications();

  const [open, setOpen] = useState(false);
  const [showThresholdHint, setShowThresholdHint] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label={`Notifications — ${unreadCount} unread`}
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'animate-[wiggle_0.5s_ease-in-out]' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification panel */}
      {open && (
        <div className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col max-h-[520px]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <span className="font-bold text-gray-900 dark:text-white text-sm">
              Notifications {unreadCount > 0 && <span className="ml-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">{unreadCount} new</span>}
            </span>
            <div className="flex items-center gap-1.5">
              {!permissionGranted && (
                <button
                  onClick={requestPermission}
                  onMouseEnter={() => setShowThresholdHint(true)}
                  onMouseLeave={() => setShowThresholdHint(false)}
                  className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition whitespace-nowrap"
                >
                  Enable Push
                </button>
              )}
              {unreadCount > 0 && (
                <button onClick={markAllRead} title="Mark all read" className="p-1 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition rounded">
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearNotifications} title="Clear all" className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <Link to="/monitor" onClick={() => setOpen(false)} title="Live Monitor" className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition rounded">
                <Settings className="h-4 w-4" />
              </Link>
              <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showThresholdHint && (
            <div className="mx-4 mt-2 p-2 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded-lg">
              Enable browser notifications to get alerts even when WindCast Pro is in the background.
            </div>
          )}

          {/* List */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500">
                <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs mt-1 max-w-xs mx-auto">Subscribe to cities on the Prediction page to receive real-time weather alerts.</p>
              </div>
            ) : (
              notifications.slice(0, 25).map(notif => (
                <button
                  key={notif.id}
                  onClick={() => markRead(notif.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition ${!notif.read ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg leading-none mt-0.5">{typeIcon[notif.type] ?? 'ℹ️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">{notif.city}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(notif.timestamp)}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-tight">{notif.message}</p>
                      {notif.detail && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.detail}</p>}
                    </div>
                    <span className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${severityDot[notif.severity] ?? 'bg-gray-300'} ${!notif.read ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <Link
              to="/monitor"
              onClick={() => setOpen(false)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Open Live Monitor →
            </Link>
            {notifications.length > 0 && (
              <span className="text-xs text-gray-400">{notifications.length} total</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
