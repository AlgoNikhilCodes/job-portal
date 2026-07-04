import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext.jsx';
import { formatRelativeTime } from '../utils/formatTime.js';

// One small icon per notification type keeps the dropdown scannable at a glance
const TYPE_ICON = {
  'application:submitted': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  'application:status_changed': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  'job:new_matching': (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m-3 6h16" />
    </svg>
  ),
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, isConnected, markAsRead, markAllAsRead } = useNotification();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const recent = notifications.slice(0, 5);

  const handleNotificationClick = (n) => {
    if (!n.isRead && n._id) markAsRead(n._id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        title={
          unreadCount > 0
            ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
            : 'Notifications'
        }
        className="relative p-2 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {/* Connection status dot */}
        <span
          className={`absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white ${
            isConnected ? 'bg-green-500' : 'bg-gray-300'
          }`}
          title={isConnected ? 'Connected' : 'Disconnected'}
        />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-lg border border-gray-100 z-50 animate-[modal-in_0.12s_ease-out] overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                No notifications yet. You&apos;ll see updates here!
              </div>
            ) : (
              recent.map((n) => (
                <button
                  key={n._id || `${n.type}-${n.timestamp}`}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition ${
                    !n.isRead ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <span className="mt-0.5 text-blue-500 shrink-0">
                    {TYPE_ICON[n.type] || (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 leading-snug truncate">{n.title}</span>
                    <span className="block text-xs text-gray-600 mt-0.5 leading-snug line-clamp-2">{n.message}</span>
                    <span className="block text-xs text-gray-400 mt-1">
                      {formatRelativeTime(n.timestamp || n.createdAt)}
                    </span>
                  </span>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => { setOpen(false); navigate('/notifications'); }}
            className="block w-full text-center py-2.5 text-sm text-blue-600 hover:bg-blue-50 font-medium border-t border-gray-100 transition"
          >
            View All →
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
