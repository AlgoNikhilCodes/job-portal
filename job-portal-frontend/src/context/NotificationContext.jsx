import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';
import { apiGet, apiPut } from '../services/api.js';

const NotificationContext = createContext(null);

// Icons/labels are derived from `type` in the UI layer (NotificationBell,
// NotificationsPage) — this context only owns data + connection state.
export const NotificationProvider = ({ children }) => {
  const { socket, user } = useAuth();
  const toast = useToast();

  // Recent live notifications (bell dropdown) — capped so it can't grow forever
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // connecting | connected | disconnected
  const lastErrorToastAt = useRef(0);

  const isConnected = connectionStatus === 'connected';

  const fetchUnreadCount = useCallback(async () => {
    try {
      const data = await apiGet('/notifications/count/unread');
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Non-fatal — badge just stays at its last known value
    }
  }, []);

  // Bug fix (QA pass): the bell dropdown reads from `notifications`, but
  // until now that array was ONLY ever populated by live socket events —
  // there was no initial fetch of notifications that already existed before
  // this page load. That's why the badge count (from fetchUnreadCount,
  // which reads the DB) was correct while the dropdown said "No
  // notifications yet": historical notifications were never loaded into
  // state, only ones that arrived in real time during the current session.
  // The full /notifications page worked fine because it fetches its own
  // list directly, bypassing this context entirely.
  const fetchRecentNotifications = useCallback(async () => {
    try {
      const data = await apiGet('/notifications?page=1');
      setNotifications(data.notifications || []); // backend already sorts newest-first
    } catch {
      // Non-fatal — dropdown just stays empty until the next successful fetch or live event
    }
  }, []);

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => [notification, ...prev].slice(0, 20));
    setUnreadCount((prev) => prev + 1);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await apiPut(`/notifications/${notificationId}`);
    } catch {
      // If the request fails, the next fetchUnreadCount() / page load will
      // resync — not worth surfacing an error toast for this.
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await apiPut('/notifications/mark-all-read');
    } catch {
      fetchUnreadCount();
    }
  }, [fetchUnreadCount]);

  // Wire up socket listeners whenever the socket instance changes (new
  // connection on login, null on logout).
  useEffect(() => {
    if (!socket) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');

    const handleConnect = () => {
      setConnectionStatus('connected');
      fetchUnreadCount();
      fetchRecentNotifications();
    };
    const handleDisconnect = () => setConnectionStatus('disconnected');
    const handleConnectError = () => {
      setConnectionStatus('disconnected');
      // Rate-limit the error toast so reconnection retries don't spam the user
      const now = Date.now();
      if (now - lastErrorToastAt.current > 15000) {
        lastErrorToastAt.current = now;
        toast.error("Lost connection to live updates. We'll keep trying to reconnect.");
      }
    };

    const handleApplicationSubmitted = (payload) => {
      addNotification(payload);
      toast.success(payload.message);
    };
    const handleStatusChanged = (payload) => {
      addNotification(payload);
      toast.success(payload.message);
    };
    const handleNewJobMatch = (payload) => {
      addNotification(payload);
      toast.info(payload.message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('application:submitted', handleApplicationSubmitted);
    socket.on('application:status_changed', handleStatusChanged);
    socket.on('job:new_matching', handleNewJobMatch);

    // Socket may already be connected by the time this effect runs
    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('application:submitted', handleApplicationSubmitted);
      socket.off('application:status_changed', handleStatusChanged);
      socket.off('job:new_matching', handleNewJobMatch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Reset local notification state on logout so the next user who logs in
  // on this device doesn't see the previous user's notifications flash by.
  // Also does the initial hydration fetch on login/page-load — independent
  // of socket connection state, so the dropdown has real data even if the
  // socket takes a moment to connect (handleConnect above re-fetches too,
  // which is harmless/idempotent).
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
    } else {
      fetchRecentNotifications();
      fetchUnreadCount();
    }
  }, [user, fetchRecentNotifications, fetchUnreadCount]);

  const value = {
    socket,
    notifications,
    unreadCount,
    isConnected,
    connectionStatus,
    addNotification,
    removeNotification,
    clearAllNotifications,
    markAsRead,
    markAllAsRead,
    setUnreadCount,
    fetchUnreadCount,
    fetchRecentNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
};
