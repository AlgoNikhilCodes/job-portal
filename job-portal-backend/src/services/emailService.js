import nodemailer from 'nodemailer';

// ─── Transport ────────────────────────────────────────────────────────────────
// In development the transporter logs to console instead of actually sending,
// so you never need a real SMTP credential to test locally.

const createTransport = () => {
  if (process.env.NODE_ENV !== 'production' && !process.env.EMAIL_USER) {
    // Ethereal fake SMTP — prints a preview URL to the terminal
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: 'ethereal_user', pass: 'ethereal_pass' },
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // Gmail App Password (not your account password)
    },
  });
};

const transporter = createTransport();

// ─── Shared HTML wrapper ──────────────────────────────────────────────────────
const wrapHtml = (title, bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .header { background: #2563eb; padding: 28px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; }
    .header p  { color: #bfdbfe; margin: 4px 0 0; font-size: 13px; }
    .body { padding: 28px 32px; color: #374151; line-height: 1.6; }
    .body h2 { font-size: 18px; color: #111827; margin: 0 0 12px; }
    .body p  { margin: 0 0 16px; font-size: 15px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 13px; font-weight: 600; }
    .badge-applied     { background: #f3f4f6; color: #374151; }
    .badge-shortlisted { background: #fef9c3; color: #854d0e; }
    .badge-accepted    { background: #dcfce7; color: #166534; }
    .badge-rejected    { background: #fee2e2; color: #991b1b; }
    .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 8px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 16px 32px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Job Portal</h1>
      <p>Your career journey starts here</p>
    </div>
    <div class="body">${bodyHtml}</div>
    <div class="footer">
      © ${new Date().getFullYear()} Job Portal &nbsp;|&nbsp; You received this because you have an account with us.
    </div>
  </div>
</body>
</html>`;

// ─── Safe send wrapper ─────────────────────────────────────────────────────────
// Emails are fire-and-forget by default (callers don't have to await/check
// the result — matches how sendApplicationConfirmation etc. are used
// elsewhere), but it now RESOLVES to a result object instead of nothing, so
// callers that DO care (digestEmailService, the "send test email" endpoint)
// can know whether it actually went out.
const send = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Job Portal" <${process.env.EMAIL_USER || 'noreply@jobportal.dev'}>`,
      to,
      subject,
      html,
    });
    if (info.messageId) {
      console.log(`[Email] Sent "${subject}" to ${to} — ID: ${info.messageId}`);
    }
    return { success: true, messageId: info.messageId };
  } catch (err) {
    // Log but do not rethrow — caller should never fail because of email
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

// Exported so other email-adjacent services (digestEmailService.js) can
// build on the same transporter/wrapper instead of duplicating them.
export { send, wrapHtml };

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * Sent to every new user right after they register.
 */
export const sendWelcomeEmail = (userEmail, userName, userType) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const nextStep =
    userType === 'recruiter'
      ? `<a href="${clientUrl}/post-job" class="btn">Post Your First Job</a>`
      : `<a href="${clientUrl}/profile/seeker" class="btn">Complete Your Profile</a>`;
  const nextStepText =
    userType === 'recruiter'
      ? 'post your first job listing'
      : 'complete your profile so recruiters can find you';

  const html = wrapHtml(
    'Welcome to Job Portal',
    `<h2>Welcome, ${userName}! 👋</h2>
     <p>Thanks for joining Job Portal. Your account has been created successfully as a <strong>${userType}</strong>.</p>
     <p>Next up, ${nextStepText}.</p>
     <hr class="divider" />
     ${nextStep}`
  );
  return send(userEmail, 'Welcome to Job Portal!', html);
};

/**
 * Sent to seeker immediately after they apply.
 */
export const sendApplicationConfirmation = (seekerEmail, jobTitle, jobId) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const html = wrapHtml(
    'Application Received',
    `<h2>Application Received!</h2>
     <p>Hi there,</p>
     <p>Your application for <strong>${jobTitle}</strong> has been successfully submitted.</p>
     <p>The recruiter will review your profile and get back to you. You can track your application status any time from your dashboard.</p>
     <hr class="divider" />
     <a href="${clientUrl}/my-applications" class="btn">Track My Applications</a>
     <p style="margin-top:20px; font-size:13px; color:#6b7280;">
       Applied job: <strong>${jobTitle}</strong>
     </p>`
  );
  return send(seekerEmail, `Application Received: ${jobTitle}`, html);
};

/**
 * Sent to seeker when recruiter updates their application status.
 */
export const sendApplicationStatusUpdate = (seekerEmail, jobTitle, newStatus) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  const msgMap = {
    Shortlisted: `Great news! You've been <strong>shortlisted</strong> for <strong>${jobTitle}</strong>. The recruiter will reach out soon for next steps.`,
    Accepted:    `Congratulations! 🎉 You've been <strong>accepted</strong> for <strong>${jobTitle}</strong>. Please check your email for further instructions from the recruiter.`,
    Rejected:    `Thank you for applying to <strong>${jobTitle}</strong>. After careful review, the team has decided to move forward with other candidates. Don't be discouraged — keep applying!`,
  };

  const badgeClass = `badge-${newStatus.toLowerCase()}`;
  const message = msgMap[newStatus] || `Your application status has been updated to <strong>${newStatus}</strong>.`;

  const html = wrapHtml(
    `Application ${newStatus}`,
    `<h2>Application Status Updated</h2>
     <p>Hi there,</p>
     <p>${message}</p>
     <p>Status: <span class="badge ${badgeClass}">${newStatus}</span></p>
     <hr class="divider" />
     <a href="${clientUrl}/my-applications" class="btn">View My Applications</a>`
  );
  return send(seekerEmail, `Application ${newStatus}: ${jobTitle}`, html);
};

/**
 * Sent to recruiter when a seeker applies to their job.
 */
export const sendApplicationReceivedToRecruiter = (recruiterEmail, seekerName, jobTitle, jobId) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const html = wrapHtml(
    'New Application Received',
    `<h2>New Application for "${jobTitle}"</h2>
     <p>Hi,</p>
     <p><strong>${seekerName}</strong> has just applied to your job listing <strong>${jobTitle}</strong>.</p>
     <p>Head to your dashboard to review the application and update its status.</p>
     <hr class="divider" />
     <a href="${clientUrl}/job/${jobId}/applications" class="btn">View Applications</a>`
  );
  return send(recruiterEmail, `New Application: ${jobTitle}`, html);
};

/**
 * Sent when an admin suspends a user's account (Day 10).
 */
export const sendAccountSuspendedEmail = (userEmail, userName, reason) => {
  const html = wrapHtml(
    'Account Suspended',
    `<h2>Your account has been suspended</h2>
     <p>Hi ${userName},</p>
     <p>Your Job Portal account has been suspended by an administrator${reason ? `, with the following reason given:` : '.'}</p>
     ${reason ? `<p style="font-style:italic; color:#6b7280;">"${reason}"</p>` : ''}
     <p>If you believe this was a mistake, please contact support.</p>`
  );
  return send(userEmail, 'Your Job Portal account has been suspended', html);
};

/**
 * Sent when an admin reactivates a previously-suspended user (Day 10).
 */
export const sendAccountActivatedEmail = (userEmail, userName) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const html = wrapHtml(
    'Account Reactivated',
    `<h2>Welcome back, ${userName}!</h2>
     <p>Your Job Portal account has been reactivated. You can log in and pick up right where you left off.</p>
     <hr class="divider" />
     <a href="${clientUrl}/login" class="btn">Log In</a>`
  );
  return send(userEmail, 'Your Job Portal account has been reactivated', html);
};

/**
 * Bulk alert to a seeker about new jobs matching their skills.
 * (Called from a scheduled job in later days — structure only for now.)
 */
export const sendNewJobAlert = (seekerEmail, skills = [], jobs = []) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const skillList = skills.slice(0, 5).join(', ');
  const jobItems = jobs
    .slice(0, 5)
    .map(
      (j) =>
        `<li style="margin-bottom:10px;">
           <strong><a href="${clientUrl}/jobs/${j._id}" style="color:#2563eb;text-decoration:none;">${j.title}</a></strong>
           &nbsp;—&nbsp; ${j.location} &nbsp;·&nbsp; ${j.jobType}
         </li>`
    )
    .join('');

  const html = wrapHtml(
    'New Jobs Matching Your Skills',
    `<h2>New Jobs Matching Your Skills</h2>
     <p>Hi there,</p>
     <p>We found new job listings matching your skills: <strong>${skillList}</strong></p>
     <ul style="padding-left:20px; color:#374151;">${jobItems}</ul>
     <hr class="divider" />
     <a href="${clientUrl}/jobs" class="btn">Browse All Jobs</a>`
  );
  return send(seekerEmail, `New Jobs Matching: ${skillList}`, html);
};
