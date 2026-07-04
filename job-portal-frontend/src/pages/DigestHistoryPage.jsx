import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api.js';
import NavigationBar from '../components/NavigationBar.jsx';
import { formatRelativeTime } from '../utils/formatTime.js';

const STATUS_BADGE = {
  sent: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  bounced: 'bg-orange-50 text-orange-700',
};

const DigestHistoryPage = () => {
  const navigate = useNavigate();
  const [digests, setDigests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchHistory = useCallback(() => {
    setLoading(true);
    apiGet(`/job-alerts/history?page=${page}`)
      .then((data) => {
        setDigests(data.digests || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Digest History</h1>
          <Link to="/job-alerts" className="text-sm text-blue-600 hover:underline font-medium">← Alert Settings</Link>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {loading ? (
          <div className="space-y-3 animate-skeleton" aria-label="Loading digest history" role="status">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-white border border-gray-100 rounded-xl" />
            ))}
          </div>
        ) : digests.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-400 mb-1">No digests sent yet</p>
            <p className="text-sm text-gray-400 mb-4">Once your job alerts are enabled, sent digests will show up here.</p>
            <Link to="/job-alerts" className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
              Set Up Job Alerts
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {digests.map((d) => (
              <div key={d._id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-gray-900 text-sm">{d.subject || `${d.jobCount} matching jobs`}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[d.status] || 'bg-gray-100 text-gray-600'}`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{d.jobCount} job{d.jobCount !== 1 ? 's' : ''} &bull; sent to {d.emailAddress}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(d.sentAt)}</p>
                </div>
                <button
                  onClick={() => navigate(`/digest-preview/${d._id}`, { state: { digest: d } })}
                  className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition shrink-0"
                >
                  View Email
                </button>
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

export default DigestHistoryPage;
