import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiDelete } from '../services/api.js';
import EditJobModal from '../components/EditJobModal.jsx';
import { useToast } from '../context/ToastContext.jsx';

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const MyJobsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editJob, setEditJob] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet(`/jobs/recruiter/my-jobs?page=${page}`);
      setJobs(data.jobs);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleDelete = async () => {
    try {
      await apiDelete(`/jobs/${deleteId}`);
      setDeleteId(null);
      toast.success('Job deleted');
      fetchJobs();
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  const handleUpdated = (updatedJob) => {
    setJobs((prev) => prev.map((j) => (j._id === updatedJob._id ? { ...j, ...updatedJob } : j)));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-xl font-bold text-blue-600">Job Portal</Link>
          <Link to="/post-job"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
            + Post New Job
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Job Posts</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {loading ? (
          <div className="space-y-4 animate-skeleton" aria-label="Loading your jobs" role="status">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-white border border-gray-100 rounded-xl" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m-6 0H7a2 2 0 01-2-2V9a2 2 0 012-2h1m8 10h1a2 2 0 002-2V9a2 2 0 00-2-2h-1" />
            </svg>
            <p className="text-gray-500 mb-4">You haven&apos;t posted any jobs yet.</p>
            <Link to="/post-job"
              className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium rounded-lg transition">
              Post Your First Job
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job._id}
                className={`bg-white border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
                  !job.isActive ? 'opacity-50' : 'border-gray-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-semibold text-gray-900 truncate">{job.title}</h2>
                    {!job.isActive && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Deleted</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {job.location} &bull; {job.jobType} &bull; Posted {formatDate(job.createdAt)}
                  </p>
                  {/* Real application count from backend */}
                  <button
                    onClick={() => navigate(`/job/${job._id}/applications`)}
                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                  >
                    {job.applicationCount || 0} application{job.applicationCount !== 1 ? 's' : ''} →
                  </button>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  <button onClick={() => navigate(`/kanban/${job._id}`)}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4m0-18h10a2 2 0 012 2v14a2 2 0 01-2 2H9m0-18v18m4-14h4m-4 4h4m-4 4h4" />
                    </svg>
                    Kanban Board
                    {job.applicationCount > 0 && (
                      <span className="bg-indigo-100 px-1.5 rounded-full">{job.applicationCount}</span>
                    )}
                  </button>
                  <button onClick={() => navigate(`/job/${job._id}/applications`)}
                    className="px-3 py-1.5 text-xs font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition">
                    Applicants
                  </button>
                  <button onClick={() => navigate(`/jobs/${job._id}`)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                    View
                  </button>
                  <button onClick={() => setEditJob(job)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition">
                    Edit
                  </button>
                  <button onClick={() => setDeleteId(job._id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                  p === page ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </main>

      {editJob && (
        <EditJobModal job={editJob} onClose={() => setEditJob(null)} onUpdated={handleUpdated} />
      )}

      {deleteId && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full animate-[modal-in_0.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Job?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will hide the job from all seekers. This action can&apos;t be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium py-2 rounded-lg text-sm transition">
                Yes, Delete
              </button>
              <button onClick={() => setDeleteId(null)}
                className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 font-medium py-2 rounded-lg text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyJobsPage;
