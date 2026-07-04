import Application from '../models/Application.js';
import Job from '../models/Job.js';
import SavedJob from '../models/SavedJob.js';
import SeekerProfile from '../models/SeekerProfile.js';
import RecruiterProfile from '../models/RecruiterProfile.js';
import User from '../models/User.js';
import Resume from '../models/Resume.js';

// Weighted checklist the QA report specified — must add up to 100.
const PROFILE_WEIGHTS = {
  name: 10,
  email: 10,
  phone: 10,
  skills: 20,
  experience: 20,
  education: 20,
  resume: 10,
};

/**
 * How "complete" a seeker's profile is, as a 0-100 percentage.
 *
 * name/email live on User; phone/skills/experience/education live on
 * SeekerProfile; "resume uploaded" is a real Resume document existing
 * (Day 8), not just the free-text `resumeLink` field on SeekerProfile.
 * experience === 0 (fresher) still counts as "filled in" — it's a real
 * answer, not a missing one — so it's checked with a null/undefined test
 * rather than a truthy check.
 */
export const calculateProfileCompletion = async (seekerId) => {
  const [user, profile, hasResume] = await Promise.all([
    User.findById(seekerId).select('name email').lean(),
    SeekerProfile.findOne({ userId: seekerId }).lean(),
    Resume.exists({ seekerId }),
  ]);

  let total = 0;
  if (user?.name) total += PROFILE_WEIGHTS.name;
  if (user?.email) total += PROFILE_WEIGHTS.email;
  if (profile?.phone) total += PROFILE_WEIGHTS.phone;
  if (profile?.skills?.length > 0) total += PROFILE_WEIGHTS.skills;
  if (profile?.experience !== undefined && profile?.experience !== null) total += PROFILE_WEIGHTS.experience;
  if (profile?.education) total += PROFILE_WEIGHTS.education;
  if (hasResume) total += PROFILE_WEIGHTS.resume;

  return Math.min(100, total);
};

// GET /api/dashboard/seeker
export const getSeekerDashboard = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Seeker access only' });
    }

    const seekerId = req.user._id;

    // Run all queries in parallel
    const [allApplications, savedJobsCount, seekerProfile, profileCompletion] = await Promise.all([
      Application.find({ seekerId })
        .populate({
          path: 'jobId',
          select: 'title location salaryMin salaryMax jobType recruiterId isActive',
          populate: { path: 'recruiterId', select: 'name' },
        })
        .sort({ createdAt: -1 })
        .lean(),
      SavedJob.countDocuments({ seekerId }),
      SeekerProfile.findOne({ userId: seekerId }).lean(),
      calculateProfileCompletion(seekerId),
    ]);

    // Status breakdown
    const applicationsByStatus = { Applied: 0, Shortlisted: 0, Accepted: 0, Rejected: 0 };
    allApplications.forEach((a) => {
      if (applicationsByStatus[a.status] !== undefined) applicationsByStatus[a.status]++;
    });

    // Recent 5 applications
    const recentApplications = allApplications.slice(0, 5);

    // Recommended jobs — based on seeker skills
    let recommendedJobs = [];
    const skills = seekerProfile?.skills || [];
    if (skills.length > 0) {
      const appliedJobIds = allApplications.map((a) => a.jobId?._id).filter(Boolean);
      const savedJobDocs = await SavedJob.find({ seekerId }).select('jobId').lean();
      const savedJobIds = savedJobDocs.map((s) => s.jobId);

      const exclude = [...appliedJobIds, ...savedJobIds];

      const candidates = await Job.find({
        isActive: true,
        _id: { $nin: exclude },
        skillsRequired: { $in: skills },
      })
        .populate('recruiterId', 'name')
        .lean();

      // Score by number of matching skills
      const scored = candidates.map((job) => {
        const matches = (job.skillsRequired || []).filter((s) =>
          skills.map((sk) => sk.toLowerCase()).includes(s.toLowerCase())
        ).length;
        return { ...job, _matchScore: matches };
      });
      scored.sort((a, b) => b._matchScore - a._matchScore);
      recommendedJobs = scored.slice(0, 5);
    }

    res.json({
      totalApplications: allApplications.length,
      applicationsByStatus,
      recentApplications,
      savedJobsCount,
      recommendedJobs,
      skillsUsedForRecommendation: seekerProfile?.skills || [],
      profileCompletion,
    });
  } catch (error) {
    console.error('getSeekerDashboard error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching seeker dashboard. Please try again.' });
  }
};

// GET /api/dashboard/recruiter
export const getRecruiterDashboard = async (req, res) => {
  try {
    if (req.user.userType !== 'recruiter') {
      return res.status(403).json({ message: 'Recruiter access only' });
    }

    const recruiterId = req.user._id;

    // Get all jobs by this recruiter (including inactive)
    const myJobs = await Job.find({ recruiterId }).select('_id title isActive createdAt').lean();
    const myJobIds = myJobs.map((j) => j._id);

    if (myJobIds.length === 0) {
      return res.json({
        totalJobsPosted: 0,
        totalApplicationsReceived: 0,
        applicationsByStatus: { Applied: 0, Shortlisted: 0, Accepted: 0, Rejected: 0 },
        recentApplications: [],
        topPerformingJobs: [],
      });
    }

    // All applications across all recruiter's jobs
    const allApplications = await Application.find({ jobId: { $in: myJobIds } })
      .populate('seekerId', 'name email')
      .populate({ path: 'jobId', select: 'title location' })
      .sort({ createdAt: -1 })
      .lean();

    // Status breakdown
    const applicationsByStatus = { Applied: 0, Shortlisted: 0, Accepted: 0, Rejected: 0 };
    allApplications.forEach((a) => {
      if (applicationsByStatus[a.status] !== undefined) applicationsByStatus[a.status]++;
    });

    // Top performing jobs — count applications per job
    const countByJob = {};
    allApplications.forEach((a) => {
      const jid = a.jobId?._id?.toString();
      if (jid) countByJob[jid] = (countByJob[jid] || 0) + 1;
    });

    const topPerformingJobs = myJobs
      .map((j) => ({ ...j, applicationsCount: countByJob[j._id.toString()] || 0 }))
      .sort((a, b) => b.applicationsCount - a.applicationsCount)
      .slice(0, 3);

    // Recent 10 applications
    const recentApplications = allApplications.slice(0, 10);

    res.json({
      totalJobsPosted: myJobs.length,
      activeJobsCount: myJobs.filter((j) => j.isActive).length,
      totalApplicationsReceived: allApplications.length,
      applicationsByStatus,
      recentApplications,
      topPerformingJobs,
    });
  } catch (error) {
    console.error('getRecruiterDashboard error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching recruiter dashboard. Please try again.' });
  }
};
