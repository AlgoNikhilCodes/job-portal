import { useState, useEffect, useCallback } from 'react';
import { apiGet } from '../services/api.js';
import JobCard from '../components/JobCard.jsx';
import JobFilter from '../components/JobFilter.jsx';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const JobListingPage = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({});

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, ...filters }).toString();
      const data = await apiGet(`/jobs?${params}`);
      setJobs(data.jobs);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleFilterApply = (newFilters) => {
    setFilters(newFilters);
    setPage(1); // reset to first page on filter change
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="text-xl font-bold text-blue-600 shrink-0">Job Portal</Link>
          <div className="flex items-center gap-3">
            {user?.userType === 'recruiter' && (
              <Link
                to="/post-job"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                + Post Job
              </Link>
            )}
            <Link to="/dashboard" className="text-sm text-gray-600 hover:text-blue-600 transition">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Browse Jobs</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-1">{totalCount} job{totalCount !== 1 ? 's' : ''} found</p>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar filters */}
          <aside className="lg:w-64 shrink-0">
            <JobFilter onApply={handleFilterApply} />
          </aside>

          {/* Job list */}
          <div className="flex-1 min-w-0">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            {loading ? (
              <div className="flex justify-center py-24">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
                <p className="text-gray-400 text-lg mb-1">No jobs found</p>
                <p className="text-gray-400 text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <JobCard key={job._id} job={job} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  ← Prev
                </button>
                <span className="flex items-center text-sm text-gray-600 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default JobListingPage;
