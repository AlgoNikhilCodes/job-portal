import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout.jsx';
import AdminGrowthChart from '../components/AdminGrowthChart.jsx';
import ApplicationFlowChart from '../components/ApplicationFlowChart.jsx';
import { getDashboardStats, getGrowthTrends } from '../services/api.js';

const healthBadge = {
  healthy: 'bg-green-950 text-green-400 border-green-800',
  slow: 'bg-yellow-950 text-yellow-400 border-yellow-800',
  error: 'bg-red-950 text-red-400 border-red-800',
};

// Dark-card stat tile — deliberately not the light-themed shared StatCard
// component, since the admin console uses a dark theme throughout to make
// it visually unmistakable that you're in an admin context, not the regular
// seeker/recruiter app. Same idea as StatCard (icon + label + big number),
// just re-themed rather than forced into a light card.
const Tile = ({ icon, label, value, color = 'text-white' }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
    <div className="flex items-center gap-3 mb-1">
      <span className="text-xl">{icon}</span>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
    </div>
    <p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p>
  </div>
);

const Card = ({ title, description, children }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
    <h3 className="font-semibold text-gray-200 text-sm mb-0.5">{title}</h3>
    {description && <p className="text-xs text-gray-500 mb-4">{description}</p>}
    {children}
  </div>
);

const AdminDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, trendsData] = await Promise.all([getDashboardStats(), getGrowthTrends(30)]);
      setStats(statsData);
      setTrends(trendsData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const health = stats?.platformHealth;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-200 border border-gray-700 rounded-lg hover:bg-gray-800 transition flex items-center gap-2"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950 border border-red-800 text-red-300 rounded-xl text-sm">{error}</div>
      )}

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading && !stats ? (
          [0, 1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />)
        ) : (
          <>
            <Tile icon="👥" label="Total Users" value={stats?.totalUsers} />
            <Tile icon="💼" label="Total Jobs" value={stats?.totalJobs} />
            <Tile icon="📄" label="Total Applications" value={stats?.totalApplications} />
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xl">🩺</span>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Platform Health</p>
              </div>
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${healthBadge[health?.databaseStatus] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                {health?.databaseStatus || '—'}
              </span>
              <p className="text-xs text-gray-500 mt-1.5">{health?.apiUptime ?? '—'}% uptime</p>
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card title="Growth Trends" description="New users, jobs, and applications — last 30 days">
          <AdminGrowthChart trends={trends} />
        </Card>
        <Card title="Application Flow" description="Current status distribution across all applications">
          <ApplicationFlowChart statusCounts={stats?.applicationsByStatus} />
        </Card>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile icon="✅" label="Active Jobs" value={stats?.activeJobs} color="text-green-400" />
        <Tile icon="⏳" label="Pending Applications" value={stats?.pendingApplications} color="text-gray-300" />
        <Tile icon="⭐" label="Shortlisted" value={stats?.shortlistedApplications} color="text-yellow-400" />
        <Tile icon="🎉" label="Accepted" value={stats?.acceptedApplications} color="text-green-400" />
      </div>

      {/* Footer: system health detail */}
      {health && (
        <p className="text-xs text-gray-600 mt-6">
          System health last checked {new Date(health.lastCheck).toLocaleTimeString()} · Error rate {health.errorRate}%
        </p>
      )}
    </AdminLayout>
  );
};

export default AdminDashboardPage;
