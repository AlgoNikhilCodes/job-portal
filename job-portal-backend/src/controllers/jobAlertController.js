import JobAlert from '../models/JobAlert.js';
import DigestSent from '../models/DigestSent.js';
import { getRecommendedJobsForDigest } from '../services/jobMatchingService.js';
import { sendDigestEmail } from '../services/digestEmailService.js';

const ts = () => new Date().toISOString();
const PAGE_SIZE = 20;

// PUT /api/job-alerts — create on first save, update on every save after
export const createOrUpdateJobAlert = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can set up job alerts' });
    }

    const { preferences = {}, frequency, emailAddress, isEnabled } = req.body;

    if (!preferences.skills || preferences.skills.length === 0) {
      return res.status(400).json({
        message: 'Please add at least one skill so we know what jobs to match.',
        errors: [{ field: 'skills', message: 'At least one skill is required' }],
      });
    }

    const update = {
      preferences: {
        skills: preferences.skills || [],
        locations: preferences.locations || [],
        minSalary: preferences.minSalary || undefined,
        maxSalary: preferences.maxSalary || undefined,
        jobTypes: preferences.jobTypes || [],
        experienceLevel: preferences.experienceLevel ?? undefined,
      },
      emailAddress: emailAddress || req.user.email,
    };
    if (frequency !== undefined) update.frequency = frequency;
    if (isEnabled !== undefined) update.isEnabled = isEnabled;

    // upsert: create the document the first time a seeker saves preferences,
    // update it on every save after — the unique index on seekerId means
    // there's only ever one alert per seeker.
    const alert = await JobAlert.findOneAndUpdate(
      { seekerId: req.user._id },
      { $set: update, $setOnInsert: { seekerId: req.user._id } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json(alert);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => ({ field: e.path, message: e.message }));
      return res.status(400).json({ message: 'Please fix the highlighted fields and try again.', errors });
    }
    console.error(`[${ts()}] createOrUpdateJobAlert error:`, error);
    res.status(500).json({ message: 'Something went wrong while saving your job alert preferences. Please try again.' });
  }
};

// GET /api/job-alerts — null (not an error) if the seeker hasn't set one up yet
export const getJobAlert = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can view job alerts' });
    }

    const alert = await JobAlert.findOne({ seekerId: req.user._id });
    res.json(alert || null);
  } catch (error) {
    console.error(`[${ts()}] getJobAlert error:`, error);
    res.status(500).json({ message: 'Something went wrong while fetching your job alert. Please try again.' });
  }
};

// PUT /api/job-alerts/frequency — quick on/off toggle without touching the rest of the form
export const updateJobAlertFrequency = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can manage job alerts' });
    }

    const { frequency } = req.body;
    if (!['daily', 'weekly', 'never'].includes(frequency)) {
      return res.status(400).json({ message: 'Frequency must be one of: daily, weekly, never' });
    }

    const alert = await JobAlert.findOneAndUpdate(
      { seekerId: req.user._id },
      { frequency, isEnabled: frequency !== 'never' },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ message: 'Set up your job alert preferences first before changing frequency.' });
    }

    res.json(alert);
  } catch (error) {
    console.error(`[${ts()}] updateJobAlertFrequency error:`, error);
    res.status(500).json({ message: 'Something went wrong while updating your alert frequency. Please try again.' });
  }
};

// POST /api/job-alerts/test — find matches and send a digest right now, without waiting for the scheduler
export const testJobAlert = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can test job alerts' });
    }

    const alert = await JobAlert.findOne({ seekerId: req.user._id });
    if (!alert) {
      return res.status(404).json({ message: 'Please save your job alert preferences first.' });
    }

    const jobs = await getRecommendedJobsForDigest(alert);

    if (jobs.length === 0) {
      return res.json({
        success: false,
        jobsFound: 0,
        emailSent: false,
        recipientEmail: alert.emailAddress,
        message: 'No matching jobs found right now — try broadening your preferences.',
      });
    }

    const result = await sendDigestEmail(req.user, alert, jobs);

    res.json({
      success: result.success,
      jobsFound: jobs.length,
      emailSent: result.success,
      recipientEmail: alert.emailAddress,
      message: result.success
        ? `Test email sent to ${alert.emailAddress} with ${jobs.length} matching job${jobs.length !== 1 ? 's' : ''}.`
        : 'We found matching jobs but the test email failed to send. Please check your email settings.',
    });
  } catch (error) {
    console.error(`[${ts()}] testJobAlert error:`, error);
    res.status(500).json({ message: 'Something went wrong while sending your test email. Please try again.' });
  }
};

// GET /api/job-alerts/unsubscribe/:token — public, plain HTML response (may be opened from an email client)
export const unsubscribeJobAlert = async (req, res) => {
  const renderPage = (title, message, ok) => `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8" /><title>${title}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
      .card { background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); padding: 40px; max-width: 420px; text-align: center; }
      h1 { font-size: 20px; color: ${ok ? '#166534' : '#991b1b'}; margin: 0 0 12px; }
      p { color: #4b5563; font-size: 14px; line-height: 1.6; }
      a { color: #2563eb; text-decoration: none; font-weight: 600; }
    </style>
    </head>
    <body>
      <div class="card">
        <h1>${title}</h1>
        <p>${message}</p>
        <p><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/job-alerts">Manage your alert preferences</a></p>
      </div>
    </body>
    </html>`;

  try {
    const alert = await JobAlert.findOneAndUpdate(
      { unsubscribeToken: req.params.token },
      { isEnabled: false, frequency: 'never' },
      { new: true }
    );

    if (!alert) {
      return res.status(404).send(
        renderPage('Link not found', 'This unsubscribe link is invalid or has already been used.', false)
      );
    }

    res.send(
      renderPage('Unsubscribed', "You've been unsubscribed from job alert emails. You can re-enable them any time from your preferences.", true)
    );
  } catch (error) {
    console.error(`[${ts()}] unsubscribeJobAlert error:`, error);
    res.status(500).send(renderPage('Something went wrong', 'Please try again later.', false));
  }
};

// GET /api/job-alerts/history — paginated list of past digests
export const getDigestHistory = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can view digest history' });
    }

    const { page = 1 } = req.query;
    const currentPage = Math.max(1, parseInt(page));

    const [digests, totalCount] = await Promise.all([
      DigestSent.find({ seekerId: req.user._id })
        .sort({ sentAt: -1 })
        .skip((currentPage - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .populate({ path: 'jobIds', select: 'title location salaryMin salaryMax jobType recruiterId', populate: { path: 'recruiterId', select: 'name' } }),
      DigestSent.countDocuments({ seekerId: req.user._id }),
    ]);

    res.json({
      digests,
      totalCount,
      page: currentPage,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
    });
  } catch (error) {
    console.error(`[${ts()}] getDigestHistory error:`, error);
    res.status(500).json({ message: 'Something went wrong while fetching your digest history. Please try again.' });
  }
};
