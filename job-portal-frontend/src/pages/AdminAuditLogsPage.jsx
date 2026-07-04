import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout.jsx';
import { getAuditLogs } from '../services/api.js';

const formatDate = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const ACTION_LABEL = {
  suspend: 'Suspended',
  activate: 'Activated',
  delete: 'Deleted',
  add_note: 'Note added',
  create_admin: 'Admin created',
};

const actionBadge = {
  suspend: 'bg-yellow-950 text-yellow-400 border-yellow-800',
  activate: 'bg-green-950 text-green-400 border-green-800',
  delete: 'bg-red-950 text-red-400 border-red-800',
  add_note: 'bg-gray-800 text-gray-300 border-gray-700',
  create_admin: 'bg-indigo-950 text-indigo-400 border-indigo-800',
};

const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAuditLogs(page, { action: action || undefined });
      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, action]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-1">{totalCount} recorded admin actions</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {['', 'suspend', 'activate', 'delete', 'add_note'].map((a) => (
          <button
            key={a || 'all'}
            onClick={() => { setAction(a); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${
              action === a ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'
            }`}
          >
            {a ? ACTION_LABEL[a] : 'All'}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-950 border border-red-800 text-red-300 rounded-lg text-sm">{error}</div>}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Admin</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target User</th>
              <th className="px-4 py-3 font-medium">Reason / Changes</th>
              <th className="px-4 py-3 font-medium">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td colSpan={5} className="px-4 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No audit logs recorded yet.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-850 align-top">
                  <td className="px-4 py-3 text-gray-300">{log.admin?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${actionBadge[log.action] || 'bg-gray-800 text-gray-300 border-gray-700'}`}>
                      {ACTION_LABEL[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{log.targetUser?.name || '(deleted user)'}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={log.reason || JSON.stringify(log.changes)}>
                    {log.reason || JSON.stringify(log.changes)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                p === page ? 'bg-indigo-600 text-white' : 'bg-gray-900 border border-gray-700 text-gray-400 hover:bg-gray-800'
              }`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAuditLogsPage;
