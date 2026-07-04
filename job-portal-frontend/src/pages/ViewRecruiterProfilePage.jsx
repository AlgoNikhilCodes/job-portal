import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const ViewRecruiterProfilePage = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet(`/profiles/recruiter/${userId}`)
      .then(setProfile)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const isOwnProfile = user?.id === userId;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <p className="text-gray-500">{error || 'Company profile not found'}</p>
      <Link to="/jobs" className="text-blue-600 hover:underline text-sm">← Back to Jobs</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-xl font-bold text-blue-600">Job Portal</Link>
          {isOwnProfile && (
            <Link to="/profile/recruiter" className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition">
              Edit Profile
            </Link>
          )}
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            {profile.companyLogo ? (
              <img
                src={profile.companyLogo}
                alt={profile.companyName}
                className="w-16 h-16 object-contain rounded-xl border border-gray-100"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-2xl font-bold shrink-0">
                {(profile.companyName || profile.userId?.name || '?')[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.companyName || profile.userId?.name}
              </h1>
              {profile.location && <p className="text-sm text-gray-500 mt-0.5">{profile.location}</p>}
              {profile.companySize && (
                <p className="text-xs text-gray-400 mt-0.5">{profile.companySize} employees</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 p-4 bg-gray-50 rounded-xl mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{profile.jobCount ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Active Jobs</p>
            </div>
            {profile.companySize && (
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{profile.companySize}</p>
                <p className="text-xs text-gray-500 mt-0.5">Employees</p>
              </div>
            )}
          </div>

          {/* Description */}
          {profile.companyDescription && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">About the Company</p>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {profile.companyDescription}
              </p>
            </div>
          )}

          {/* Website */}
          {profile.companyWebsite && (
            <a
              href={profile.companyWebsite}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-blue-200 text-blue-600 hover:bg-blue-50 text-sm font-medium rounded-lg transition"
            >
              Visit Website →
            </a>
          )}
        </div>
      </main>
    </div>
  );
};

export default ViewRecruiterProfilePage;
