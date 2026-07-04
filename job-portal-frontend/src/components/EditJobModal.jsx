import { useState, useEffect } from 'react';
import { apiPut } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

const FIELD_DEFAULTS = {
  title: '',
  description: '',
  salaryMin: '',
  salaryMax: '',
  location: '',
  jobType: 'Full-time',
  experienceRequired: '',
  skillsRequired: '',
};

const EditJobModal = ({ job, onClose, onUpdated }) => {
  const toast = useToast();
  const [form, setForm] = useState(FIELD_DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // Close on Escape key for keyboard accessibility
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Pre-fill form when job prop arrives
  useEffect(() => {
    if (job) {
      setForm({
        title: job.title || '',
        description: job.description || '',
        salaryMin: job.salaryMin ?? '',
        salaryMax: job.salaryMax ?? '',
        location: job.location || '',
        jobType: job.jobType || 'Full-time',
        experienceRequired: job.experienceRequired ?? '',
        skillsRequired: Array.isArray(job.skillsRequired)
          ? job.skillsRequired.join(', ')
          : job.skillsRequired || '',
      });
    }
  }, [job]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const updated = await apiPut(`/jobs/${job._id}`, form);
      setSuccess(true);
      toast.success('Job updated successfully');
      onUpdated(updated);
      setTimeout(onClose, 1000);
    } catch (err) {
      setFieldErrors(err.fieldErrors || {});
      if (!err.fieldErrors) setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Close modal on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-[modal-in_0.15s_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-job-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="edit-job-title" className="text-lg font-semibold text-gray-900">Edit Job</h2>
          <button onClick={onClose} aria-label="Close dialog" className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              Job updated successfully!
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary Min (₹)</label>
              <input
                type="number"
                name="salaryMin"
                value={form.salaryMin}
                onChange={handleChange}
                min={0}
                placeholder="e.g. 600000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                required
                placeholder="e.g. Mumbai, Remote"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
              <select
                name="jobType"
                value={form.jobType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {['Full-time', 'Part-time', 'Contract', 'Remote'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience Required (years)</label>
              <input
                type="number"
                name="experienceRequired"
                value={form.experienceRequired}
                onChange={handleChange}
                min={0}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma-separated)</label>
              <input
                type="text"
                name="skillsRequired"
                value={form.skillsRequired}
                onChange={handleChange}
                placeholder="React, Node.js, MongoDB"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {success ? 'Updated!' : loading ? 'Updating…' : 'Update Job'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg text-sm transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditJobModal;
