import Application from '../models/Application.js';
import Job from '../models/Job.js';
import SeekerProfile from '../models/SeekerProfile.js';
import Resume from '../models/Resume.js';
import {
  sendApplicationConfirmation,
  sendApplicationReceivedToRecruiter,
  sendApplicationStatusUpdate,
} from '../services/emailService.js';
import {
  emitApplicationNotification,
  emitApplicationStatusUpdate as emitStatusUpdateSocket,
  emitApplicationCountUpdate,
  emitApplicationStatusChangedBulk,
  emitKanbanBoardUpdate,
} from '../services/socketService.js';

const ts = () => new Date().toISOString();
const VALID_STATUSES = ['Applied', 'Shortlisted', 'Rejected', 'Accepted'];

// POST /api/applications — seeker applies to a job
export const createApplication = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can apply to jobs' });
    }

    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ message: 'Please select a job to apply to.' });

    // Confirm job exists and is still active; populate recruiter for email
    const job = await Job.findOne({ _id: jobId, isActive: true }).populate('recruiterId', 'name email');
    if (!job) return res.status(404).json({ message: 'Job not found or no longer active' });

    const application = await Application.create({
      seekerId: req.user._id,
      jobId,
    });

    // Fire-and-forget emails — never await so they don't slow the response
    sendApplicationConfirmation(req.user.email, job.title, jobId);
    sendApplicationReceivedToRecruiter(
      job.recruiterId.email,
      req.user.name,
      job.title,
      jobId
    );

    // Real-time: notify the recruiter instantly + sync their dashboard's
    // application count for this job. Guarded by `if (io)` so tests/scripts
    // that spin up the Express app without a socket server still work.
    const io = req.app.get('io');
    if (io) {
      emitApplicationNotification(io, job._id, job.recruiterId._id, req.user.name, req.user._id);

      const newCount = await Application.countDocuments({ jobId });
      emitApplicationCountUpdate(io, job.recruiterId._id, job._id, newCount);
    }

    res.status(201).json(application);
  } catch (error) {
    // Duplicate key = already applied (compound unique index)
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You have already applied to this job.' });
    }
    console.error(`[${new Date().toISOString()}] createApplication error:`, error);
    res.status(500).json({ message: 'Something went wrong while submitting your application. Please try again.' });
  }
};

// GET /api/applications/my-applications — seeker views their own applications
export const getMyApplications = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can view their applications' });
    }

    const applications = await Application.find({ seekerId: req.user._id })
      .populate({
        path: 'jobId',
        select: 'title location salaryMin salaryMax jobType recruiterId isActive',
        populate: { path: 'recruiterId', select: 'name' },
      })
      .sort({ createdAt: -1 });

    res.json({ applications, totalCount: applications.length });
  } catch (error) {
    console.error('getMyApplications error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching applications. Please try again.' });
  }
};

// GET /api/applications/job/:jobId — recruiter views applicants for their job
//
// Supports two response shapes via ?grouped=true:
//   - default (unchanged): { applications: [...flat, newest first], totalCount }
//     — kept exactly as it was so the existing table view (ApplicationsForJobPage)
//     doesn't break.
//   - grouped=true: { Applied: [...], Shortlisted: [...], Accepted: [...], Rejected: [...] }
//     — what the Kanban board consumes, one array per column.
export const getApplicationsForJob = async (req, res) => {
  try {
    if (req.user.userType !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can view job applications' });
    }

    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found. Please check the URL and try again.' });

    // Only the recruiter who posted this job can see its applicants
    if (job.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to view these applications' });
    }

    const kanbanBatchSize = Number(process.env.KANBAN_BATCH_SIZE) || 50;
    const applications = await Application.find({ jobId: req.params.jobId })
      .populate('seekerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(req.query.grouped === 'true' ? kanbanBatchSize : 0);

    // Attach seeker profile + resume data alongside each application — the
    // Kanban card needs skills/experience at a glance without a follow-up request.
    const seekerIds = applications.map((a) => a.seekerId._id);
    const [profiles, resumes] = await Promise.all([
      SeekerProfile.find({ userId: { $in: seekerIds } }),
      Resume.find({ seekerId: { $in: seekerIds } }).select('seekerId parsedData.skills parsedData.experience isPublic'),
    ]);
    const profileMap = Object.fromEntries(profiles.map((p) => [p.userId.toString(), p]));
    const resumeMap = Object.fromEntries(resumes.map((r) => [r.seekerId.toString(), r]));

    const enriched = applications.map((app) => {
      const seekerId = app.seekerId._id.toString();
      const profile = profileMap[seekerId];
      const resume = resumeMap[seekerId];
      return {
        ...app.toObject(),
        seekerProfile: profile || null,
        // Resume-extracted skills/experience take priority (that's the whole
        // point of Day 8's parsing), falling back to whatever the seeker
        // typed into their profile manually.
        skills: resume?.parsedData?.skills?.length ? resume.parsedData.skills : profile?.skills || [],
        experience: resume?.parsedData?.experience ?? profile?.experience ?? null,
        hasResume: !!resume,
        // Bug #4 fix: the recruiter-facing "View Resume" link needs to know
        // up front whether this resume is private, so it can hide/disable
        // itself instead of linking to a page the server will 403 on.
        resumeIsPublic: resume ? resume.isPublic !== false : false,
      };
    });

    if (req.query.grouped === 'true') {
      const grouped = { Applied: [], Shortlisted: [], Accepted: [], Rejected: [] };
      enriched.forEach((app) => {
        (grouped[app.status] || grouped.Applied).push(app);
      });
      return res.json(grouped);
    }

    res.json({ applications: enriched, totalCount: enriched.length });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Job not found. Please check the URL and try again.' });
    }
    console.error(`[${ts()}] getApplicationsForJob error:`, error);
    res.status(500).json({ message: 'Something went wrong while fetching applications. Please try again.' });
  }
};

// PUT /api/applications/:applicationId — recruiter changes status
export const updateApplicationStatus = async (req, res) => {
  try {
    if (req.user.userType !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can update application status' });
    }

    const { status, recruiterNotes } = req.body;
    // Includes 'Applied' so the Kanban board can drag a card back to the
    // first column (e.g. undoing a shortlist) — kept in sync with
    // bulkUpdateApplicationStatus's VALID_STATUSES below.
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const application = await Application.findById(req.params.applicationId)
      .populate('jobId')
      .populate('seekerId', 'name email');
    if (!application) return res.status(404).json({ message: 'Application not found. It may have been withdrawn or removed.' });

    // Ensure this recruiter owns the job the application is for
    if (application.jobId.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to update this application' });
    }

    application.status = status;
    if (recruiterNotes !== undefined) application.recruiterNotes = recruiterNotes;
    await application.save();

    // Notify the seeker of the status change (fire-and-forget)
    sendApplicationStatusUpdate(
      application.seekerId.email,
      application.jobId.title,
      status
    );

    // Real-time: push the status change to the seeker instantly
    const io = req.app.get('io');
    if (io) {
      emitStatusUpdateSocket(
        io,
        application.seekerId._id,
        status,
        application.jobId.title,
        application.jobId._id,
        req.user.name
      );
      // This same endpoint is what the Kanban board's single-card drag calls
      // — broadcast it so any other recruiter with this job's board open
      // sees the card move without refreshing.
      emitKanbanBoardUpdate(io, req.user._id, application.jobId._id, application._id, status, req.user.name);
    }

    res.json(application);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Application not found. Please check the URL and try again.' });
    }
    console.error(`[${ts()}] updateApplicationStatus error:`, error);
    res.status(500).json({ message: 'Something went wrong while updating application. Please try again.' });
  }
};

// PUT /api/applications/bulk/status — recruiter moves/accepts/rejects several
// candidates at once from the Kanban board's bulk-action toolbar.
export const bulkUpdateApplicationStatus = async (req, res) => {
  try {
    if (req.user.userType !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can update application status' });
    }

    const { applicationIds, newStatus } = req.body;
    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ message: 'Please select at least one candidate.' });
    }
    if (!VALID_STATUSES.includes(newStatus)) {
      return res.status(400).json({ message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    // Fetch first (not just updateMany) so we can verify ownership of every
    // single application before changing anything, and so we still have the
    // seeker/job info needed for emails + socket events afterward.
    const applications = await Application.find({ _id: { $in: applicationIds } })
      .populate('jobId')
      .populate('seekerId', 'name email');

    const unauthorized = applications.some(
      (app) => app.jobId.recruiterId.toString() !== req.user._id.toString()
    );
    if (unauthorized) {
      return res.status(403).json({ message: 'You are not authorized to update one or more of these applications.' });
    }
    if (applications.length === 0) {
      return res.status(404).json({ message: 'None of the selected applications could be found.' });
    }

    await Application.updateMany(
      { _id: { $in: applications.map((a) => a._id) } },
      { status: newStatus }
    );

    // Fire-and-forget: one status-update email per seeker, same as the
    // single-application flow — nobody should get left out just because
    // they were part of a bulk action.
    applications.forEach((app) => {
      sendApplicationStatusUpdate(app.seekerId.email, app.jobId.title, newStatus);
    });

    const io = req.app.get('io');
    if (io) {
      const jobId = applications[0].jobId._id;
      emitApplicationStatusChangedBulk(
        io,
        req.user._id,
        jobId,
        applications.map((a) => a._id),
        newStatus
      );
      applications.forEach((app) => {
        emitStatusUpdateSocket(io, app.seekerId._id, newStatus, app.jobId.title, app.jobId._id, req.user.name);
        emitKanbanBoardUpdate(io, req.user._id, app.jobId._id, app._id, newStatus, req.user.name);
      });
    }

    res.json({ success: true, updated: applications.length });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'One of the selected application IDs looks invalid.' });
    }
    console.error(`[${ts()}] bulkUpdateApplicationStatus error:`, error);
    res.status(500).json({ message: 'Something went wrong while updating these applications. Please try again.' });
  }
};

// PUT /api/applications/:id/note — recruiter jots a private note on a candidate
export const addApplicationNote = async (req, res) => {
  try {
    if (req.user.userType !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can add notes to applications' });
    }

    const { note } = req.body;
    if (typeof note !== 'string') {
      return res.status(400).json({ message: 'Note must be text.' });
    }

    const application = await Application.findById(req.params.id).populate('jobId');
    if (!application) {
      return res.status(404).json({ message: 'Application not found. It may have been withdrawn or removed.' });
    }
    if (application.jobId.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to update this application' });
    }

    application.recruiterNotes = note.trim();
    await application.save();

    res.json(application);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Application not found. Please check the URL and try again.' });
    }
    console.error(`[${ts()}] addApplicationNote error:`, error);
    res.status(500).json({ message: 'Something went wrong while saving your note. Please try again.' });
  }
};

// GET /api/applications/stats/job/:jobId — aggregated stats for recruiter dashboard
export const getApplicationStats = async (req, res) => {
  try {
    if (req.user.userType !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can view stats' });
    }

    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found. Please check the URL and try again.' });

    if (job.recruiterId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to view this data' });
    }

    // Single aggregation to count all statuses at once
    const counts = await Application.aggregate([
      { $match: { jobId: job._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const stats = { total: 0, Applied: 0, Shortlisted: 0, Accepted: 0, Rejected: 0 };
    counts.forEach(({ _id, count }) => {
      stats[_id] = count;
      stats.total += count;
    });

    res.json(stats);
  } catch (error) {
    console.error('getApplicationStats error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching stats. Please try again.' });
  }
};
