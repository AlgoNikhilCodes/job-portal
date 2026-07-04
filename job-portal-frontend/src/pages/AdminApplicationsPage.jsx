import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout.jsx';
import { getAllApplications, getApplicationStats } from '../services/api.js';

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const statusBadge = {
  Applied: 'bg-gray-800 text-gray-300 border-gray-700',
  Shortlisted: 'bg-yellow-950 text-yellow-400 border-yellow-800',
  Accepted: 'bg-green-950 text-green-400 border-green-800',
  Rejected: 'bg-red-950 text-red-400 border-red-800',
};

const AdminApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [statusCounts, setStatusCounts] = useState(null);
  const [flowStats, setFlowStats] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllApplications(page, { status: status || undefined });
      setApplications(data.applications);
      setStatusCounts(data.statusCounts);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);
  useEffect(() => { getApplicationStats().then(setFlowStats).catch(() => {}); }, []);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Application Management</h1>
        <p className="text-sm text-gray-500 mt-1">{totalCount} total applications</p>
      </div>

      {/* Flow metrics */}
      {flowStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricTile label="Avg. Time to Decision" value={`${flowStats.averageTimeToDecision}d`} />
          <MetricTile label="Applied → Shortlisted" value={`${flowStats.conversionRate.appliedToShortlisted}%`} />
          <MetricTile label="Shortlisted → Accepted" value={`${flowStats.conversionRate.shortlistedToAccepted}%`} />
          <MetricTile label="Total Applications" value={flowStats.totalApplications} />
        </div>
      )}

      {/* Status counts + filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {['', 'Applied', 'Shortlisted', 'Accepted', 'Rejected'].map((s) => (
          <button
            key={s || 'All'}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${
              status === s ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'
            }`}
          >
            {s || 'All'} {s && statusCounts ? `(${statusCounts[s]})` : ''}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 p-3 bg-red-950 border border-red-800 text-red-300 rounded-lg text-sm">{error}</div>}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Seeker</th>
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Applied</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td colSpan={4} className="px-4 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                </tr>
              ))
            ) : applications.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500">No applications match this filter.</td></tr>
            ) : (
              applications.map((a) => (
                <tr key={a.id} className="border-b border-gray-800 hover:bg-gray-850">
                  <td className="px-4 py-3 text-gray-200 font-medium">{a.seeker?.name || '(deleted)'}</td>
                  <td className="px-4 py-3 text-gray-400">{a.job?.title || '(deleted job)'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge[a.status]}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(a.appliedAt)}</td>
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

      {/* Top jobs */}
      {flowStats?.topJobs?.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-6">
          <h3 className="font-semibold text-gray-200 text-sm mb-4">Top Jobs by Applications</h3>
          <div className="space-y-2">
            {flowStats.topJobs.map((j, idx) => (
              <div key={j.jobId} className="flex items-center justify-between text-sm border-b border-gray-800 pb-2 last:border-0 last:pb-0">
                <span className="text-gray-300">{idx + 1}. {j.title}</span>
                <span className="text-gray-500">{j.applicationCount} applications</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

const MetricTile = ({ label, value }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
    <p className="text-xl font-bold text-white">{value}</p>
  </div>
);

export default AdminApplicationsPage;
