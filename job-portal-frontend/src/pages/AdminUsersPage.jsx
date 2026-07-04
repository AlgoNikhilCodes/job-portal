import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout.jsx';
import { getAllUsers, suspendUser, activateUser, deleteUser, addAdminNote } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const roleBadge = {
  seeker: 'bg-blue-950 text-blue-400 border-blue-800',
  recruiter: 'bg-purple-950 text-purple-400 border-purple-800',
  admin: 'bg-indigo-950 text-indigo-400 border-indigo-800',
};

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  const [suspendTarget, setSuspendTarget] = useState(null); // user being suspended (reason modal)
  const [suspendReason, setSuspendReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // user being deleted (confirm modal)
  const [hardDelete, setHardDelete] = useState(false);
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [busyId, setBusyId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllUsers(page, { role, status, search: search.trim() || undefined });
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, role, status, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounce search so we don't fire a request on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleSuspendConfirm = async () => {
    if (!suspendTarget) return;
    setBusyId(suspendTarget.id);
    try {
      await suspendUser(suspendTarget.id, suspendReason.trim() || 'No reason provided');
      toast.success(`${suspendTarget.name} has been suspended.`);
      setSuspendTarget(null);
      setSuspendReason('');
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleActivate = async (u) => {
    setBusyId(u.id);
    try {
      await activateUser(u.id);
      toast.success(`${u.name} has been reactivated.`);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteUser(deleteTarget.id, hardDelete);
      toast.success(hardDelete ? 'User permanently deleted.' : 'User account deleted.');
      setDeleteTarget(null);
      setHardDelete(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleNoteSave = async () => {
    if (!noteTarget) return;
    setBusyId(noteTarget.id);
    try {
      await addAdminNote(noteTarget.id, noteText);
      toast.success('Note saved.');
      setNoteTarget(null);
      setNoteText('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">{totalCount} total users</p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 min-w-[200px] px-4 py-2 text-sm bg-gray-900 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-gray-900 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Roles</option>
          <option value="seeker">Seeker</option>
          <option value="recruiter">Recruiter</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-gray-900 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error && <div className="mb-4 p-3 bg-red-950 border border-red-800 text-red-300 rounded-lg text-sm">{error}</div>}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td colSpan={6} className="px-4 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No users match these filters.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-850">
                  <td className="px-4 py-3 text-gray-200 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${roleBadge[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                      u.isActive ? 'bg-green-950 text-green-400 border-green-800' : 'bg-red-950 text-red-400 border-red-800'
                    }`}>
                      {u.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(u.joinedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <button
                        onClick={() => navigate(`/admin/users/${u.id}`)}
                        className="px-2.5 py-1 text-xs font-medium text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 transition"
                      >
                        View
                      </button>
                      {u.role !== 'admin' && (
                        u.isActive ? (
                          <button
                            disabled={busyId === u.id}
                            onClick={() => { setSuspendTarget(u); setSuspendReason(''); }}
                            className="px-2.5 py-1 text-xs font-medium text-yellow-400 border border-yellow-800 rounded-lg hover:bg-yellow-950 transition disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            disabled={busyId === u.id}
                            onClick={() => handleActivate(u)}
                            className="px-2.5 py-1 text-xs font-medium text-green-400 border border-green-800 rounded-lg hover:bg-green-950 transition disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )
                      )}
                      <button
                        onClick={() => { setNoteTarget(u); setNoteText(''); }}
                        className="px-2.5 py-1 text-xs font-medium text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 transition"
                      >
                        Note
                      </button>
                      {u.role !== 'admin' && (
                        <button
                          disabled={busyId === u.id}
                          onClick={() => { setDeleteTarget(u); setHardDelete(false); }}
                          className="px-2.5 py-1 text-xs font-medium text-red-400 border border-red-800 rounded-lg hover:bg-red-950 transition disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                p === page ? 'bg-indigo-600 text-white' : 'bg-gray-900 border border-gray-700 text-gray-400 hover:bg-gray-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Suspend modal */}
      {suspendTarget && (
        <Modal onClose={() => setSuspendTarget(null)} title={`Suspend ${suspendTarget.name}?`}>
          <p className="text-sm text-gray-400 mb-3">This user will be immediately signed out and unable to log back in until reactivated.</p>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="Reason for suspension…"
            rows={3}
            className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 mb-4"
          />
          <div className="flex gap-3">
            <button onClick={handleSuspendConfirm} disabled={busyId === suspendTarget.id}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-60">
              Confirm Suspend
            </button>
            <button onClick={() => setSuspendTarget(null)}
              className="flex-1 border border-gray-700 text-gray-300 hover:bg-gray-800 font-medium py-2 rounded-lg text-sm transition">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)} title={`Delete ${deleteTarget.name}?`}>
          <p className="text-sm text-gray-400 mb-3">
            Soft delete deactivates the account but keeps historical data intact. Hard delete permanently removes
            the user and cascades to their {deleteTarget.role === 'recruiter' ? 'jobs and related applications' : 'applications'}.
          </p>
          <label className="flex items-center gap-2 text-sm text-gray-300 mb-4">
            <input type="checkbox" checked={hardDelete} onChange={(e) => setHardDelete(e.target.checked)} />
            Permanently hard-delete (cannot be undone)
          </label>
          <div className="flex gap-3">
            <button onClick={handleDeleteConfirm} disabled={busyId === deleteTarget.id}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-60">
              {hardDelete ? 'Permanently Delete' : 'Delete'}
            </button>
            <button onClick={() => setDeleteTarget(null)}
              className="flex-1 border border-gray-700 text-gray-300 hover:bg-gray-800 font-medium py-2 rounded-lg text-sm transition">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Note modal */}
      {noteTarget && (
        <Modal onClose={() => setNoteTarget(null)} title={`Note on ${noteTarget.name}`}>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="e.g. Premium client, flagged for review…"
            rows={4}
            className="w-full px-3 py-2 text-sm bg-gray-950 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
          />
          <div className="flex gap-3">
            <button onClick={handleNoteSave} disabled={busyId === noteTarget.id}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg text-sm transition disabled:opacity-60">
              Save Note
            </button>
            <button onClick={() => setNoteTarget(null)}
              className="flex-1 border border-gray-700 text-gray-300 hover:bg-gray-800 font-medium py-2 rounded-lg text-sm transition">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
};

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div
      className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full animate-[modal-in_0.15s_ease-out]"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      {children}
    </div>
  </div>
);

export default AdminUsersPage;
