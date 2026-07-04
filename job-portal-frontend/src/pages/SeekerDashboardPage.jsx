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
import { Doughnut } from 'react-chartjs-2';
import { apiGet } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import ChartCard from '../components/ChartCard.jsx';
import RecentApplicationsList from '../components/RecentApplicationsList.jsx';
import NavigationBar from '../components/NavigationBar.jsx';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const formatSalary = (min, max) => {
  if (!min && !max) return null;
  const f = (v) => `₹${(v / 100000).toFixed(1)}L`;
  if (min && max) return `${f(min)} – ${f(max)}`;
  return min ? `From ${f(min)}` : `Up to ${f(max)}`;
};

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

// Encouraging copy tied to completion thresholds — matches the QA spec's
// requested messaging exactly.
const completionMessage = (percent) => {
  if (percent >= 81) return { text: 'Great! Your profile is complete.', tone: 'text-green-600' };
  if (percent >= 50) return { text: 'Almost there! Upload your resume to complete your profile.', tone: 'text-yellow-600' };
  return { text: 'Complete more profile details to attract recruiters.', tone: 'text-gray-500' };
};

const ProfileCompletionCard = ({ percent }) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const { text, tone } = completionMessage(clamped);
  const barColor = clamped >= 81 ? 'bg-green-500' : clamped >= 50 ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-gray-800">Profile Completion</h3>
          <p className={`text-xs mt-0.5 ${tone}`}>{text}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-gray-900">{clamped}%</span>
          {clamped < 100 && (
            <Link
              to="/profile/seeker"
              className="text-xs text-blue-600 hover:underline font-medium whitespace-nowrap"
            >
              Complete profile →
            </Link>
          )}
        </div>
      </div>
      <div className="bg-gray-100 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

const SeekerDashboardPage = () => {
  const { user, socket } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [justUpdated, setJustUpdated] = useState(false);
  const [jobAlert, setJobAlert] = useState(undefined); // undefined = still loading, null = not set up yet
  const [resume, setResume] = useState(undefined); // undefined = loading, null = none uploaded

  useEffect(() => {
    apiGet('/job-alerts')
      .then(setJobAlert)
      .catch(() => setJobAlert(null));

    apiGet('/resumes')
      .then(setResume)
      .catch(() => setResume(null));
  }, []);

  const fetchDashboard = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    return apiGet('/dashboard/seeker')
      .then((result) => {
        setData(result);
        if (silent) setError('');
      })
      .catch((err) => {
        // Don't let a background (socket-triggered) refresh failure clobber
        // the page with an error banner — see RecruiterDashboardPage for the
        // same reasoning.
        if (!silent) setError(err.message || 'Failed to load dashboard');
        else console.error('Background dashboard refresh failed:', err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Real-time: a recruiter changing this seeker's application status should
  // update the stat cards + status chart instantly, no refresh needed.
  useEffect(() => {
    if (!socket) return;

    const refresh = () => {
      fetchDashboard(true);
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 2000);
    };

    socket.on('application:status_changed', refresh);
    return () => socket.off('application:status_changed', refresh);
  }, [socket, fetchDashboard]);

  const statuses = data?.applicationsByStatus || {};
  const chartData = {
    labels: ['Applied', 'Shortlisted', 'Accepted', 'Rejected'],
    datasets: [
      {
        data: [
          statuses.Applied || 0,
          statuses.Shortlisted || 0,
          statuses.Accepted || 0,
          statuses.Rejected || 0,
        ],
        backgroundColor: ['#6b7280', '#eab308', '#22c55e', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
    },
    cutout: '65%',
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
            <p className="text-sm text-gray-500 mt-1">Here's how your job search is going</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link
              to="/resume"
              className={`inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium transition ${
                resume
                  ? 'text-green-700 bg-green-50 border border-green-200 hover:bg-green-100'
                  : 'text-gray-500 bg-gray-100 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              📄 {resume ? 'Resume uploaded' : 'No resume uploaded'}
            </Link>
            <Link
              to="/job-alerts"
              className={`inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium transition ${
                jobAlert?.isEnabled
                  ? 'text-green-700 bg-green-50 border border-green-200 hover:bg-green-100'
                  : 'text-gray-500 bg-gray-100 border border-gray-200 hover:bg-gray-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${jobAlert?.isEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
              {jobAlert?.isEnabled
                ? `${jobAlert.frequency === 'weekly' ? 'Weekly' : 'Daily'} alerts active`
                : 'Alerts disabled'}
            </Link>
            <Link to="/profile/seeker"
              className="inline-flex items-center gap-2 text-sm text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50 transition font-medium">
              Edit Profile
            </Link>
          </div>
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
              <StatCard label="Applications" value={data?.totalApplications ?? 0} icon="📄" color="blue" />
              <StatCard label="Shortlisted" value={statuses.Shortlisted ?? 0} icon="⭐" color="yellow" />
              <StatCard label="Accepted" value={statuses.Accepted ?? 0} icon="✅" color="green" />
              <StatCard label="Saved Jobs" value={data?.savedJobsCount ?? 0} icon="❤️" color="red" />
            </>
          )}
        </div>

        {/* Profile completion */}
        {!loading && <ProfileCompletionCard percent={data?.profileCompletion ?? 0} />}

        {/* Chart + Recent Applications */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Doughnut chart */}
          <ChartCard
            title="Application Status"
            description="Breakdown of all your applications"
            loading={loading}
          >
            {!loading && data?.totalApplications === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No applications yet.</p>
            ) : (
              <div className="h-52">
                <Doughnut data={chartData} options={chartOptions} />
              </div>
            )}
          </ChartCard>

          {/* Recent applications */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Recent Applications</h3>
              <Link to="/my-applications" className="text-xs text-blue-600 hover:underline font-medium">
                View all →
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <RecentApplicationsList
                applications={data?.recentApplications || []}
                userType="seeker"
                maxItems={5}
              />
            )}
          </div>
        </div>

        {/* Recommended Jobs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800">Recommended for You</h3>
            <Link to="/recommendations" className="text-xs text-blue-600 hover:underline font-medium">
              View all →
            </Link>
          </div>
          {data?.skillsUsedForRecommendation?.length > 0 && (
            <p className="text-xs text-gray-500 mb-4">
              Based on your skills:{' '}
              <span className="font-medium text-gray-700">
                {data.skillsUsedForRecommendation.slice(0, 4).join(', ')}
                {data.skillsUsedForRecommendation.length > 4 && ' & more'}
              </span>
            </p>
          )}

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : data?.recommendedJobs?.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-sm mb-3">
                No recommendations yet.
              </p>
              <Link to="/profile/seeker"
                className="text-sm text-blue-600 hover:underline font-medium">
                Add skills to your profile →
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(data?.recommendedJobs || []).map((job) => {
                const salary = formatSalary(job.salaryMin, job.salaryMax);
                return (
                  <div
                    key={job._id}
                    onClick={() => navigate(`/jobs/${job._id}`)}
                    className="border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-blue-200 cursor-pointer transition group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-gray-900 text-sm group-hover:text-blue-600 transition leading-snug">
                        {job.title}
                      </h4>
                      {job.matchPercent > 0 && (
                        <span className="shrink-0 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                          {job.matchPercent}% match
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{job.recruiterId?.name || 'Company'}</p>
                    {salary && (
                      <p className="text-xs text-green-600 font-medium mt-1">{salary}</p>
                    )}
                    {job.matchedSkills?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {job.matchedSkills.slice(0, 3).map((s) => (
                          <span key={s} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Link to="/jobs"
            className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition">
            🔍 Browse Jobs
          </Link>
          <Link to="/resume"
            className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 hover:shadow-sm text-gray-700 rounded-xl font-medium text-sm transition">
            📄 Resume
          </Link>
          <Link to="/saved-jobs"
            className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 hover:shadow-sm text-gray-700 rounded-xl font-medium text-sm transition">
            ❤️ Saved Jobs
          </Link>
          <Link to="/my-applications"
            className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 hover:shadow-sm text-gray-700 rounded-xl font-medium text-sm transition">
            📄 All Applications
          </Link>
          <Link to="/job-alerts"
            className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 hover:shadow-sm text-gray-700 rounded-xl font-medium text-sm transition">
            🔔 Job Alerts
          </Link>
        </div>
      </main>
    </div>
  );
};

export default SeekerDashboardPage;
