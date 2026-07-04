import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout.jsx';
import { getUserDetails, suspendUser, activateUser, deleteUser, addAdminNote, getAuditLogs } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

const formatDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const ACTION_LABEL = {
  suspend: 'Suspended',
  activate: 'Activated',
  delete: 'Deleted',
  add_note: 'Note added',
  create_admin: 'Admin created',
};

const AdminUserDetailsPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [hardDelete, setHardDelete] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [userData, logData] = await Promise.all([
        getUserDetails(userId),
        getAuditLogs(1, { userId }),
      ]);
      setUser(userData);
      setNoteText(userData.adminNote || '');
      setLogs(logData.logs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSuspend = async () => {
    setSaving(true);
    try {
      await suspendUser(userId, suspendReason.trim() || 'No reason provided');
      toast.success('User suspended.');
      setShowSuspendForm(false);
      setSuspendReason('');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    setSaving(true);
    try {
      await activateUser(userId);
      toast.success('User reactivated.');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteUser(userId, hardDelete);
      toast.success(hardDelete ? 'User permanently deleted.' : 'User deleted.');
      navigate('/admin/users');
    } catch (err) {
      toast.error(err.message);
      setSaving(false);
    }
  };

  const handleNoteSave = async () => {
    setSaving(true);
    try {
      await addAdminNote(userId, noteText);
      toast.success('Note saved.');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-64" />
          <div className="h-40 bg-gray-900 border border-gray-800 rounded-xl" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !user) {
    return (
      <AdminLayout>
        <div className="p-4 bg-red-950 border border-red-800 text-red-300 rounded-lg text-sm">{error || 'User not found.'}</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <nav className="text-sm text-gray-500 mb-4">
        <Link to="/admin/users" className="hover:text-indigo-400 transition">Users</Link>
        <span className="mx-1.5">/</span>
        <span className="text-gray-300">{user.name}</span>
      </nav>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
              <div>
                <h1 className="text-xl font-bold text-white">{user.name}</h1>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                user.isActive ? 'bg-green-950 text-green-400 border-green-800' : 'bg-red-950 text-red-400 border-red-800'
              }`}>
                {user.isActive ? 'Active' : 'Suspended'}
              </span>
            </div>

            {!user.isActive && user.suspendedReason && (
              <div className="mb-4 p-3 bg-red-950/50 border border-red-900 rounded-lg text-sm text-red-300">
                Suspended: {user.suspendedReason}
              </div>
            )}

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-gray-500">Role</dt><dd className="text-gray-200 capitalize mt-0.5">{user.role}</dd></div>
              <div><dt className="text-gray-500">Joined</dt><dd className="text-gray-200 mt-0.5">{formatDate(user.joinedAt)}</dd></div>
              <div><dt className="text-gray-500">Last login</dt><dd className="text-gray-200 mt-0.5">{formatDate(user.lastLogin)}</dd></div>
              <div><dt className="text-gray-500">Profile completion</dt><dd className="text-gray-200 mt-0.5">{user.profileCompletion}%</dd></div>
            </dl>

            {/* Role-specific stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
              {user.role === 'recruiter' && (
                <>
                  <Stat label="Jobs Posted" value={user.jobsPosted} />
                  <Stat label="Applications Received" value={user.applicationsReceived} />
                  {user.topJob && <Stat label="Top Job" value={`${user.topJob.title} (${user.topJob.applicationCount})`} small />}
                </>
              )}
              {user.role === 'seeker' && (
                <>
                  <Stat label="Applications Sent" value={user.applicationsSent} />
                  <Stat label="Jobs Saved" value={user.savedJobsCount} />
                </>
              )}
            </div>
          </div>

          {/* Audit log for this user */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-gray-200 text-sm mb-4">Actions on this user</h3>
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500">No admin actions recorded for this user yet.</p>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between text-sm border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-gray-200">
                        <span className="font-medium">{ACTION_LABEL[log.action] || log.action}</span>
                        {' by '}
                        <span className="text-gray-400">{log.admin?.name || 'Unknown admin'}</span>
                      </p>
                      {log.reason && <p className="text-gray-500 text-xs mt-0.5">"{log.reason}"</p>}
                    </div>
                    <span className="text-xs text-gray-600 shrink-0">{formatDate(log.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Admin actions sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-gray-200 text-sm mb-4">Admin Actions</h3>

            {user.role === 'admin' ? (
              <p className="text-xs text-gray-500">Admin accounts can't be suspended or deleted by other admins.</p>
            ) : (
              <div className="space-y-2">
                {user.isActive ? (
                  showSuspendForm ? (
                    <div className="space-y-2">
                      <textarea
                        value={suspendReason}
                        onChange={(e) => setSuspendReason(e.target.value)}
                        placeholder="Reason…"
                        rows={2}
                        className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSuspend} disabled={saving}
                          className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-60">
                          Confirm
                        </button>
                        <button onClick={() => setShowSuspendForm(false)}
                          className="flex-1 border border-gray-700 text-gray-300 text-sm font-medium py-2 rounded-lg hover:bg-gray-800 transition">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowSuspendForm(true)}
                      className="w-full bg-yellow-950 border border-yellow-800 text-yellow-400 hover:bg-yellow-900 text-sm font-medium py-2 rounded-lg transition">
                      Suspend User
                    </button>
                  )
                ) : (
                  <button onClick={handleActivate} disabled={saving}
                    className="w-full bg-green-950 border border-green-800 text-green-400 hover:bg-green-900 text-sm font-medium py-2 rounded-lg transition disabled:opacity-60">
                    Activate User
                  </button>
                )}

                {confirmingDelete ? (
                  <div className="space-y-2 pt-2 border-t border-gray-800 mt-2">
                    <label className="flex items-center gap-2 text-xs text-gray-400">
                      <input type="checkbox" checked={hardDelete} onChange={(e) => setHardDelete(e.target.checked)} />
                      Permanently hard-delete
                    </label>
                    <div className="flex gap-2">
                      <button onClick={handleDelete} disabled={saving}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-60">
                        Confirm Delete
                      </button>
                      <button onClick={() => setConfirmingDelete(false)}
                        className="flex-1 border border-gray-700 text-gray-300 text-sm font-medium py-2 rounded-lg hover:bg-gray-800 transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmingDelete(true)}
                    className="w-full bg-red-950 border border-red-800 text-red-400 hover:bg-red-900 text-sm font-medium py-2 rounded-lg transition mt-2">
                    Delete User
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="font-semibold text-gray-200 text-sm mb-3">Admin Note</h3>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Private note about this user…"
              rows={4}
              className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
            />
            <button onClick={handleNoteSave} disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-60">
              Save Note
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

const Stat = ({ label, value, small }) => (
  <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`font-semibold text-gray-100 mt-0.5 ${small ? 'text-xs' : 'text-lg'}`}>{value ?? '—'}</p>
  </div>
);

export default AdminUserDetailsPage;
