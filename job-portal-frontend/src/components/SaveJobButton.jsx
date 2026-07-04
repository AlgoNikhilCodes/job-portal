import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, apiDelete } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const HeartIcon = ({ filled }) => (
  <svg
    className={`w-5 h-5 transition-colors ${filled ? 'text-red-500' : 'text-gray-400'}`}
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
);

const SaveJobButton = ({ jobId, isSaved: initialSaved, onToggle, className = '' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e) => {
    // Stop click from propagating to parent job card navigation
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      navigate('/login');
      return;
    }
    if (user.userType !== 'seeker') return;

    setLoading(true);
    try {
      if (isSaved) {
        await apiDelete(`/saved-jobs/${jobId}`);
        setIsSaved(false);
        onToggle?.(false);
        toast.info('Job removed from saved list');
      } else {
        await apiPost('/saved-jobs', { jobId });
        setIsSaved(true);
        onToggle?.(true);
        toast.success('Job saved to your wishlist');
      }
    } catch (err) {
      // Already saved / already removed — sync state
      if (err.message?.includes('already saved')) {
        setIsSaved(true);
      } else {
        toast.error(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't render for recruiters
  if (user && user.userType === 'recruiter') return null;

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={isSaved ? 'Remove from saved' : 'Save job'}
      aria-label={isSaved ? 'Remove from saved' : 'Save job'}
      className={`p-2 rounded-lg transition hover:bg-gray-100 disabled:opacity-50 ${className}`}
    >
      <HeartIcon filled={isSaved} />
    </button>
  );
};

export default SaveJobButton;
