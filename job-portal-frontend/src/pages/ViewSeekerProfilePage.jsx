import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const ViewSeekerProfilePage = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resumePreview, setResumePreview] = useState(undefined); // undefined = loading, null = none/private

  useEffect(() => {
    apiGet(`/profiles/seeker/${userId}`)
      .then(setProfile)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    apiGet(`/resumes/preview/${userId}`).then(setResumePreview).catch(() => setResumePreview(null));
  }, [userId]);

  const isOwnProfile = user?.id === userId;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <p className="text-gray-500">{error || 'Profile not found'}</p>
      <Link to="/jobs" className="text-blue-600 hover:underline text-sm">← Back to Jobs</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-xl font-bold text-blue-600">Job Portal</Link>
          {isOwnProfile && (
            <Link to="/profile/seeker" className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition">
              Edit Profile
            </Link>
          )}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {profile.userId?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                {profile.userId?.name}
                {resumePreview && (
                  <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    📄 Resume uploaded
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500">{profile.userId?.email}</p>
              {profile.location && <p className="text-sm text-gray-500 mt-0.5">{profile.location}</p>}
            </div>
          </div>

          {/* Key info */}
          <div className="grid sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl mb-6">
            {profile.phone && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Phone</p>
                <p className="text-sm font-medium text-gray-800">{profile.phone}</p>
              </div>
            )}
            {profile.experience !== undefined && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Experience</p>
                <p className="text-sm font-medium text-gray-800">
                  {profile.experience === 0 ? 'Fresher / 0 years' : `${profile.experience} years`}
                </p>
              </div>
            )}
            {profile.education && (
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Education</p>
                <p className="text-sm font-medium text-gray-800">{profile.education}</p>
              </div>
            )}
          </div>

          {/* Skills */}
          {profile.skills?.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Skills</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span key={s} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {profile.summary && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">About</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{profile.summary}</p>
            </div>
          )}

          {/* Resume */}
          <div className="flex gap-3 flex-wrap">
            {resumePreview && (
              <Link
                to={`/resume/view/${userId}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                View Resume →
              </Link>
            )}
            {profile.resumeLink && (
              <a
                href={profile.resumeLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition"
              >
                External Resume Link →
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ViewSeekerProfilePage;
