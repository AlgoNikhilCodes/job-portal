import Job from '../models/Job.js';
import Application from '../models/Application.js';
import SavedJob from '../models/SavedJob.js';
import SeekerProfile from '../models/SeekerProfile.js';
import RecruiterProfile from '../models/RecruiterProfile.js';

// GET /api/recommendations/jobs
export const getRecommendedJobs = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Seeker access only' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 10, 20);
    const seekerId = req.user._id;

    // Get seeker profile for skills
    const seekerProfile = await SeekerProfile.findOne({ userId: seekerId }).lean();
    const skills = seekerProfile?.skills || [];

    if (skills.length === 0) {
      return res.json({
        recommendedJobs: [],
        reason: 'Complete your profile and add skills to get personalized job recommendations.',
        totalCount: 0,
      });
    }

    // Exclude already-applied and saved jobs
    const [appliedDocs, savedDocs] = await Promise.all([
      Application.find({ seekerId }).select('jobId').lean(),
      SavedJob.find({ seekerId }).select('jobId').lean(),
    ]);

    const excludeIds = [
      ...appliedDocs.map((a) => a.jobId),
      ...savedDocs.map((s) => s.jobId),
    ];

    // Find matching active jobs
    const candidates = await Job.find({
      isActive: true,
      _id: { $nin: excludeIds },
      skillsRequired: { $in: skills },
    })
      .populate('recruiterId', 'name email')
      .lean();

    // Attach recruiter profiles
    const recruiterIds = [...new Set(candidates.map((j) => j.recruiterId?._id?.toString()).filter(Boolean))];
    const recruiterProfiles = await RecruiterProfile.find({
      userId: { $in: recruiterIds },
    }).lean();
    const profileMap = Object.fromEntries(recruiterProfiles.map((p) => [p.userId.toString(), p]));

    // Score: number of matching skills (descending), then newest first
    const lowerSkills = skills.map((s) => s.toLowerCase());
    const scored = candidates.map((job) => {
      const matchedSkills = (job.skillsRequired || []).filter((s) =>
        lowerSkills.includes(s.toLowerCase())
      );
      return {
        ...job,
        recruiterProfile: profileMap[job.recruiterId?._id?.toString()] || null,
        matchedSkills,
        matchScore: matchedSkills.length,
        matchPercent: job.skillsRequired?.length
          ? Math.round((matchedSkills.length / job.skillsRequired.length) * 100)
          : 0,
      };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore || new Date(b.createdAt) - new Date(a.createdAt));
    const recommendedJobs = scored.slice(0, limit);

    const topSkills = skills.slice(0, 3).join(', ');
    const reason = `Based on your skills in ${topSkills}${skills.length > 3 ? ` and ${skills.length - 3} more` : ''}`;

    res.json({
      recommendedJobs,
      reason,
      totalCount: scored.length,
      skillsUsed: skills,
    });
  } catch (error) {
    console.error('getRecommendedJobs error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching recommendations. Please try again.' });
  }
};

// POST /api/recommendations/view/:jobId  — lightweight view tracking (fire-and-forget)
export const trackJobView = async (req, res) => {
  try {
    // Minimal tracking — just acknowledge. Future: write to JobView collection.
    const { jobId } = req.params;
    const userId = req.user._id;
    // console.log(`View tracked: user=${userId} job=${jobId}`);
    res.status(204).end();
  } catch (error) {
    console.error('trackJobView error:', error);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};
