import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiDelete } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

const formatSalary = (min, max) => {
  if (!min && !max) return null;
  const fmt = (v) => `₹${(v / 100000).toFixed(1)}L`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max)}`;
};

const SORT_OPTIONS = [
  { value: 'savedAt', label: 'Recently Saved' },
  { value: 'title', label: 'Job Title (A–Z)' },
  { value: 'salary', label: 'Salary (High–Low)' },
];

const SavedJobsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('savedAt');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [removingId, setRemovingId] = useState(null);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet(`/saved-jobs?page=${page}&sortBy=${sort}`);
      setSavedJobs(data.savedJobs || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load saved jobs');
    } finally {
      setLoading(false);
    }
  }, [page, sort]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  const handleSortChange = (newSort) => {
    setSort(newSort);
    setPage(1);
  };

  const handleUnsave = async (e, jobId) => {
    e.stopPropagation();
    setRemovingId(jobId);
    try {
      await apiDelete(`/saved-jobs/${jobId}`);
      setSavedJobs((prev) => prev.filter((s) => s.jobId._id !== jobId));
      toast.info('Job removed from saved list');
    } catch {
      // If it fails, just refetch
      toast.error('Could not remove this job. Please try again.');
      await fetchSaved();
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Saved Jobs</h1>
            <p className="text-sm text-gray-500 mt-1">Jobs you've bookmarked for later</p>
          </div>
          {!loading && savedJobs.length > 0 && (
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3 animate-skeleton" aria-label="Loading saved jobs" role="status">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 bg-white border border-gray-200 rounded-xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
            {error}
            <button onClick={fetchSaved} className="block mx-auto mt-3 text-sm text-red-600 underline">
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && savedJobs.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No saved jobs yet</h3>
            <p className="text-gray-500 mb-6 text-sm">Click the heart icon on any job to save it here.</p>
            <button onClick={() => navigate('/jobs')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
              Browse Jobs
            </button>
          </div>
        )}

        {/* Job list */}
        {!loading && !error && savedJobs.length > 0 && (
          <>
            <div className="space-y-3">
              {savedJobs.map(({ jobId: job, createdAt }) => {
                if (!job) return null;
                const salary = formatSalary(job.salaryMin, job.salaryMax);
                return (
                  <div
                    key={job._id}
                    onClick={() => navigate(`/jobs/${job._id}`)}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-200 transition cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition truncate">
                          {job.title}
                        </h2>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {job.recruiterId?.name || 'Company'}
                          {job.location && <span> · {job.location}</span>}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {job.jobType && (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                              {job.jobType}
                            </span>
                          )}
                          {salary && (
                            <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium">
                              {salary}
                            </span>
                          )}
                          {!job.isActive && (
                            <span className="px-2.5 py-1 bg-red-50 text-red-600 text-xs rounded-full font-medium">
                              Closed
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3 shrink-0">
                        <button
                          onClick={(e) => handleUnsave(e, job._id)}
                          disabled={removingId === job._id}
                          title="Remove from saved"
                          className="p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                        >
                          {removingId === job._id ? (
                            <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          )}
                        </button>
                        <span className="text-xs text-gray-400">
                          {new Date(createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SavedJobsPage;
