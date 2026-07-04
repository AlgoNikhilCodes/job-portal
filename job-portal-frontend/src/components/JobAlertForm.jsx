import { useState } from 'react';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote'];
const FREQUENCIES = [
  { value: 'daily', label: 'Daily', help: 'Get a fresh digest every morning' },
  { value: 'weekly', label: 'Weekly', help: 'One digest every Monday' },
  { value: 'never', label: 'Never', help: 'Pause alerts without losing your preferences' },
];

// Small reusable "chip" input — type a value, press Enter (or click Add) to
// turn it into a removable tag. Used for both skills and locations so we
// don't duplicate this logic twice.
const TagInput = ({ label, placeholder, values, onChange, error }) => {
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const value = draft.trim();
    if (!value) return;
    if (!values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      onChange([...values, value]);
    }
    setDraft('');
  };

  const removeTag = (index) => onChange(values.filter((_, i) => i !== index));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className={`flex flex-wrap gap-2 p-2 border rounded-lg ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
        {values.map((v, i) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-sm font-medium px-2.5 py-1 rounded-full"
          >
            {v}
            <button
              type="button"
              onClick={() => removeTag(i)}
              aria-label={`Remove ${v}`}
              className="text-blue-400 hover:text-blue-700 leading-none"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={placeholder}
          className="flex-1 min-w-[120px] text-sm outline-none py-1"
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

const JobAlertForm = ({ initialValues, onSubmit, saving }) => {
  const [form, setForm] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handlePreferenceChange = (field, value) => {
    setForm((prev) => ({ ...prev, preferences: { ...prev.preferences, [field]: value } }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleJobType = (type) => {
    const current = form.preferences.jobTypes || [];
    handlePreferenceChange(
      'jobTypes',
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    );
  };

  const validate = () => {
    const errs = {};
    if (!form.preferences.skills || form.preferences.skills.length === 0) {
      errs.skills = 'Add at least one skill so we know what jobs to match';
    }
    if (!form.emailAddress || !/^\S+@\S+\.\S+$/.test(form.emailAddress)) {
      errs.emailAddress = 'Please enter a valid email address';
    }
    if (
      form.preferences.minSalary &&
      form.preferences.maxSalary &&
      Number(form.preferences.minSalary) > Number(form.preferences.maxSalary)
    ) {
      errs.maxSalary = 'Max salary must be greater than min salary';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    onSubmit(form, setFieldErrors);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <TagInput
        label="Skills *"
        placeholder="e.g. React, press Enter to add"
        values={form.preferences.skills || []}
        onChange={(v) => handlePreferenceChange('skills', v)}
        error={fieldErrors.skills}
      />
      <p className="text-xs text-gray-400 -mt-4">We'll match jobs requiring any of these skills.</p>

      <TagInput
        label="Preferred Locations"
        placeholder="e.g. Bangalore, press Enter to add"
        values={form.preferences.locations || []}
        onChange={(v) => handlePreferenceChange('locations', v)}
      />
      <p className="text-xs text-gray-400 -mt-4">Leave empty to match jobs in any location.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary (₹)</label>
          <input
            type="number"
            min={0}
            value={form.preferences.minSalary || ''}
            onChange={(e) => handlePreferenceChange('minSalary', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="e.g. 600000"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Salary (₹)</label>
          <input
            type="number"
            min={0}
            value={form.preferences.maxSalary || ''}
            onChange={(e) => handlePreferenceChange('maxSalary', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="e.g. 1500000"
            className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
              fieldErrors.maxSalary ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {fieldErrors.maxSalary && <p className="mt-1 text-xs text-red-600">{fieldErrors.maxSalary}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Job Types</label>
        <div className="flex flex-wrap gap-3">
          {JOB_TYPES.map((type) => (
            <label
              key={type}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition text-sm ${
                (form.preferences.jobTypes || []).includes(type)
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={(form.preferences.jobTypes || []).includes(type)}
                onChange={() => toggleJobType(type)}
                className="sr-only"
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level (years)</label>
        <input
          type="number"
          min={0}
          value={form.preferences.experienceLevel ?? ''}
          onChange={(e) => handlePreferenceChange('experienceLevel', e.target.value ? Number(e.target.value) : undefined)}
          placeholder="Only match jobs requiring up to this many years"
          className="w-full sm:w-1/2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
        <div className="grid sm:grid-cols-3 gap-3">
          {FREQUENCIES.map(({ value, label, help }) => (
            <label
              key={value}
              className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                form.frequency === value
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="frequency"
                value={value}
                checked={form.frequency === value}
                onChange={(e) => handleChange('frequency', e.target.value)}
                className="sr-only"
              />
              <span className="block font-medium text-sm text-gray-800">{label}</span>
              <span className="block text-xs text-gray-500 mt-0.5">{help}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
        <input
          type="email"
          value={form.emailAddress || ''}
          onChange={(e) => handleChange('emailAddress', e.target.value)}
          placeholder="you@example.com"
          className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
            fieldErrors.emailAddress ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-blue-500'
          }`}
        />
        {fieldErrors.emailAddress ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.emailAddress}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">Where digest emails will be sent</p>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
      >
        {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {saving ? 'Saving…' : 'Save Preferences'}
      </button>
    </form>
  );
};

export default JobAlertForm;
