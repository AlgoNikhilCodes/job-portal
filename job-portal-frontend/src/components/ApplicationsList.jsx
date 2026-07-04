import { Link } from 'react-router-dom';
import ApplicationStatusBadge from './ApplicationStatusBadge.jsx';

const STATUS_ACTIONS = ['Shortlisted', 'Accepted', 'Rejected'];

const actionStyle = {
  Shortlisted: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50',
  Accepted:    'border-green-300 text-green-700 hover:bg-green-50',
  Rejected:    'border-red-300 text-red-700 hover:bg-red-50',
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const ApplicationsList = ({ applications, userType, onStatusChange }) => {
  if (!applications?.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">No applications found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((app) => {
        const seeker = app.seekerId;
        const profile = app.seekerProfile;
        const job = app.jobId;

        return (
          <div key={app._id} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1 min-w-0">
                {userType === 'recruiter' ? (
                  <>
                    <p className="font-semibold text-gray-900">{seeker?.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{seeker?.email}</p>
                    {profile?.phone && (
                      <p className="text-sm text-gray-500">{profile.phone}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {profile?.skills?.map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                    {profile?.experience !== undefined && (
                      <p className="text-xs text-gray-400 mt-1">
                        {profile.experience === 0 ? 'Fresher' : `${profile.experience} yr exp`}
                      </p>
                    )}
                    {/* Bug #4 fix: this link used to render unconditionally
                        even when the applicant had set their resume to
                        private, sending recruiters to a page the server
                        would then 403 on. Now it only renders as a working
                        link when there's a resume AND it's public; a
                        private resume shows a disabled, explanatory label
                        instead of a dead/erroring link. */}
                    {app.hasResume && app.resumeIsPublic && (
                      <Link
                        to={`/resume/view/${seeker?._id}`}
                        className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
                        title="View parsed resume (skills, experience, education)"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        View Resume →
                      </Link>
                    )}
                    {app.hasResume && !app.resumeIsPublic && (
                      <span
                        className="text-xs text-gray-400 mt-1 inline-flex items-center gap-1 cursor-not-allowed"
                        title="This candidate has kept their resume private"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Resume private
                      </span>
                    )}
                    {profile?.resumeLink && (
                      <a
                        href={profile.resumeLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-gray-400 hover:underline mt-1 inline-block ml-2"
                      >
                        External link →
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-gray-900">{job?.title}</p>
                    <p className="text-sm text-gray-500">{job?.location}</p>
                  </>
                )}
                <p className="text-xs text-gray-400 mt-1">Applied {formatDate(app.createdAt)}</p>
                {app.recruiterNotes && (
                  <p className="text-xs text-gray-500 italic mt-1">Note: {app.recruiterNotes}</p>
                )}
              </div>

              <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                <ApplicationStatusBadge status={app.status} />
                {userType === 'recruiter' && onStatusChange && (
                  <div className="flex gap-1.5 flex-wrap">
                    {STATUS_ACTIONS.filter((s) => s !== app.status).map((action) => (
                      <button
                        key={action}
                        onClick={() => onStatusChange(app._id, action)}
                        className={`px-2.5 py-1 text-xs font-medium border rounded-lg transition ${actionStyle[action]}`}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ApplicationsList;
