import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout.jsx';
import { getAllJobs } from '../services/api.js';

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const AdminJobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllJobs(page, { status, search: search.trim() || undefined });
      setJobs(data.jobs);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Job Management</h1>
        <p className="text-sm text-gray-500 mt-1">{totalCount} total jobs</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by job title…"
          className="flex-1 min-w-[200px] px-4 py-2 text-sm bg-gray-900 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-gray-900 border border-gray-700 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Closed</option>
        </select>
      </div>

      {error && <div className="mb-4 p-3 bg-red-950 border border-red-800 text-red-300 rounded-lg text-sm">{error}</div>}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Recruiter</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Applications</th>
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
            ) : jobs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">No jobs match these filters.</td></tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="border-b border-gray-800 hover:bg-gray-850">
                  <td className="px-4 py-3 text-gray-200 font-medium">{job.title}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {job.recruiter ? (
                      <>
                        <p>{job.recruiter.name}</p>
                        <p className="text-xs text-gray-600">{job.recruiter.email}</p>
                      </>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(job.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                      job.isActive ? 'bg-green-950 text-green-400 border-green-800' : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{job.applicationsCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/jobs/${job.id}`} target="_blank" rel="noreferrer"
                      className="px-2.5 py-1 text-xs font-medium text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 transition">
                      View
                    </Link>
                  </td>
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
    </AdminLayout>
  );
};

export default AdminJobsPage;
