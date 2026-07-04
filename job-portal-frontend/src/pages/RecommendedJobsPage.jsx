import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiGet } from '../services/api.js';
import SaveJobButton from '../components/SaveJobButton.jsx';
import NavigationBar from '../components/NavigationBar.jsx';

const formatSalary = (min, max) => {
  if (!min && !max) return null;
  const f = (v) => `₹${(v / 100000).toFixed(1)}L`;
  if (min && max) return `${f(min)} – ${f(max)}`;
  return min ? `From ${f(min)}` : `Up to ${f(max)}`;
};

const RecommendedJobsPage = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [location, setLocation] = useState('');

  const fetchRecs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet('/recommendations/jobs?limit=20');
      setJobs(data.recommendedJobs || []);
      setReason(data.reason || '');
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      setError(err.message || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecs(); }, [fetchRecs]);

  // Client-side filter
  const filtered = jobs.filter((job) => {
    if (location && !job.location?.toLowerCase().includes(location.toLowerCase())) return false;
    if (salaryMin && (job.salaryMax || 0) < Number(salaryMin) * 100000) return false;
    if (salaryMax && (job.salaryMin || 0) > Number(salaryMax) * 100000) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Recommended Jobs</h1>
          {reason && !loading && (
            <p className="text-sm text-gray-500 mt-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-blue-500">✦</span> {reason}
              </span>
            </p>
          )}
          {!loading && totalCount > 0 && (
            <p className="text-xs text-gray-400 mt-1">{totalCount} job{totalCount !== 1 ? 's' : ''} match your skills</p>
          )}
        </div>

        <div className="flex gap-6">
          {/* Filter sidebar */}
          <aside className="hidden md:block w-52 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-20 space-y-4">
              <h2 className="font-semibold text-gray-800 text-sm">Filter Results</h2>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City or Remote"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Salary (₹ LPA)</label>
                <div className="flex gap-2">
                  <input type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)}
                    placeholder="Min" min="0"
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <input type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)}
                    placeholder="Max" min="0"
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              {(location || salaryMin || salaryMax) && (
                <button onClick={() => { setLocation(''); setSalaryMin(''); setSalaryMax(''); }}
                  className="text-xs text-red-500 hover:underline w-full text-left">
                  Clear filters
                </button>
              )}
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Loading */}
            {loading && (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700 text-sm">{error}</div>
            )}

            {/* Empty — no skills */}
            {!loading && !error && jobs.length === 0 && (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="font-semibold text-gray-700 mb-2">No recommendations yet</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                  Complete your profile and add skills to get personalized job recommendations!
                </p>
                <Link to="/profile/seeker"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                  Complete Your Profile
                </Link>
              </div>
            )}

            {/* Filtered empty */}
            {!loading && !error && jobs.length > 0 && filtered.length === 0 && (
              <p className="text-center text-gray-500 py-16 text-sm">No jobs match your filters. Try relaxing them.</p>
            )}

            {/* Job cards */}
            {!loading && !error && filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map((job) => {
                  const salary = formatSalary(job.salaryMin, job.salaryMax);
                  return (
                    <div
                      key={job._id}
                      onClick={() => navigate(`/jobs/${job._id}`)}
                      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-200 cursor-pointer group transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                              {job.title}
                            </h2>
                            {job.matchPercent > 0 && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                                {job.matchPercent}% match
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
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
                          </div>

                          {/* Matched skills */}
                          {job.matchedSkills?.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-400 mb-1">Matching skills:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {job.matchedSkills.slice(0, 5).map((s) => (
                                  <span key={s}
                                    className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">
                                    ✓ {s}
                                  </span>
                                ))}
                                {job.matchedSkills.length > 5 && (
                                  <span className="text-xs text-gray-400">
                                    +{job.matchedSkills.length - 5} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <SaveJobButton
                          jobId={job._id}
                          isSaved={false}
                          className="shrink-0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendedJobsPage;
