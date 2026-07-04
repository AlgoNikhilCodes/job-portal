import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { apiGet } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import ChartCard from '../components/ChartCard.jsx';
import RecentApplicationsList from '../components/RecentApplicationsList.jsx';
import NavigationBar from '../components/NavigationBar.jsx';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-gray-200 rounded-xl" />
      <div className="flex-1">
        <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
        <div className="h-6 bg-gray-200 rounded w-12" />
      </div>
    </div>
  </div>
);

const RecruiterDashboardPage = () => {
  const { user, socket } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [justUpdated, setJustUpdated] = useState(false);

  const fetchDashboard = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    return apiGet('/dashboard/recruiter')
      .then((result) => {
        setData(result);
        if (silent) setError(''); // a background refresh that succeeds should clear any stale error
      })
      .catch((err) => {
        // A silent (socket-triggered) refresh failing shouldn't interrupt
        // what the user is looking at with a scary error banner — this can
        // legitimately happen for reasons that have nothing to do with the
        // dashboard itself (e.g. a momentarily stale auth token), and the
        // visible data on screen is still valid. Only surface errors from
        // the real, user-visible initial page load.
        if (!silent) setError(err.message || 'Failed to load dashboard');
        else console.error('Background dashboard refresh failed:', err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Real-time: a new application (or a status change on one) changes these
  // numbers, so instead of hand-merging partial socket payloads into local
  // state (risking a shape mismatch with what the REST endpoint returns),
  // we just silently re-fetch the same dashboard summary the page already
  // loads with — the UI updates in place with no full-page reload.
  useEffect(() => {
    if (!socket) return;

    const refresh = () => {
      fetchDashboard(true);
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 2000);
    };

    socket.on('application:submitted', refresh);
    socket.on('dashboard:application_count_changed', refresh);

    return () => {
      socket.off('application:submitted', refresh);
      socket.off('dashboard:application_count_changed', refresh);
    };
  }, [socket, fetchDashboard]);

  const statuses = data?.applicationsByStatus || {};
  const total = data?.totalApplicationsReceived || 0;

  const chartData = {
    labels: ['Applied', 'Shortlisted', 'Accepted', 'Rejected'],
    datasets: [
      {
        label: 'Applications',
        data: [
          statuses.Applied || 0,
          statuses.Shortlisted || 0,
          statuses.Accepted || 0,
          statuses.Rejected || 0,
        ],
        backgroundColor: ['#93c5fd', '#fde68a', '#86efac', '#fca5a5'],
        borderColor: ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444'],
        borderWidth: 1.5,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const pct = total ? Math.round((ctx.raw / total) * 100) : 0;
            return ` ${ctx.raw} (${pct}%)`;
          },
        },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f3f4f6' } },
      x: { grid: { display: false } },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Welcome back, {user?.name?.split(' ')[0]}!
              {justUpdated && (
                <span className="text-xs font-medium text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full animate-[toast-in_0.2s_ease-out]">
                  Updated live
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Here's your recruitment overview</p>
          </div>
          <Link to="/post-job"
            className="hidden sm:inline-flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
            + Post New Job
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            [0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard label="Jobs Posted" value={data?.totalJobsPosted ?? 0} icon="📋" color="blue" />
              <StatCard label="Total Applications" value={data?.totalApplicationsReceived ?? 0} icon="👥" color="purple" />
              <StatCard label="Shortlisted" value={statuses.Shortlisted ?? 0} icon="⭐" color="yellow" />
              <StatCard label="Accepted" value={statuses.Accepted ?? 0} icon="✅" color="green" />
            </>
          )}
        </div>

        {/* Chart + Top Jobs */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Bar chart */}
          <ChartCard
            title="Applications by Status"
            description={`${total} total applications received`}
            loading={loading}
          >
            {!loading && total === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No applications received yet.</p>
            ) : (
              <div className="h-52">
                <Bar data={chartData} options={chartOptions} />
              </div>
            )}
          </ChartCard>

          {/* Top performing jobs */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Top Performing Jobs</h3>
              <Link to="/my-jobs" className="text-xs text-blue-600 hover:underline font-medium">
                All Jobs →
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : (data?.topPerformingJobs || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No jobs posted yet.</p>
            ) : (
              <div className="space-y-3">
                {(data.topPerformingJobs || []).map((job, idx) => (
                  <div key={job._id}
                    onClick={() => navigate(`/job/${job._id}/applications`)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm cursor-pointer transition group"
                  >
                    <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate group-hover:text-blue-600 transition">
                        {job.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {job.applicationsCount} applicant{job.applicationsCount !== 1 ? 's' : ''}
                        {!job.isActive && <span className="ml-1 text-red-500">· closed</span>}
                      </p>
                    </div>
                    <span className="text-xs text-blue-500 group-hover:underline font-medium shrink-0">
                      View →
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent applications */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Recent Applications</h3>
            <Link to="/my-jobs" className="text-xs text-blue-600 hover:underline font-medium">
              Manage Jobs →
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : (
            <RecentApplicationsList
              applications={data?.recentApplications || []}
              userType="recruiter"
              maxItems={10}
            />
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link to="/post-job"
            className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition">
            📝 Post New Job
          </Link>
          <Link to="/my-jobs"
            className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 hover:shadow-sm text-gray-700 rounded-xl font-medium text-sm transition">
            📋 My Jobs
          </Link>
          <Link to={`/profile/recruiter/${user?.id}`}
            className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 hover:shadow-sm text-gray-700 rounded-xl font-medium text-sm transition">
            🏢 Company Profile
          </Link>
        </div>
      </main>
    </div>
  );
};

export default RecruiterDashboardPage;
