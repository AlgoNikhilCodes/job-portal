import { useNavigate } from 'react-router-dom';
import ApplicationStatusBadge from './ApplicationStatusBadge.jsx';

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const RecentApplicationsList = ({ applications = [], userType = 'seeker', maxItems = 5 }) => {
  const navigate = useNavigate();
  const items = applications.slice(0, maxItems);

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">No applications yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {userType === 'recruiter' && (
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide pb-3 pr-4">
                Applicant
              </th>
            )}
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide pb-3 pr-4">
              {userType === 'seeker' ? 'Job Title' : 'Applied For'}
            </th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide pb-3 pr-4">
              Status
            </th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide pb-3 pr-4">
              Date
            </th>
            <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide pb-3">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((app) => {
            const jobId = app.jobId?._id || app.jobId;
            const jobTitle = app.jobId?.title || '—';
            const company = app.jobId?.recruiterId?.name || '—';
            const applicantName = app.seekerId?.name || '—';

            return (
              <tr key={app._id} className="hover:bg-gray-50 transition">
                {userType === 'recruiter' && (
                  <td className="py-3 pr-4">
                    <p className="font-medium text-gray-800">{applicantName}</p>
                    <p className="text-xs text-gray-400">{app.seekerId?.email}</p>
                  </td>
                )}
                <td className="py-3 pr-4">
                  <p className="font-medium text-gray-800 truncate max-w-[180px]">{jobTitle}</p>
                  {userType === 'seeker' && (
                    <p className="text-xs text-gray-400">{company}</p>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <ApplicationStatusBadge status={app.status} />
                </td>
                <td className="py-3 pr-4 text-gray-500 text-xs whitespace-nowrap">
                  {formatDate(app.createdAt)}
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => navigate(`/jobs/${jobId}`)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                  >
                    {userType === 'recruiter' ? 'Review →' : 'View →'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RecentApplicationsList;
