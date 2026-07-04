import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import NavigationBar from '../components/NavigationBar.jsx';
import DragDropZone from '../components/DragDropZone.jsx';
import ResumePreview from '../components/ResumePreview.jsx';

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
};

const ResumeUploadPage = () => {
  const toast = useToast();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  const fetchResume = () => {
    setLoading(true);
    apiGet('/resumes')
      .then(setResume)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchResume(); }, []);

  const handleFileSelected = async (file) => {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      // Override the default JSON content-type so the browser can set the
      // correct `multipart/form-data; boundary=...` header itself — axios
      // won't compute the boundary if we leave a conflicting header in place.
      const result = await apiPost('/resumes/upload', formData, {
        headers: { 'Content-Type': undefined },
      });
      toast.success('Resume uploaded successfully!');
      fetchResume();
      if (result.resume?.parsedData?.skills?.length === 0) {
        toast.info("We couldn't find a clear skills section — you can add skills manually in your profile.");
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleTogglePublic = async () => {
    try {
      const updated = await apiPut('/resumes/public', { isPublic: !resume.isPublic });
      setResume(updated);
      toast.success(updated.isPublic ? 'Resume is now visible to recruiters' : 'Resume is now private');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDownload = () => {
    // Let the browser handle the actual file download via a real navigation
    // (with the auth token attached through a query-free approach isn't
    // possible for a protected route without JS, so we fetch as a blob).
    const token = localStorage.getItem('token');
    fetch('http://localhost:5000/api/resumes/download', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resume.fileName || 'resume.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Could not download your resume. Please try again.'));
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiDelete('/resumes');
      setResume(null);
      setShowDeleteConfirm(false);
      toast.success('Resume deleted');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resume</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload a PDF resume and we'll extract your skills and experience automatically.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {/* Upload zone */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <DragDropZone onFileSelected={handleFileSelected} uploading={uploading} />
          {resume && !uploading && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              Uploading a new file will replace your current resume.
            </p>
          )}
        </div>

        {loading ? (
          <div className="space-y-3 animate-skeleton" aria-label="Loading resume" role="status">
            <div className="h-24 bg-white border border-gray-100 rounded-2xl" />
            <div className="h-40 bg-white border border-gray-100 rounded-2xl" />
          </div>
        ) : resume ? (
          <>
            {/* File info + actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{resume.fileName}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(resume.fileSize)}</p>
                  </div>
                </div>

                <button
                  onClick={handleTogglePublic}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition shrink-0 ${
                    resume.isPublic ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {resume.isPublic ? '● Public — recruiters can view' : '○ Private'}
                </button>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleDownload}
                  className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 rounded-lg text-sm transition"
                >
                  Download
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 font-medium py-2 rounded-lg text-sm transition"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Extracted data */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800">Extracted Data</h2>
                <Link to="/profile/seeker" className="text-xs text-blue-600 hover:underline font-medium">
                  Edit in profile →
                </Link>
              </div>
              <ResumePreview parsedData={resume.parsedData} uploadedAt={resume.uploadedAt} />
              <p className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
                These were auto-extracted from your resume. If anything looks wrong, update your profile manually.
              </p>
            </div>

            {/* How to use */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-900 space-y-1">
              <p>✓ Your resume is now included in all applications you submit.</p>
              <p>✓ Recruiters can view your skills and experience{resume.isPublic ? '' : ' once your resume is public'}.</p>
              <p>✓ Update your profile directly if extracted data is inaccurate.</p>
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-400 text-sm">No resume uploaded yet — drop a PDF above to get started.</p>
          </div>
        )}
      </main>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full animate-[modal-in_0.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete your resume?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This removes the file and extracted data. Skills already added to your profile will stay.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2 rounded-lg text-sm transition flex items-center justify-center gap-2"
              >
                {deleting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 rounded-lg text-sm transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUploadPage;
