import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiGet, apiPost, apiDelete } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import EditJobModal from '../components/EditJobModal.jsx';
import SaveJobButton from '../components/SaveJobButton.jsx';
import { calculateJobMatch } from '../utils/resumeMatchCalculator.js';

const jobTypeBadge = {
  'Full-time': 'bg-blue-100 text-blue-800',
  'Part-time': 'bg-yellow-100 text-yellow-800',
  'Contract':  'bg-orange-100 text-orange-800',
  'Remote':    'bg-green-100 text-green-800',
};

const formatSalary = (min, max) => {
  if (!min && !max) return 'Salary not disclosed';
  if (min && max) return `₹${(min / 100000).toFixed(1)}L – ₹${(max / 100000).toFixed(1)}L`;
  if (min) return `From ₹${(min / 100000).toFixed(1)}L`;
  return `Up to ₹${(max / 100000).toFixed(1)}L`;
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

const JobDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Save state
  const [isSaved, setIsSaved] = useState(false);

  // Application state
  const [hasApplied, setHasApplied] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [resume, setResume] = useState(undefined); // undefined = loading, null = none uploaded

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const data = await apiGet(`/jobs/${id}`);
        setJob(data);

        // Check if current seeker has already applied / saved
        if (user?.userType === 'seeker') {
          try {
            const [myApps, savedCheck] = await Promise.all([
              apiGet('/applications/my-applications'),
              apiGet(`/saved-jobs/check/${data._id}`).catch(() => ({ isSaved: false })),
            ]);
            const already = myApps.applications.some((a) => a.jobId?._id === id || a.jobId?._id?.toString() === id);
            setHasApplied(already);
            setIsSaved(savedCheck.isSaved || false);
          } catch {
            // Not logged in or error — ignore
          }

          apiGet('/resumes').then(setResume).catch(() => setResume(null));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id, user]);

  const isOwner = user && job && user.id === job.recruiterId?._id;

  const handleApply = async () => {
    setApplyError('');
    setApplyLoading(true);
    try {
      await apiPost('/applications', { jobId: id });
      setHasApplied(true);
      setApplySuccess(true);
      toast.success('Application submitted! Check your email for confirmation.');
    } catch (err) {
      setApplyError(err.message);
      toast.error(err.message);
    } finally {
      setApplyLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await apiDelete(`/jobs/${id}`);
      toast.success('Job deleted');
      navigate('/my-jobs');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      setDeleteLoading(false);
    }
  };

  // Close modals on Escape for accessibility
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowDeleteConfirm(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200 h-[65px]" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-4 animate-skeleton" aria-label="Loading job details" role="status">
        <div className="h-16 bg-white rounded-xl border border-gray-100" />
        <div className="bg-white rounded-2xl border border-gray-100 p-8 space-y-4">
          <div className="h-7 w-2/3 bg-gray-200 rounded" />
          <div className="h-4 w-1/3 bg-gray-100 rounded" />
          <div className="h-24 bg-gray-100 rounded-xl" />
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-5/6 bg-gray-100 rounded" />
          <div className="h-10 w-40 bg-gray-200 rounded-lg" />
        </div>
      </main>
    </div>
  );

  if (error || !job) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-gray-500">{error || 'Job not found. Please check the URL and try again.'}</p>
      <Link to="/jobs" className="text-blue-600 hover:underline text-sm font-medium">← Back to Jobs</Link>
    </div>
  );

  const recruiterProfile = job.recruiterProfile;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-xl font-bold text-blue-600">Job Portal</Link>
          <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-blue-600 transition">
            ← Back
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-4">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 flex items-center gap-1.5 flex-wrap">
          <Link to="/jobs" className="hover:text-blue-600 transition">Jobs</Link>
          <span aria-hidden="true">/</span>
          <span className="text-gray-700 font-medium truncate max-w-[240px]">{job.title}</span>
        </nav>

        {/* Company info card */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
          {recruiterProfile?.companyLogo ? (
            <img src={recruiterProfile.companyLogo} alt="Company logo"
              className="w-12 h-12 object-contain rounded-lg border border-gray-100"
              onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xl shrink-0">
              {(recruiterProfile?.companyName || job.recruiterId?.name || '?')[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">
              {recruiterProfile?.companyName || job.recruiterId?.name}
            </p>
            {recruiterProfile?.location && (
              <p className="text-xs text-gray-500">{recruiterProfile.location}</p>
            )}
          </div>
          <Link
            to={`/profile/recruiter/${job.recruiterId?._id}`}
            className="shrink-0 text-xs text-blue-600 hover:underline"
          >
            View Company →
          </Link>
        </div>

        {/* Main job card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
              <p className="text-sm text-gray-500">
                Posted by <span className="font-medium text-gray-700">{job.recruiterId?.name}</span>
                &nbsp;&bull;&nbsp;{formatDate(job.createdAt)}
                {job.applicationCount > 0 && (
                  <span className="ml-2 text-gray-400">· {job.applicationCount} applicant{job.applicationCount !== 1 ? 's' : ''}</span>
                )}
              </p>
            </div>
            <span className={`self-start shrink-0 text-sm font-medium px-3 py-1.5 rounded-full ${jobTypeBadge[job.jobType] || 'bg-gray-100 text-gray-700'}`}>
              {job.jobType}
            </span>
          </div>

          {/* Key details */}
          <div className="grid sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl mb-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Location</p>
              <p className="text-sm font-medium text-gray-800">{job.location}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Salary</p>
              <p className="text-sm font-medium text-gray-800">{formatSalary(job.salaryMin, job.salaryMax)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Experience</p>
              <p className="text-sm font-medium text-gray-800">
                {job.experienceRequired === 0 ? 'Fresher / 0 years' : `${job.experienceRequired}+ years`}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Job Type</p>
              <p className="text-sm font-medium text-gray-800">{job.jobType}</p>
            </div>
          </div>

          {/* Skills */}
          {job.skillsRequired?.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Skills Required</p>
              <div className="flex flex-wrap gap-2">
                {job.skillsRequired.map((skill) => (
                  <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-8">
            <p className="text-sm font-medium text-gray-700 mb-2">Job Description</p>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{job.description}</p>
          </div>

          {/* Resume match — seekers only */}
          {user?.userType === 'seeker' && !isOwner && (
            <div className="mb-8 p-5 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-3">Match Your Resume</p>
              {resume === undefined ? (
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
              ) : resume && job.skillsRequired?.length > 0 ? (
                (() => {
                  const { matchPercentage, matchedSkills, missingSkills } = calculateJobMatch(
                    resume.parsedData?.skills || [],
                    job.skillsRequired
                  );
                  return (
                    <>
                      <p className="text-sm text-gray-800 mb-3">
                        Your resume matches{' '}
                        <span className={`font-semibold ${matchPercentage >= 60 ? 'text-green-600' : matchPercentage >= 30 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {matchPercentage}%
                        </span>{' '}
                        of required skills.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {matchedSkills.map((s) => (
                          <span key={s} className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                            {s} ✓
                          </span>
                        ))}
                        {missingSkills.map((s) => (
                          <span key={s} className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    </>
                  );
                })()
              ) : resume ? (
                <p className="text-sm text-gray-500">This job doesn't list specific required skills to compare against.</p>
              ) : (
                <p className="text-sm text-gray-500">
                  <Link to="/resume" className="text-blue-600 hover:underline font-medium">Upload your resume</Link> to see how well it matches this job.
                </p>
              )}
            </div>
          )}

          {/* Apply success banner */}
          {applySuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              Application submitted! The recruiter will review your profile.
            </div>
          )}
          {applyError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{applyError}</div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
            {isOwner ? (
              <>
                <Link
                  to={`/job/${id}/applications`}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                >
                  View Applications ({job.applicationCount || 0})
                </Link>
                <button onClick={() => setShowEdit(true)}
                  className="px-5 py-2.5 border border-blue-200 text-blue-600 hover:bg-blue-50 text-sm font-medium rounded-lg transition">
                  Edit Job
                </button>
                <button onClick={() => setShowDeleteConfirm(true)}
                  className="px-5 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition">
                  Delete
                </button>
              </>
            ) : user?.userType === 'seeker' ? (
              <>
                <button
                  onClick={handleApply}
                  disabled={hasApplied || applyLoading}
                  className={`px-5 py-2.5 text-sm font-medium rounded-lg transition flex items-center gap-2 ${
                    hasApplied
                      ? 'bg-green-50 text-green-700 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white disabled:bg-blue-400'
                  }`}
                >
                  {applyLoading && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {hasApplied && !applyLoading && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {applyLoading ? 'Submitting…' : hasApplied ? 'Applied!' : 'Apply Now'}
                </button>
                <SaveJobButton
                  jobId={id}
                  isSaved={isSaved}
                  onToggle={setIsSaved}
                  className="border border-gray-300"
                />
              </>
            ) : !user ? (
              <Link to="/login"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
                Login to Apply
              </Link>
            ) : null}
            <Link to="/jobs"
              className="px-5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition">
              ← All Jobs
            </Link>
          </div>
        </div>
      </main>

      {showEdit && (
        <EditJobModal job={job} onClose={() => setShowEdit(false)}
          onUpdated={(updated) => { setJob(updated); setShowEdit(false); }} />
      )}

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !deleteLoading && setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full relative animate-[modal-in_0.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-job-title"
          >
            <button
              onClick={() => setShowDeleteConfirm(false)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 id="delete-job-title" className="text-lg font-semibold text-gray-900 mb-2 pr-6">Delete this job?</h3>
            <p className="text-sm text-gray-500 mb-6">The job will be hidden from seekers. This can't be undone from the UI.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-medium py-2 rounded-lg text-sm transition flex items-center justify-center gap-2">
                {deleteLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {deleteLoading ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleteLoading}
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

export default JobDetailPage;
