import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPut } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const SIZES = ['', '1-10', '10-50', '50-200', '200-500', '500+'];

const RecruiterProfilePage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    companyName: '', companyLogo: '', companyDescription: '',
    companyWebsite: '', location: '', companySize: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await apiGet(`/profiles/recruiter/${user.id}`);
        setForm({
          companyName: data.companyName || '',
          companyLogo: data.companyLogo || '',
          companyDescription: data.companyDescription || '',
          companyWebsite: data.companyWebsite || '',
          location: data.location || '',
          companySize: data.companySize || '',
        });
      } catch {
        // No profile yet — form stays empty
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user.id]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      await apiPut('/profiles/recruiter', form);
      setSuccess(true);
      toast.success('Company profile saved');
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Company Profile</h1>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}
          {success && (
            <div className="mb-5 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              Company profile saved!
            </div>
          )}

          {loading ? (
            <div className="space-y-5 animate-skeleton" aria-label="Loading company profile" role="status">
              <div className="grid sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input type="text" name="companyName" value={form.companyName} onChange={handleChange}
                    placeholder="Acme Corp"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                  <select name="companySize" value={form.companySize} onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select size</option>
                    {SIZES.filter(Boolean).map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo URL</label>
                  <input type="url" name="companyLogo" value={form.companyLogo} onChange={handleChange}
                    placeholder="https://yourcompany.com/logo.png"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Website</label>
                  <input type="url" name="companyWebsite" value={form.companyWebsite} onChange={handleChange}
                    placeholder="https://yourcompany.com"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" name="location" value={form.location} onChange={handleChange}
                    placeholder="Bangalore, India"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Description</label>
                  <textarea name="companyDescription" value={form.companyDescription} onChange={handleChange}
                    rows={4} placeholder="Tell candidates about your company, culture, and mission…"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>

              {/* Live logo preview */}
              {form.companyLogo && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <img src={form.companyLogo} alt="Logo preview"
                    className="w-12 h-12 object-contain rounded"
                    onError={(e) => { e.target.style.display = 'none'; }} />
                  <span className="text-sm text-gray-500">Logo preview</span>
                </div>
              )}

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

export default RecruiterProfilePage;
