import { useState } from 'react';

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote'];

const JobFilter = ({ onApply }) => {
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    minSalary: '',
    maxSalary: '',
    jobType: '',
  });

  const handleChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleApply = (e) => {
    e.preventDefault();
    // Strip empty values before sending to parent
    const clean = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== '')
    );
    onApply(clean);
  };

  const handleClear = () => {
    setFilters({ search: '', location: '', minSalary: '', maxSalary: '', jobType: '' });
    onApply({});
  };

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <form onSubmit={handleApply} className="bg-white border border-gray-200 rounded-xl p-5 space-y-5 sticky top-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">Filters</h2>
        {activeCount > 0 && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {activeCount} active
          </span>
        )}
      </div>

      {/* Keyword search */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Keyword</label>
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleChange}
          placeholder="e.g. React, Node.js…"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
        <input
          type="text"
          name="location"
          value={filters.location}
          onChange={handleChange}
          placeholder="e.g. Mumbai, Remote…"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Salary range */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Salary Range (₹)</label>
        <div className="flex gap-2">
          <input
            type="number"
            name="minSalary"
            value={filters.minSalary}
            onChange={handleChange}
            placeholder="Min"
            min={0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="number"
            name="maxSalary"
            value={filters.maxSalary}
            onChange={handleChange}
            placeholder="Max"
            min={0}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Job type */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Job Type</label>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="jobType"
              value=""
              checked={filters.jobType === ''}
              onChange={handleChange}
              className="accent-blue-600"
            />
            All Types
          </label>
          {JOB_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                name="jobType"
                value={t}
                checked={filters.jobType === t}
                onChange={handleChange}
                className="accent-blue-600"
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition"
      >
        Apply Filters
      </button>
      {activeCount > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="w-full text-sm text-gray-500 hover:text-red-600 transition"
        >
          Clear all filters
        </button>
      )}
    </form>
  );
};

export default JobFilter;
