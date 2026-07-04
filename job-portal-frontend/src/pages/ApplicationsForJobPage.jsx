import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPut } from '../services/api.js';
import ApplicationsList from '../components/ApplicationsList.jsx';
import { useToast } from '../context/ToastContext.jsx';

const STATUS_FILTERS = ['All', 'Applied', 'Shortlisted', 'Accepted', 'Rejected'];

const ApplicationsForJobPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, Applied: 0, Shortlisted: 0, Accepted: 0, Rejected: 0 });
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [appData, statData] = await Promise.all([
        apiGet(`/applications/job/${jobId}`),
        apiGet(`/applications/stats/job/${jobId}`),
      ]);
      setApplications(appData.applications);
      setStats(statData);
      // Grab job title from first application if present
      if (appData.applications.length > 0) {
        setJobTitle(appData.applications[0].jobId?.title || '');
      } else {
        // Fallback: fetch job title separately
        const jobData = await apiGet(`/jobs/${jobId}`);
        setJobTitle(jobData.title || '');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      const updated = await apiPut(`/applications/${applicationId}`, { status: newStatus });
      setApplications((prev) =>
        prev.map((a) => (a._id === applicationId ? { ...a, status: updated.status } : a))
      );
      // Update stats
      setStats((prev) => {
        const old = applications.find((a) => a._id === applicationId)?.status;
        return {
          ...prev,
          [old]: Math.max(0, (prev[old] || 0) - 1),
          [newStatus]: (prev[newStatus] || 0) + 1,
        };
      });
      toast.success(`Application marked as ${newStatus}. The candidate has been notified by email.`);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const filtered = statusFilter === 'All'
    ? applications
    : applications.filter((a) => a.status === statusFilter);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-xl font-bold text-blue-600">Job Portal</Link>
          <button onClick={() => navigate('/my-jobs')} className="text-sm text-gray-600 hover:text-blue-600 transition">
            ← My Jobs
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
            {jobTitle && <p className="text-gray-500 mt-1 text-sm">For: <span className="font-medium text-gray-700">{jobTitle}</span></p>}
          </div>
          <button
            onClick={() => navigate(`/kanban/${jobId}`)}
            className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4m0-18h10a2 2 0 012 2v14a2 2 0 01-2 2H9m0-18v18m4-14h4m-4 4h4m-4 4h4" />
            </svg>
            Switch to Kanban View
          </button>
        </div>

        {/* Stats row */}
        {!loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'bg-gray-50 border-gray-200 text-gray-700' },
              { label: 'Applied', value: stats.Applied, color: 'bg-gray-50 border-gray-200 text-gray-700' },
              { label: 'Shortlisted', value: stats.Shortlisted, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
              { label: 'Accepted', value: stats.Accepted, color: 'bg-green-50 border-green-200 text-green-700' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`border rounded-xl p-4 text-center ${color}`}>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s} {s !== 'All' && stats[s] > 0 && `(${stats[s]})`}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {loading ? (
          <div className="space-y-3 animate-skeleton" aria-label="Loading applications" role="status">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-white border border-gray-100 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400">
              {stats.total === 0 ? 'No one has applied to this job yet' : `No ${statusFilter} applications`}
            </p>
          </div>
        ) : (
          <ApplicationsList
            applications={filtered}
            userType="recruiter"
            onStatusChange={handleStatusChange}
          />
        )}
      </main>
    </div>
  );
};

export default ApplicationsForJobPage;
