import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPut } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const SeekerProfilePage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    phone: '', location: '', experience: '',
    skills: '', resumeLink: '', summary: '', education: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resume, setResume] = useState(undefined); // undefined = loading, null = none uploaded

  // Load existing profile on mount
  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await apiGet(`/profiles/seeker/${user.id}`);
        setForm({
          phone: data.phone || '',
          location: data.location || '',
          experience: data.experience ?? '',
          skills: Array.isArray(data.skills) ? data.skills.join(', ') : '',
          resumeLink: data.resumeLink || '',
          summary: data.summary || '',
          education: data.education || '',
        });
      } catch {
        // 404 means no profile yet — that's fine, form stays empty
      } finally {
        setLoading(false);
      }
    };
    fetch();

    apiGet('/resumes').then(setResume).catch(() => setResume(null));
  }, [user.id]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      await apiPut('/profiles/seeker', form);
      setSuccess(true);
      toast.success('Profile updated successfully');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-xl font-bold text-blue-600">Job Portal</Link>
          <Link to="/dashboard" className="text-sm text-gray-600 hover:text-blue-600 transition">← Dashboard</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Resume status card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {resume === undefined ? 'Checking resume status…' : resume ? '📄 Resume uploaded' : 'No resume uploaded'}
            </p>
            {resume?.parsedData?.skills?.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {resume.parsedData.skills.length} skill{resume.parsedData.skills.length !== 1 ? 's' : ''} extracted: {resume.parsedData.skills.slice(0, 5).join(', ')}
                {resume.parsedData.skills.length > 5 && ` +${resume.parsedData.skills.length - 5} more`}
              </p>
            )}
            {!resume && resume !== undefined && (
              <p className="text-xs text-gray-500 mt-1">Upload a PDF resume to auto-fill your skills and experience.</p>
            )}
          </div>
          <Link
            to="/resume"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shrink-0"
          >
            {resume ? 'Manage Resume' : 'Upload Resume'}
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}
          {success && (
            <div className="mb-5 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              Profile saved successfully!
            </div>
          )}

          {loading ? (
            <div className="space-y-5 animate-skeleton" aria-label="Loading profile" role="status">
              <div className="grid sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
                    <div className="h-10 bg-gray-100 rounded-lg" />
                  </div>
                ))}
              </div>
              <div className="h-24 bg-gray-100 rounded-lg" />
              <div className="h-12 bg-gray-100 rounded-lg" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" name="location" value={form.location} onChange={handleChange}
                    placeholder="Mumbai, India"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
                  <input type="number" name="experience" value={form.experience} onChange={handleChange}
                    placeholder="0 for fresher" min={0}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
                  <input type="text" name="skills" value={form.skills} onChange={handleChange}
                    placeholder="React, Node.js, MongoDB"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resume Link (URL)</label>
                  <input type="url" name="resumeLink" value={form.resumeLink} onChange={handleChange}
                    placeholder="https://drive.google.com/your-resume"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Education</label>
                  <input type="text" name="education" value={form.education} onChange={handleChange}
                    placeholder="B.E. Computer Science, XYZ University, 2024"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Professional Summary</label>
                  <textarea name="summary" value={form.summary} onChange={handleChange}
                    rows={4} placeholder="A brief summary about yourself, your goals, and what you bring to the table…"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2">
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default SeekerProfilePage;
