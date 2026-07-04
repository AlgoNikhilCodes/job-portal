import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiPost } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

const INITIAL = {
  title: '',
  description: '',
  salaryMin: '',
  salaryMax: '',
  location: '',
  jobType: 'Full-time',
  experienceRequired: '',
  skillsRequired: '',
};

const inputClass = (hasError) =>
  `w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition ${
    hasError
      ? 'border-red-400 focus:ring-red-400 bg-red-50'
      : 'border-gray-300 focus:ring-blue-500'
  }`;

const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {message}
    </p>
  ) : null;

const PostJobPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(INITIAL);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear this field's error as soon as the user starts fixing it
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    const errs = {};
    if (form.title.trim().length < 5) errs.title = 'Job title must be at least 5 characters';
    if (form.title.trim().length > 100) errs.title = 'Job title must be under 100 characters';
    if (form.description.trim().length < 20) errs.description = 'Description must be at least 20 characters';
    if (!form.location.trim()) errs.location = 'Location is required';
    if (form.salaryMin && form.salaryMax && Number(form.salaryMin) > Number(form.salaryMax)) {
      errs.salaryMax = 'Max salary must be greater than min salary';
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setLoading(true);
    try {
      await apiPost('/jobs', form);
      setSuccess(true);
      toast.success('Job posted successfully! Redirecting…');
      setTimeout(() => navigate('/my-jobs'), 1200);
    } catch (err) {
      setError(err.fieldErrors ? '' : err.message);
      setFieldErrors(err.fieldErrors || {});
      if (!err.fieldErrors) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="text-xl font-bold text-blue-600">Job Portal</Link>
          <Link to="/my-jobs" className="text-sm text-gray-600 hover:text-blue-600 transition">← My Jobs</Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Post a New Job</h1>
          <p className="text-sm text-gray-500 mb-6">Fields marked * are required.</p>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-5 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Job posted successfully! Redirecting to My Jobs…
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Senior React Developer"
                aria-invalid={!!fieldErrors.title}
                className={inputClass(fieldErrors.title)}
              />
              <div className="flex justify-between mt-1">
                <FieldError message={fieldErrors.title} />
                <span className="text-xs text-gray-400 shrink-0">{form.title.length}/100</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Description *</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={6}
                placeholder="Describe the role, responsibilities, and requirements…"
                aria-invalid={!!fieldErrors.description}
                className={`${inputClass(fieldErrors.description)} resize-none`}
              />
              <FieldError message={fieldErrors.description} />
              {!fieldErrors.description && <p className="mt-1 text-xs text-gray-400">Minimum 20 characters</p>}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Min (₹)</label>
                <input
                  type="number"
                  name="salaryMin"
                  value={form.salaryMin}
                  onChange={handleChange}
                  min={0}
                  placeholder="e.g. 600000"
                  className={inputClass(fieldErrors.salaryMin)}
                />
                <FieldError message={fieldErrors.salaryMin} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Max (₹)</label>
                <input
                  type="number"
                  name="salaryMax"
                  value={form.salaryMax}
                  onChange={handleChange}
                  min={0}
                  placeholder="e.g. 1000000"
                  className={inputClass(fieldErrors.salaryMax)}
                />
                <FieldError message={fieldErrors.salaryMax} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="e.g. Mumbai, Bangalore, Remote"
                  aria-invalid={!!fieldErrors.location}
                  className={inputClass(fieldErrors.location)}
                />
                <FieldError message={fieldErrors.location} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                <select
                  name="jobType"
                  value={form.jobType}
                  onChange={handleChange}
                  className={inputClass(false)}
                >
                  {['Full-time', 'Part-time', 'Contract', 'Remote'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Experience Required (years)</label>
                <input
                  type="number"
                  name="experienceRequired"
                  value={form.experienceRequired}
                  onChange={handleChange}
                  min={0}
                  placeholder="0 for fresher"
                  className={inputClass(false)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skills Required</label>
                <input
                  type="text"
                  name="skillsRequired"
                  value={form.skillsRequired}
                  onChange={handleChange}
                  placeholder="React, Node.js, MongoDB"
                  className={inputClass(false)}
                />
                <p className="text-xs text-gray-400 mt-1">Separate skills with commas — list each one individually (e.g. avoid "MERN", use "React, Node.js, MongoDB, Express")</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || success}
                className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
              >
                {loading && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {success ? 'Posted!' : loading ? 'Posting…' : 'Post Job'}
              </button>
              <Link
                to="/my-jobs"
                className="flex-1 text-center border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 font-semibold py-3 rounded-lg transition"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default PostJobPage;
