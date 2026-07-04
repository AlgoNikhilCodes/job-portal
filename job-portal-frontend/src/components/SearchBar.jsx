import { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet } from '../services/api.js';

// Simple debounce helper — avoids importing lodash
const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

const SearchBar = ({ initialValue = '', onSearch, placeholder = 'Search jobs, skills…' }) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const debouncedQuery = useDebounce(query, 300);

  // Fetch suggestions whenever debounced query changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const data = await apiGet(`/search/suggestions?q=${encodeURIComponent(debouncedQuery)}`);
        setSuggestions(data.suggestions || []);
        setShowDropdown((data.suggestions || []).length > 0);
      } catch {
        setSuggestions([]);
      }
    };
    fetchSuggestions();
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e?.preventDefault();
      setShowDropdown(false);
      if (query.trim()) onSearch?.(query.trim());
    },
    [query, onSearch]
  );

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setSuggestions([]);
    setShowDropdown(false);
    onSearch?.(suggestion);
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[activeIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIdx(-1);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(-1); }}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {query && (
            <button type="button" onClick={() => { setQuery(''); setSuggestions([]); inputRef.current?.focus(); }}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-lg leading-none">
              ×
            </button>
          )}
        </div>
        <button type="submit"
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition shrink-0">
          Search
        </button>
      </form>

      {/* Suggestions dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <li
              key={s}
              onMouseDown={() => handleSuggestionClick(s)}
              className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer text-sm ${
                i === activeIdx ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchBar;
