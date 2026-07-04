import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api.js';
import ApplicationStatusBadge from '../components/ApplicationStatusBadge.jsx';

const formatSalary = (min, max) => {
  if (!min && !max) return 'Salary not disclosed';
  if (min && max) return `₹${(min / 100000).toFixed(1)}L – ₹${(max / 100000).toFixed(1)}L`;
  if (min) return `From ₹${(min / 100000).toFixed(1)}L`;
  return `Up to ₹${(max / 100000).toFixed(1)}L`;
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_FILTERS = ['All', 'Applied', 'Shortlisted', 'Accepted', 'Rejected'];

const MyApplicationsPage = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/applications/my-applications');
      setApplications(data.applications);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const filtered = statusFilter === 'All'
    ? applications
    : applications.filter((a) => a.status === statusFilter);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-xl font-bold text-blue-600">Job Portal</Link>
          <Link to="/jobs" className="text-sm text-gray-600 hover:text-blue-600 transition">Browse Jobs</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
          <span className="text-sm text-gray-500">{filtered.length} application{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
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
              {s}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {loading ? (
          <div className="space-y-4 animate-skeleton" aria-label="Loading applications" role="status">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-white border border-gray-200 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-400 text-lg mb-1">
              {statusFilter === 'All' ? "You haven't applied to any jobs yet" : `No ${statusFilter} applications`}
            </p>
            {statusFilter === 'All' && (
              <p className="text-sm text-gray-400 mb-4">Apply to jobs to see them here.</p>
            )}
            {statusFilter === 'All' && (
              <Link to="/jobs" className="inline-block mt-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-lg transition">
                Browse Jobs
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((app) => {
              const job = app.jobId;
              return (
                <div key={app._id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h2
                      onClick={() => job?._id && navigate(`/jobs/${job._id}`)}
                      className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer transition truncate mb-0.5"
                    >
                      {job?.title || 'Job no longer available'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {job?.recruiterId?.name && <span>{job.recruiterId.name} &bull; </span>}
                      {job?.location} &bull; {job?.jobType}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatSalary(job?.salaryMin, job?.salaryMax)} &bull; Applied {formatDate(app.createdAt)}
                    </p>
                    {app.recruiterNotes && (
                      <p className="text-xs text-gray-500 italic mt-1 border-l-2 border-gray-200 pl-2">
                        {app.recruiterNotes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                    <ApplicationStatusBadge status={app.status} />
                    {job?._id && (
                      <button
                        onClick={() => navigate(`/jobs/${job._id}`)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View Job →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyApplicationsPage;
