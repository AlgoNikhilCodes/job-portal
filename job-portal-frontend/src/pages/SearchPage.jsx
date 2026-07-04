import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiGet } from '../services/api.js';
import SearchBar from '../components/SearchBar.jsx';
import SaveJobButton from '../components/SaveJobButton.jsx';

const formatSalary = (min, max) => {
  if (!min && !max) return null;
  const fmt = (v) => `₹${(v / 100000).toFixed(1)}L`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max)}`;
};

const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'];
const EXPERIENCE_OPTIONS = [
  { value: '', label: 'Any experience' },
  { value: '0', label: 'Fresher (0 yrs)' },
  { value: '1', label: '1+ year' },
  { value: '2', label: '2+ years' },
  { value: '5', label: '5+ years' },
];

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    location: searchParams.get('location') || '',
    jobType: searchParams.get('jobType') || '',
    salaryMin: searchParams.get('salaryMin') || '',
    salaryMax: searchParams.get('salaryMax') || '',
    experience: searchParams.get('experience') || '',
  });

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [searchTime, setSearchTime] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);

  const runSearch = useCallback(async (f, p = 1) => {
    setLoading(true);
    setError('');
    setHasSearched(true);
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set('page', p);
    try {
      const data = await apiGet(`/search?${params.toString()}`);
      setResults(data.jobs || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
      setSearchTime(data.searchTime ?? null);
    } catch (err) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Run search when q param is set on mount
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) runSearch({ ...filters, q }, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (query) => {
    const updated = { ...filters, q: query };
    setFilters(updated);
    setPage(1);
    const params = {};
    Object.entries(updated).forEach(([k, v]) => { if (v) params[k] = v; });
    setSearchParams(params);
    runSearch(updated, 1);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setPage(1);
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    setSearchParams(params);
    runSearch(filters, 1);
  };

  const handleClearFilters = () => {
    const cleared = { q: filters.q, location: '', jobType: '', salaryMin: '', salaryMax: '', experience: '' };
    setFilters(cleared);
    if (filters.q) runSearch(cleared, 1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    runSearch(filters, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = filters.location || filters.jobType || filters.salaryMin || filters.salaryMax || filters.experience;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero search bar */}
      <div className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Find Your Next Role</h1>
          <p className="text-gray-500 text-sm text-center mb-6">Full-text search across job titles, descriptions, and skills</p>
          <SearchBar
            initialValue={filters.q}
            onSearch={handleSearch}
            placeholder="React developer, data scientist, product manager…"
          />
          {searchTime !== null && hasSearched && !loading && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              {totalCount} result{totalCount !== 1 ? 's' : ''} found in {searchTime}ms
            </p>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filters sidebar */}
          <aside className="w-56 shrink-0 hidden md:block">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-800 text-sm">Filters</h2>
                {hasActiveFilters && (
                  <button onClick={handleClearFilters} className="text-xs text-blue-600 hover:underline">
                    Clear
                  </button>
                )}
              </div>

              {/* Location */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  placeholder="Mumbai, Remote…"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Job type */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Job Type</label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="jobType" value=""
                      checked={!filters.jobType}
                      onChange={() => handleFilterChange('jobType', '')}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700">All</span>
                  </label>
                  {JOB_TYPES.map((t) => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="jobType" value={t}
                        checked={filters.jobType === t}
                        onChange={() => handleFilterChange('jobType', t)}
                        className="text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Salary range */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Salary (₹ LPA)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.salaryMin}
                    onChange={(e) => handleFilterChange('salaryMin', e.target.value)}
                    placeholder="Min"
                    min="0"
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <input
                    type="number"
                    value={filters.salaryMax}
                    onChange={(e) => handleFilterChange('salaryMax', e.target.value)}
                    placeholder="Max"
                    min="0"
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              {/* Experience */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-700 mb-1">Experience</label>
                <select
                  value={filters.experience}
                  onChange={(e) => handleFilterChange('experience', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleApplyFilters}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                Apply Filters
              </button>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Not yet searched */}
            {!hasSearched && !loading && (
              <div className="text-center py-20 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm">Type something above to search jobs</p>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* No results */}
            {!loading && hasSearched && !error && results.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-500 mb-2 font-medium">No jobs found</p>
                <p className="text-sm text-gray-400">Try different keywords or remove some filters.</p>
              </div>
            )}

            {/* Results list */}
            {!loading && results.length > 0 && (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Showing {results.length} of {totalCount} result{totalCount !== 1 ? 's' : ''}
                  {filters.q && <span> for <span className="font-medium text-gray-700">"{filters.q}"</span></span>}
                </p>
                <div className="space-y-3">
                  {results.map((job) => {
                    const salary = formatSalary(job.salaryMin, job.salaryMax);
                    return (
                      <div
                        key={job._id}
                        onClick={() => navigate(`/jobs/${job._id}`)}
                        className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-200 transition cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition truncate">
                              {job.title}
                            </h3>
                            <p className="text-sm text-gray-600 mt-0.5">
                              {job.recruiterProfile?.companyName || job.recruiterId?.name || 'Company'}
                              {job.location && <span> · {job.location}</span>}
                            </p>
                            {job.description && (
                              <p className="text-sm text-gray-500 mt-2 line-clamp-2">{job.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-3">
                              {job.jobType && (
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                                  {job.jobType}
                                </span>
                              )}
                              {salary && (
                                <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full font-medium">
                                  {salary}
                                </span>
                              )}
                              {job.experience != null && (
                                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-full font-medium">
                                  {job.experience}+ yrs
                                </span>
                              )}
                            </div>
                          </div>
                          <SaveJobButton
                            jobId={job._id}
                            isSaved={false}
                            className="shrink-0 mt-0.5"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-3 mt-8">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
