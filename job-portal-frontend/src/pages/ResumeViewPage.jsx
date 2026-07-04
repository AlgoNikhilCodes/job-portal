import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiGet, API_BASE_URL } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import NavigationBar from '../components/NavigationBar.jsx';
import ResumePreview from '../components/ResumePreview.jsx';

// Public-facing resume view — what a recruiter (or anyone with the link)
// sees when checking out a seeker's resume. Deliberately never receives
// email/phone from the API (getResumePreview omits them server-side), so
// there's no contact info to accidentally leak here even by mistake.
const ResumeViewPage = () => {
  const { seekerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiGet(`/resumes/preview/${seekerId}`)
      .then(setResume)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [seekerId]);

  const handleDownload = () => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE_URL}/api/resumes/download/${seekerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Download not available');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${resume?.name || 'resume'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => toast.error(err.message));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline font-medium mb-4 inline-block">
          ← Back
        </button>

        {loading ? (
          <div className="space-y-3 animate-skeleton" aria-label="Loading resume" role="status">
            <div className="h-40 bg-white border border-gray-100 rounded-2xl" />
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500">{error}</p>
            <Link to={`/profile/seeker/${seekerId}`} className="text-sm text-blue-600 hover:underline font-medium mt-3 inline-block">
              View profile instead →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold text-gray-900">Resume</h1>
              {user?.userType === 'recruiter' && (
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                >
                  Download PDF
                </button>
              )}
            </div>
            <ResumePreview parsedData={resume} uploadedAt={resume.uploadedAt} showContactInfo={false} />
          </div>
        )}
      </main>
    </div>
  );
};

export default ResumeViewPage;
