import { send, wrapHtml } from './emailService.js';
import DigestSent from '../models/DigestSent.js';
import JobAlert from '../models/JobAlert.js';

const formatSalary = (min, max) => {
  if (!min && !max) return 'Salary not disclosed';
  const fmt = (v) => `₹${(v / 100000).toFixed(1)}L`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  return min ? `From ${fmt(min)}` : `Up to ${fmt(max)}`;
};

/**
 * Builds the HTML digest email for a batch of matching jobs.
 * Returns { subject, html } — kept separate from sendDigestEmail so the
 * "preview" endpoints/pages can render exactly what would be sent without
 * actually sending anything.
 */
export const buildDigestEmail = (seeker, jobAlert, jobs) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  // Unsubscribe is a plain server-rendered route (not part of the SPA) so it
  // works even from an email client with JS/SPA routing unavailable.
  const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
  const count = jobs.length;

  // Lead with whichever skill is most represented in the results, since
  // that's usually the most meaningful thing to put in a subject line.
  const topSkill = jobAlert.preferences?.skills?.[0];
  const subject = topSkill
    ? `${count} new ${topSkill} job${count !== 1 ? 's' : ''} matching your profile - Job Portal`
    : `${count} new job${count !== 1 ? 's' : ''} matching your profile - Job Portal`;

  const jobRows = jobs
    .map((job) => {
      const companyName = job.recruiterId?.name || 'A company';
      const salary = formatSalary(job.salaryMin, job.salaryMax);
      const matchPercent = job.matchPercent ?? job.matchScore ?? 0;
      return `
        <div style="border:1px solid #e5e7eb; border-radius:10px; padding:16px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:start;">
            <a href="${clientUrl}/jobs/${job._id}" style="color:#2563eb; font-weight:600; font-size:15px; text-decoration:none;">
              ${job.title}
            </a>
            ${matchPercent > 0 ? `<span style="background:#eff6ff; color:#2563eb; font-size:11px; font-weight:600; padding:2px 8px; border-radius:99px; white-space:nowrap; margin-left:8px;">${matchPercent}% match</span>` : ''}
          </div>
          <p style="margin:4px 0 0; font-size:13px; color:#6b7280;">${companyName} &bull; ${job.location} &bull; ${job.jobType}</p>
          <p style="margin:4px 0 10px; font-size:13px; color:#059669; font-weight:600;">${salary}</p>
          <a href="${clientUrl}/jobs/${job._id}" class="btn" style="padding:8px 16px; font-size:13px;">View Job</a>
        </div>`;
    })
    .join('');

  const html = wrapHtml(
    subject,
    `<h2>Hi ${seeker.name}, here ${count === 1 ? 'is' : 'are'} ${count} new job${count !== 1 ? 's' : ''} matching your skills</h2>
     <p>Based on your job alert preferences, we found these opportunities for you:</p>
     ${jobRows}
     <hr class="divider" />
     <p style="font-size:13px; color:#6b7280;">
       <a href="${clientUrl}/job-alerts" style="color:#2563eb;">Manage preferences</a>
       &nbsp;·&nbsp;
       <a href="${serverUrl}/api/job-alerts/unsubscribe/${jobAlert.unsubscribeToken}" style="color:#9ca3af;">Unsubscribe from these alerts</a>
     </p>`
  );

  return { subject, html };
};

/**
 * Sends the digest, records it in DigestSent for history, and updates
 * JobAlert.lastDigestSent/lastDigestJobsCount. Designed to never throw —
 * both the scheduler and the manual "test email" endpoint call this and
 * neither should crash if delivery fails; the failure is recorded instead.
 */
export const sendDigestEmail = async (seeker, jobAlert, jobs) => {
  const { subject, html } = buildDigestEmail(seeker, jobAlert, jobs);
  const result = await send(jobAlert.emailAddress, subject, html);

  try {
    await DigestSent.create({
      seekerId: seeker._id,
      jobAlertId: jobAlert._id,
      jobIds: jobs.map((j) => j._id),
      jobCount: jobs.length,
      emailAddress: jobAlert.emailAddress,
      subject,
      status: result.success ? 'sent' : 'failed',
      errorMessage: result.success ? null : result.error,
    });

    jobAlert.lastDigestSent = new Date();
    jobAlert.lastDigestJobsCount = jobs.length;
    await jobAlert.save();
  } catch (persistError) {
    // Persisting the history record failing shouldn't undo the fact that
    // the email itself may have gone out — just log it.
    console.error(`[${new Date().toISOString()}] Failed to record digest history:`, persistError.message);
  }

  return { success: result.success, messageId: result.messageId };
};

export default { buildDigestEmail, sendDigestEmail };
