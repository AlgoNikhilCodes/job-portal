import { useNavigate } from 'react-router-dom';
import SaveJobButton from './SaveJobButton.jsx';

const jobTypeBadge = {
  'Full-time': 'bg-blue-100 text-blue-800',
  'Part-time': 'bg-yellow-100 text-yellow-800',
  'Contract': 'bg-orange-100 text-orange-800',
  'Remote': 'bg-green-100 text-green-800',
};

const formatSalary = (min, max) => {
  if (!min && !max) return 'Salary not disclosed';
  if (min && max) return `₹${(min / 100000).toFixed(1)}L – ₹${(max / 100000).toFixed(1)}L`;
  if (min) return `From ₹${(min / 100000).toFixed(1)}L`;
  return `Up to ₹${(max / 100000).toFixed(1)}L`;
};

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const JobCard = ({ job }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/jobs/${job._id}`)}
      className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
          {job.title}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              jobTypeBadge[job.jobType] || 'bg-gray-100 text-gray-700'
            }`}
          >
            {job.jobType}
          </span>
          <SaveJobButton jobId={job._id} isSaved={false} />
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-1">
        Posted by <span className="font-medium text-gray-700">{job.recruiterId?.name || 'Recruiter'}</span>
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {job.location}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatSalary(job.salaryMin, job.salaryMax)}
        </span>
        <span className="text-gray-400 text-xs ml-auto">{formatDate(job.createdAt)}</span>
      </div>
    </div>
  );
};

export default JobCard;
