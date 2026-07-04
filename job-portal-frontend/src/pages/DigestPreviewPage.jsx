import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { apiGet } from '../services/api.js';
import NavigationBar from '../components/NavigationBar.jsx';
import { formatRelativeTime } from '../utils/formatTime.js';

const formatSalary = (min, max) => {
  if (!min && !max) return 'Salary not disclosed';
  const fmt = (v) => `₹${(v / 100000).toFixed(1)}L`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  return min ? `From ${fmt(min)}` : `Up to ${fmt(max)}`;
};

const DigestPreviewPage = () => {
  const { digestId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [digest, setDigest] = useState(location.state?.digest || null);
  const [loading, setLoading] = useState(!location.state?.digest);
  const [error, setError] = useState('');

  useEffect(() => {
    // Came here directly (URL typed/refreshed) without the digest passed via
    // navigation state — fall back to looking it up from the history list
    // rather than requiring a dedicated "get one digest" endpoint.
    if (digest) return;

    setLoading(true);
    apiGet('/job-alerts/history?page=1')
      .then((data) => {
        const found = (data.digests || []).find((d) => d._id === digestId);
        if (!found) {
          setError('This digest could not be found. It may have been deleted.');
        } else {
          setDigest(found);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [digestId, digest]);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Digest Preview</h1>
          <button onClick={() => navigate('/digest-history')} className="text-sm text-blue-600 hover:underline font-medium">
            ← Back to History
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 animate-skeleton" aria-label="Loading digest" role="status">
            <div className="h-24 bg-white border border-gray-100 rounded-xl" />
            <div className="h-32 bg-white border border-gray-100 rounded-xl" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Simulated email header */}
            <div className="bg-blue-600 px-6 py-5">
              <p className="text-blue-100 text-xs font-medium uppercase tracking-wide">Subject</p>
              <p className="text-white font-semibold mt-0.5">{digest.subject}</p>
            </div>

            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between text-sm text-gray-500 flex-wrap gap-2">
              <span>Sent to <span className="font-medium text-gray-700">{digest.emailAddress}</span></span>
              <span>{formatRelativeTime(digest.sentAt)}</span>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-600 mb-2">
                {digest.jobCount} job{digest.jobCount !== 1 ? 's' : ''} were included in this digest:
              </p>
              {(digest.jobIds || []).length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  The jobs in this digest are no longer available for preview (they may have been removed).
                </p>
              ) : (
                digest.jobIds.map((job) => (
                  <div key={job._id} className="border border-gray-100 rounded-xl p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <button
                        onClick={() => navigate(`/jobs/${job._id}`)}
                        className="font-medium text-blue-600 hover:underline text-sm text-left"
                      >
                        {job.title}
                      </button>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {job.recruiterId?.name || 'Company'} &bull; {job.location} &bull; {job.jobType}
                      </p>
                      <p className="text-xs text-green-600 font-medium mt-1">{formatSalary(job.salaryMin, job.salaryMax)}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/jobs/${job._id}`)}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
                    >
                      View Full Job
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                <Link to="/job-alerts" className="text-blue-500 hover:underline">Manage preferences</Link>
                {' · '}
                <span className="cursor-not-allowed" title="Disabled in preview">Unsubscribe</span>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DigestPreviewPage;
