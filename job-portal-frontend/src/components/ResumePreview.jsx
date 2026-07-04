import { formatRelativeTime } from '../utils/formatTime.js';

/**
 * Displays extracted resume data. Used both on the seeker's own upload page
 * (full detail incl. contact info) and the recruiter-facing preview (where
 * the parent simply won't pass email/phone at all — see ResumeViewPage).
 */
const ResumePreview = ({ parsedData, uploadedAt, showContactInfo = true }) => {
  if (!parsedData) return null;

  const { name, email, phone, skills = [], experience, education, summary } = parsedData;

  return (
    <div className="space-y-5">
      {(name || (showContactInfo && (email || phone))) && (
        <div>
          {name && <p className="font-semibold text-gray-900">{name}</p>}
          {showContactInfo && (
            <p className="text-sm text-gray-500">
              {[email, phone].filter(Boolean).join(' · ') || 'No contact details extracted'}
            </p>
          )}
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Skills</p>
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span key={skill} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No skills extracted — try updating your profile manually.</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Experience</p>
          <p className="text-sm text-gray-800">
            {experience > 0 ? `${experience} year${experience !== 1 ? 's' : ''}` : 'Not detected'}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Education</p>
          <p className="text-sm text-gray-800 whitespace-pre-line">{education || 'Not detected'}</p>
        </div>
      </div>

      {summary && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Summary</p>
          <p className="text-sm text-gray-600 whitespace-pre-line">{summary}</p>
        </div>
      )}

      {uploadedAt && (
        <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
          Last updated {formatRelativeTime(uploadedAt)}
        </p>
      )}
    </div>
  );
};

export default ResumePreview;
