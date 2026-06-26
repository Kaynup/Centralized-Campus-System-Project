import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as notificationApi from '../api/notificationApi';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [backendUpdated, setBackendUpdated] = useState(false);
  const latestNotificationIdRef = useRef(null);
  
  const loadNotifications = useCallback(async (isPolling = false) => {
    if (!user) return;
    try {
      const responseData = await notificationApi.fetchNotifications();
      const data = Array.isArray(responseData) ? responseData : [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
      
      if (data.length > 0) {
        const currentLatestId = data[0].id;
        if (isPolling && latestNotificationIdRef.current && currentLatestId > latestNotificationIdRef.current) {
          // A new notification has arrived in the background! Auto-refresh the calendar silently.
          window.dispatchEvent(new CustomEvent('refreshBookings'));
        }
        latestNotificationIdRef.current = currentLatestId;
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications(false);
    
    // Poll every 30 seconds for background updates
    if (user) {
      const interval = setInterval(() => {
        loadNotifications(true);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user, loadNotifications]);

  const markAsRead = async (id) => {
    try {
      await notificationApi.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const clearRead = async () => {
    try {
      await notificationApi.clearReadNotifications();
      setNotifications(prev => prev.filter(n => !n.read));
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
    }
  };

  const dismissUpdateBanner = () => {
    setBackendUpdated(false);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        backendUpdated,
        dismissUpdateBanner,
        markAsRead,
        markAllAsRead,
        clearRead,
        refreshNotifications: () => loadNotifications(false)
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
