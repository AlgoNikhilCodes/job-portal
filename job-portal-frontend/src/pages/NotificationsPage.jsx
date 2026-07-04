import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPut, apiDelete } from '../services/api.js';
import { useNotification } from '../context/NotificationContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatRelativeTime } from '../utils/formatTime.js';

const TYPE_LABELS = {
  'application:submitted': 'Application',
  'application:status_changed': 'Status Update',
  'job:new_matching': 'Job Alert',
};

const TYPE_FILTERS = ['All', 'application:submitted', 'application:status_changed', 'job:new_matching'];

const NotificationsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { fetchUnreadCount } = useNotification();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState('All');
  const [selected, setSelected] = useState(new Set());

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet(`/notifications?page=${page}&unread_only=${unreadOnly}`);
      setNotifications(data.notifications || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const filtered = typeFilter === 'All' ? notifications : notifications.filter((n) => n.type === typeFilter);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMarkRead = async (id) => {
    try {
      await apiPut(`/notifications/${id}`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      fetchUnreadCount();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiPut('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      fetchUnreadCount();
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiDelete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchUnreadCount();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    try {
      await Promise.all(ids.map((id) => apiDelete(`/notifications/${id}`)));
      setNotifications((prev) => prev.filter((n) => !selected.has(n._id)));
      setSelected(new Set());
      fetchUnreadCount();
      toast.success(`Deleted ${ids.length} notification${ids.length !== 1 ? 's' : ''}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleClearAll = async () => {
    try {
      await Promise.all(notifications.map((n) => apiDelete(`/notifications/${n._id}`)));
      setNotifications([]);
      fetchUnreadCount();
      toast.success('All notifications cleared');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-xl font-bold text-blue-600">Job Portal</Link>
          <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-blue-600 transition">← Back</button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <div className="flex gap-2 flex-wrap">
            {selected.size > 0 && (
              <button onClick={handleBulkDelete}
                className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition font-medium">
                Delete Selected ({selected.size})
              </button>
            )}
            <button onClick={handleMarkAllRead}
              className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition font-medium">
              Mark all as read
            </button>
            {notifications.length > 0 && (
              <button onClick={handleClearAll}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          <button
            onClick={() => setUnreadOnly((v) => !v)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              unreadOnly ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Unread only
          </button>
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                typeFilter === t ? 'bg-gray-800 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t === 'All' ? 'All Types' : TYPE_LABELS[t] || t}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {loading ? (
          <div className="space-y-3 animate-skeleton" aria-label="Loading notifications" role="status">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-white border border-gray-100 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-gray-400">No notifications yet. You&apos;ll see updates here!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => (
              <div
                key={n._id}
                className={`bg-white border rounded-xl p-4 flex items-start gap-3 transition ${
                  !n.isRead ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 opacity-80'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(n._id)}
                  onChange={() => toggleSelect(n._id)}
                  aria-label={`Select notification: ${n.title}`}
                  className="mt-1.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                    <p className="font-semibold text-gray-900 text-sm">{n.title}</p>
                    <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">
                      {TYPE_LABELS[n.type] || n.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(n.createdAt)}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {n.link && (
                    <button onClick={() => navigate(n.link)} className="text-xs text-blue-600 hover:underline font-medium">
                      View →
                    </button>
                  )}
                  {!n.isRead && (
                    <button onClick={() => handleMarkRead(n._id)} className="text-xs text-gray-500 hover:text-blue-600 transition">
                      Mark as read
                    </button>
                  )}
                  <button onClick={() => handleDelete(n._id)} className="text-xs text-red-500 hover:text-red-700 transition">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
