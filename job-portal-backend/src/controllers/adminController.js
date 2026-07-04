import mongoose from 'mongoose';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import AuditLog from '../models/AuditLog.js';
import SeekerProfile from '../models/SeekerProfile.js';
import RecruiterProfile from '../models/RecruiterProfile.js';
import SavedJob from '../models/SavedJob.js';
import { sendAccountSuspendedEmail, sendAccountActivatedEmail } from '../services/emailService.js';
import { getMetricsSnapshot } from '../middleware/requestMetrics.js';
import { runDailyDigestNow, runWeeklyDigestNow } from '../jobs/dailyJobAlertScheduler.js';

const ts = () => new Date().toISOString();
const STATUSES = ['Applied', 'Shortlisted', 'Rejected', 'Accepted'];

// Small helper — every list endpoint here follows the same page/limit shape.
const paginate = (req, defaultLimit = 20) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

// Checks the DB connection is actually responsive (not just "connected" per
// mongoose's readyState) by timing a real ping — this is what lets
// getSystemHealth report 'slow'/'error' instead of a hardcoded 'healthy'.
const checkDatabaseStatus = async () => {
  if (mongoose.connection.readyState !== 1) return 'error';
  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    const elapsed = Date.now() - start;
    if (elapsed > 500) return 'slow';
    return 'healthy';
  } catch {
    return 'error';
  }
};

// ─── Dashboard ──────────────────────────────────────────────────────────────

// GET /api/admin/stats
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalSeekers,
      totalRecruiters,
      totalAdmins,
      totalJobs,
      activeJobs,
      totalApplications,
      applicationsByStatusRaw,
      databaseStatus,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ userType: 'seeker' }),
      User.countDocuments({ userType: 'recruiter' }),
      User.countDocuments({ userType: 'admin' }),
      Job.countDocuments({}),
      Job.countDocuments({ isActive: true }),
      Application.countDocuments({}),
      Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      checkDatabaseStatus(),
    ]);

    const applicationsByStatus = { Applied: 0, Shortlisted: 0, Accepted: 0, Rejected: 0 };
    applicationsByStatusRaw.forEach((row) => {
      if (applicationsByStatus[row._id] !== undefined) applicationsByStatus[row._id] = row.count;
    });

    const metrics = getMetricsSnapshot();

    res.json({
      totalUsers,
      totalSeekers,
      totalRecruiters,
      totalAdmins,
      totalJobs,
      totalApplications,
      activeJobs,
      pendingApplications: applicationsByStatus.Applied,
      acceptedApplications: applicationsByStatus.Accepted,
      rejectedApplications: applicationsByStatus.Rejected,
      shortlistedApplications: applicationsByStatus.Shortlisted,
      applicationsByStatus,
      platformHealth: {
        apiUptime: metrics.apiUptime,
        databaseStatus,
        errorRate: metrics.errorRate,
        lastCheck: new Date(),
      },
    });
  } catch (error) {
    console.error(`[${ts()}] getDashboardStats error:`, error);
    res.status(500).json({ message: 'Something went wrong while loading dashboard stats. Please try again.' });
  }
};

// GET /api/admin/trends?days=30
export const getGrowthTrends = async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    // Build the full list of dates up front so days with zero activity
    // still show up as 0 instead of just disappearing from the chart.
    const dates = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const dayGroup = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    const groupByDay = (Model, match = {}) =>
      Model.aggregate([
        { $match: { createdAt: { $gte: since }, ...match } },
        { $group: { _id: dayGroup, count: { $sum: 1 } } },
      ]);

    const [userRows, jobRows, applicationRows] = await Promise.all([
      groupByDay(User),
      groupByDay(Job),
      groupByDay(Application),
    ]);

    const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));
    const userMap = toMap(userRows);
    const jobMap = toMap(jobRows);
    const applicationMap = toMap(applicationRows);

    const newUsers = dates.map((d) => userMap[d] || 0);

    res.json({
      dates,
      newUsers,
      newJobs: dates.map((d) => jobMap[d] || 0),
      newApplications: dates.map((d) => applicationMap[d] || 0),
      // Same underlying metric as newUsers — kept as a separate key only
      // because the spec asked for both `newUsers` and `newSignups`.
      newSignups: newUsers,
    });
  } catch (error) {
    console.error(`[${ts()}] getGrowthTrends error:`, error);
    res.status(500).json({ message: 'Something went wrong while loading growth trends. Please try again.' });
  }
};

// ─── Users ──────────────────────────────────────────────────────────────────

// GET /api/admin/users?page=&limit=&role=&search=&status=
export const getAllUsers = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const { role, search, status } = req.query;

    const filter = {};
    if (role && ['seeker', 'recruiter', 'admin'].includes(role)) filter.userType = role;
    // Same "missing isActive means active" logic as the mapping below —
    // legacy user documents predate this field and have no key at all.
    if (status === 'active') filter.isActive = { $ne: false };
    else if (status === 'suspended') filter.isActive = false;
    if (search?.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: re }, { email: re }];
    }

    const [users, totalCount] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    // Per-page counts only (cheap — capped at `limit` users), not the whole table.
    const enriched = await Promise.all(
      users.map(async (u) => {
        const [jobsPosted, applicationsCount] = await Promise.all([
          u.userType === 'recruiter' ? Job.countDocuments({ recruiterId: u._id }) : Promise.resolve(0),
          u.userType === 'seeker' ? Application.countDocuments({ seekerId: u._id }) : Promise.resolve(0),
        ]);
        return {
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.userType,
          // `.lean()` returns the raw document, so users created before this
          // field existed have no `isActive` key at all (undefined) rather
          // than the schema default — treat "not explicitly false" as active.
          isActive: u.isActive !== false,
          joinedAt: u.createdAt,
          jobsPosted,
          applicationsCount,
        };
      })
    );

    res.json({ users: enriched, totalCount, page, totalPages: Math.max(1, Math.ceil(totalCount / limit)) });
  } catch (error) {
    console.error(`[${ts()}] getAllUsers error:`, error);
    res.status(500).json({ message: 'Something went wrong while loading users. Please try again.' });
  }
};

// GET /api/admin/users/:userId
export const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).lean();
    if (!user) return res.status(404).json({ message: 'User not found.' });

    let roleStats = {};
    let profileCompletion = 0;

    if (user.userType === 'recruiter') {
      const [jobsPosted, jobs, profile] = await Promise.all([
        Job.countDocuments({ recruiterId: user._id }),
        Job.find({ recruiterId: user._id }).select('_id title').lean(),
        RecruiterProfile.findOne({ userId: user._id }).lean(),
      ]);
      const jobIds = jobs.map((j) => j._id);
      const applicationsReceived = jobIds.length
        ? await Application.countDocuments({ jobId: { $in: jobIds } })
        : 0;

      let topJob = null;
      if (jobIds.length) {
        const counts = await Application.aggregate([
          { $match: { jobId: { $in: jobIds } } },
          { $group: { _id: '$jobId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 1 },
        ]);
        if (counts.length) {
          const job = jobs.find((j) => j._id.toString() === counts[0]._id.toString());
          topJob = job ? { jobId: job._id, title: job.title, applicationCount: counts[0].count } : null;
        }
      }

      roleStats = { jobsPosted, applicationsReceived, topJob };
      const fields = [profile?.companyName, profile?.companyDescription, profile?.location, profile?.companySize];
      profileCompletion = Math.round((fields.filter(Boolean).length / fields.length) * 100);
    } else if (user.userType === 'seeker') {
      const [applicationsSent, savedJobsCount, profile] = await Promise.all([
        Application.countDocuments({ seekerId: user._id }),
        SavedJob.countDocuments({ seekerId: user._id }).catch(() => 0),
        SeekerProfile.findOne({ userId: user._id }).lean(),
      ]);
      roleStats = { applicationsSent, savedJobsCount };
      const fields = [profile?.phone, profile?.location, profile?.experience != null, profile?.skills?.length, profile?.summary, profile?.resumeLink];
      profileCompletion = Math.round((fields.filter(Boolean).length / fields.length) * 100);
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.userType,
      isActive: user.isActive !== false,
      suspendedReason: user.suspendedReason,
      joinedAt: user.createdAt,
      lastLogin: user.lastLoginAt,
      profileCompletion,
      adminNote: user.adminNote || '',
      ...roleStats,
    });
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'User not found.' });
    console.error(`[${ts()}] getUserDetails error:`, error);
    res.status(500).json({ message: 'Something went wrong while loading this user. Please try again.' });
  }
};

// PUT /api/admin/users/:userId/suspend
export const suspendUser = async (req, res) => {
  try {
    const { reason, duration } = req.body;
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ message: 'User not found.' });

    if (target._id.equals(req.user._id)) {
      return res.status(400).json({ message: "You can't suspend your own account." });
    }
    if (target.userType === 'admin') {
      return res.status(403).json({ message: 'Admins cannot suspend other admin accounts.' });
    }

    target.isActive = false;
    target.suspendedReason = reason?.trim() || 'No reason provided';
    await target.save();

    await AuditLog.create({
      adminId: req.user._id,
      action: 'suspend',
      targetUserId: target._id,
      changes: { isActive: false, suspendedReason: target.suspendedReason, duration: duration || 'permanent' },
      reason: target.suspendedReason,
      ipAddress: req.ip,
    });

    sendAccountSuspendedEmail(target.email, target.name, target.suspendedReason).catch((err) =>
      console.error(`[${ts()}] suspend email failed:`, err.message)
    );

    console.log(`[${ts()}] [Admin] ${req.user.email} suspended ${target.email} — reason: ${target.suspendedReason}`);
    res.json(target);
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'User not found.' });
    console.error(`[${ts()}] suspendUser error:`, error);
    res.status(500).json({ message: 'Something went wrong while suspending this user. Please try again.' });
  }
};

// PUT /api/admin/users/:userId/activate
export const activateUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ message: 'User not found.' });

    target.isActive = true;
    target.suspendedReason = null;
    await target.save();

    await AuditLog.create({
      adminId: req.user._id,
      action: 'activate',
      targetUserId: target._id,
      changes: { isActive: true },
      ipAddress: req.ip,
    });

    sendAccountActivatedEmail(target.email, target.name).catch((err) =>
      console.error(`[${ts()}] activate email failed:`, err.message)
    );

    console.log(`[${ts()}] [Admin] ${req.user.email} activated ${target.email}`);
    res.json(target);
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'User not found.' });
    console.error(`[${ts()}] activateUser error:`, error);
    res.status(500).json({ message: 'Something went wrong while activating this user. Please try again.' });
  }
};

// DELETE /api/admin/users/:userId  — body: { hardDelete?: boolean }
export const deleteUser = async (req, res) => {
  try {
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ message: 'User not found.' });

    if (target._id.equals(req.user._id)) {
      return res.status(400).json({ message: "You can't delete your own account." });
    }
    if (target.userType === 'admin') {
      return res.status(403).json({ message: 'Admins cannot delete other admin accounts.' });
    }

    const hardDelete = req.body?.hardDelete === true;
    const snapshot = { name: target.name, email: target.email, role: target.userType };

    if (hardDelete) {
      // Cascade: an orphaned Job/Application referencing a deleted user
      // would break every page that displays that user's name/email, so a
      // hard delete has to clean up what it owns.
      if (target.userType === 'recruiter') {
        const jobs = await Job.find({ recruiterId: target._id }).select('_id').lean();
        const jobIds = jobs.map((j) => j._id);
        if (jobIds.length) await Application.deleteMany({ jobId: { $in: jobIds } });
        await Job.deleteMany({ recruiterId: target._id });
        await RecruiterProfile.deleteOne({ userId: target._id });
      } else if (target.userType === 'seeker') {
        await Application.deleteMany({ seekerId: target._id });
        await SeekerProfile.deleteOne({ userId: target._id });
        await SavedJob.deleteMany({ seekerId: target._id }).catch(() => {});
      }
      await User.deleteOne({ _id: target._id });
    } else {
      // Soft delete — keep the row (so historical jobs/applications still
      // resolve a name/email) but lock the account out entirely.
      target.isActive = false;
      target.suspendedReason = 'Account deleted by admin';
      await target.save();
    }

    await AuditLog.create({
      adminId: req.user._id,
      action: 'delete',
      targetUserId: hardDelete ? null : target._id, // target no longer exists if hard-deleted
      changes: { hardDelete, ...snapshot },
      ipAddress: req.ip,
    });

    console.log(`[${ts()}] [Admin] ${req.user.email} deleted ${snapshot.email} (hardDelete=${hardDelete})`);
    res.json({ message: hardDelete ? 'User permanently deleted.' : 'User account deleted (soft delete).' });
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'User not found.' });
    console.error(`[${ts()}] deleteUser error:`, error);
    res.status(500).json({ message: 'Something went wrong while deleting this user. Please try again.' });
  }
};

// PUT /api/admin/users/:userId/note
export const addAdminNote = async (req, res) => {
  try {
    const { note } = req.body;
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ message: 'User not found.' });

    target.adminNote = (note || '').trim();
    await target.save();

    await AuditLog.create({
      adminId: req.user._id,
      action: 'add_note',
      targetUserId: target._id,
      changes: { adminNote: target.adminNote },
      ipAddress: req.ip,
    });

    res.json(target);
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'User not found.' });
    console.error(`[${ts()}] addAdminNote error:`, error);
    res.status(500).json({ message: 'Something went wrong while saving this note. Please try again.' });
  }
};

// ─── Jobs ───────────────────────────────────────────────────────────────────

// GET /api/admin/jobs?page=&limit=&status=&search=
export const getAllJobs = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const { status, search } = req.query;

    const filter = {};
    if (status === 'active') filter.isActive = true;
    else if (status === 'inactive') filter.isActive = false;
    if (search?.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.title = re;
    }

    const [jobs, totalCount] = await Promise.all([
      Job.find(filter)
        .populate('recruiterId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(filter),
    ]);

    const jobIds = jobs.map((j) => j._id);
    const counts = jobIds.length
      ? await Application.aggregate([
          { $match: { jobId: { $in: jobIds } } },
          { $group: { _id: '$jobId', count: { $sum: 1 } } },
        ])
      : [];
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

    res.json({
      jobs: jobs.map((j) => ({
        id: j._id,
        title: j.title,
        recruiter: j.recruiterId ? { name: j.recruiterId.name, email: j.recruiterId.email } : null,
        createdAt: j.createdAt,
        isActive: j.isActive,
        applicationsCount: countMap[j._id.toString()] || 0,
        status: j.isActive ? 'Active' : 'Closed',
      })),
      totalCount,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    });
  } catch (error) {
    console.error(`[${ts()}] getAllJobs error:`, error);
    res.status(500).json({ message: 'Something went wrong while loading jobs. Please try again.' });
  }
};

// ─── Applications ───────────────────────────────────────────────────────────

// GET /api/admin/applications?page=&limit=&status=
export const getAllApplications = async (req, res) => {
  try {
    const { page, limit, skip } = paginate(req);
    const { status } = req.query;

    const filter = {};
    if (status && STATUSES.includes(status)) filter.status = status;

    const [applications, totalCount, statusRows] = await Promise.all([
      Application.find(filter)
        .populate('seekerId', 'name')
        .populate('jobId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Application.countDocuments(filter),
      // Status breakdown is always computed over the FULL collection (not
      // just the current filter/page) — it's a global summary, shown
      // alongside whatever slice of applications the table is filtered to.
      Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const statusCounts = { Applied: 0, Shortlisted: 0, Accepted: 0, Rejected: 0 };
    statusRows.forEach((r) => { if (statusCounts[r._id] !== undefined) statusCounts[r._id] = r.count; });

    res.json({
      applications: applications.map((a) => ({
        id: a._id,
        seeker: a.seekerId ? { name: a.seekerId.name } : null,
        job: a.jobId ? { title: a.jobId.title } : null,
        status: a.status,
        appliedAt: a.createdAt,
      })),
      totalCount,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      statusCounts,
    });
  } catch (error) {
    console.error(`[${ts()}] getAllApplications error:`, error);
    res.status(500).json({ message: 'Something went wrong while loading applications. Please try again.' });
  }
};

// GET /api/admin/applications/stats
export const getApplicationStats = async (req, res) => {
  try {
    const totalApplications = await Application.countDocuments({});

    // Average time-to-decision: how long (in days) it took applications
    // that have LEFT the 'Applied' state to reach their current status.
    // updatedAt only moves when status changes (no other mutable field on
    // Application besides recruiterNotes/status), so this is a reasonable proxy.
    const decided = await Application.find({ status: { $ne: 'Applied' } })
      .select('createdAt updatedAt')
      .lean();
    const averageTimeToDecision = decided.length
      ? Number(
          (
            decided.reduce((sum, a) => sum + (a.updatedAt - a.createdAt), 0) /
            decided.length /
            (1000 * 60 * 60 * 24)
          ).toFixed(1)
        )
      : 0;

    const counts = await Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const byStatus = { Applied: 0, Shortlisted: 0, Accepted: 0, Rejected: 0 };
    counts.forEach((r) => { if (byStatus[r._id] !== undefined) byStatus[r._id] = r.count; });

    // Definitions (there's no single universally-correct one, so documenting
    // the choice here):
    //  - appliedToShortlisted: share of ALL applications that made it past
    //    the initial screen (currently Shortlisted OR Accepted).
    //  - shortlistedToAccepted: of those who WERE shortlisted-or-further,
    //    what share ended up Accepted.
    const pastScreen = byStatus.Shortlisted + byStatus.Accepted;
    const appliedToShortlisted = totalApplications
      ? Number(((pastScreen / totalApplications) * 100).toFixed(1))
      : 0;
    const shortlistedToAccepted = pastScreen
      ? Number(((byStatus.Accepted / pastScreen) * 100).toFixed(1))
      : 0;

    const topJobsRaw = await Application.aggregate([
      { $group: { _id: '$jobId', applicationCount: { $sum: 1 } } },
      { $sort: { applicationCount: -1 } },
      { $limit: 5 },
    ]);
    const jobDocs = await Job.find({ _id: { $in: topJobsRaw.map((j) => j._id) } }).select('title').lean();
    const jobTitleMap = Object.fromEntries(jobDocs.map((j) => [j._id.toString(), j.title]));
    const topJobs = topJobsRaw.map((j) => ({
      jobId: j._id,
      title: jobTitleMap[j._id.toString()] || '(deleted job)',
      applicationCount: j.applicationCount,
    }));

    res.json({
      totalApplications,
      averageTimeToDecision,
      conversionRate: { appliedToShortlisted, shortlistedToAccepted },
      topJobs,
    });
  } catch (error) {
    console.error(`[${ts()}] getApplicationStats error:`, error);
    res.status(500).json({ message: 'Something went wrong while loading application stats. Please try again.' });
  }
};

// ─── System health ──────────────────────────────────────────────────────────

// GET /api/admin/health
export const getSystemHealth = async (req, res) => {
  try {
    const databaseStatus = await checkDatabaseStatus();
    const metrics = getMetricsSnapshot();
    const now = new Date();

    res.json({
      apiUptime: metrics.apiUptime,
      databaseStatus,
      errorRate: metrics.errorRate,
      averageResponseTime: metrics.averageResponseTime,
      totalRequests: metrics.totalRequests,
      processUptimeSeconds: Math.round(process.uptime()),
      lastCheck: now,
      nextCheck: new Date(now.getTime() + 60_000),
    });
  } catch (error) {
    console.error(`[${ts()}] getSystemHealth error:`, error);
    res.status(500).json({ message: 'Something went wrong while checking system health. Please try again.' });
  }
};

// ─── Job alert manual trigger (QA fix #3) ──────────────────────────────────

// POST /api/admin/test/trigger-job-alerts — body: { frequency: 'daily' | 'weekly' }
// Runs the exact same batch logic the 9 AM/Monday cron jobs run, on demand —
// so QA/dev can verify the whole alert pipeline (matching + email + digest
// history) without waiting for the real schedule. Admin-only since it sends
// real emails to real seekers.
export const triggerJobAlerts = async (req, res) => {
  try {
    const frequency = req.body?.frequency === 'weekly' ? 'weekly' : 'daily';
    const runner = frequency === 'weekly' ? runWeeklyDigestNow : runDailyDigestNow;

    const result = await runner();

    res.json({
      success: true,
      frequency,
      message: `Manually triggered ${frequency} job alert run.`,
      ...result, // { totalAlerts, sent, skipped, failed }
    });
  } catch (error) {
    console.error(`[${ts()}] triggerJobAlerts error:`, error);
    res.status(500).json({ message: 'Something went wrong while triggering job alerts. Please try again.' });
  }
};
