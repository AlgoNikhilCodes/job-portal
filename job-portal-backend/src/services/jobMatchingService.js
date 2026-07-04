import Job from '../models/Job.js';
import Application from '../models/Application.js';
import SavedJob from '../models/SavedJob.js';

const MAX_RESULTS = 10;

/**
 * Score a single job against a seeker's alert preferences.
 * Higher score = better match. Mirrors the weighting from the spec:
 * skills (30), location (25), salary (25), job type (20).
 * A job doesn't need to match every criterion — this is a "best effort"
 * relevance score, not a hard filter (the hard filters happen in the query
 * itself, see findMatchingJobs below).
 */
const scoreJob = (job, preferences) => {
  let score = 0;
  const { skills = [], locations = [], minSalary, jobTypes = [] } = preferences;

  const lowerSkills = skills.map((s) => s.toLowerCase());
  const jobSkills = (job.skillsRequired || []).map((s) => s.toLowerCase());
  const matchedSkills = jobSkills.filter((s) => lowerSkills.includes(s));

  if (matchedSkills.length > 0) score += 30;
  if (locations.some((loc) => job.location?.toLowerCase().includes(loc.toLowerCase()))) score += 25;
  if (minSalary && job.salaryMin && job.salaryMin >= minSalary) score += 25;
  if (jobTypes.length > 0 && jobTypes.includes(job.jobType)) score += 20;

  // Bonus: more matched skills = more relevant, small tiebreaker nudge
  score += Math.min(matchedSkills.length * 2, 10);

  return { score, matchedSkills };
};

/**
 * Finds jobs matching a seeker's job alert preferences, excluding jobs
 * they've already applied to or saved (no point re-recommending those).
 *
 * Matching rules (per spec):
 *   - Skills: job requires ANY of the seeker's skills (OR, not AND)
 *   - Location: job location is one of the seeker's preferred locations
 *   - Salary: job's salaryMin >= alert's minSalary (when both are set)
 *   - Job type: job type is one of the seeker's preferred types
 *   - Experience: job's required experience <= seeker's experience level
 *
 * None of these are individually required (a job missing "location" but
 * strong on skills is still worth surfacing) — but at least ONE dimension
 * must match, otherwise the job wouldn't be considered "matching" at all.
 */
export const findMatchingJobs = async (jobAlert, excludeJobIds = []) => {
  const { preferences } = jobAlert;
  const { skills = [], locations = [], maxSalary, jobTypes = [], experienceLevel } = preferences;

  const filter = { isActive: true };
  if (excludeJobIds.length > 0) {
    filter._id = { $nin: excludeJobIds };
  }

  // Build an $or of whichever preference dimensions the seeker actually set,
  // so an alert with only "skills" filled in still returns results instead
  // of matching nothing.
  const orClauses = [];
  if (skills.length > 0) {
    orClauses.push({ skillsRequired: { $in: skills } });
  }
  if (locations.length > 0) {
    orClauses.push({
      $or: locations.map((loc) => ({ location: { $regex: loc, $options: 'i' } })),
    });
  }
  if (jobTypes.length > 0) {
    orClauses.push({ jobType: { $in: jobTypes } });
  }
  if (orClauses.length > 0) {
    filter.$or = orClauses;
  }

  if (typeof maxSalary === 'number') {
    filter.$or = filter.$or; // keep existing $or intact
    filter.salaryMin = { ...(filter.salaryMin || {}), $lte: maxSalary };
  }
  if (typeof experienceLevel === 'number') {
    filter.experienceRequired = { $lte: experienceLevel };
  }

  const candidates = await Job.find(filter)
    .populate('recruiterId', 'name')
    .limit(100) // cap the candidate pool before scoring for performance
    .lean();

  const scored = candidates
    .map((job) => {
      const { score, matchedSkills } = scoreJob(job, preferences);
      return { ...job, matchScore: score, matchedSkills, matchPercent: Math.min(score, 100) };
    })
    .filter((j) => j.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);

  return scored.slice(0, MAX_RESULTS);
};

/**
 * Convenience wrapper used by both the "send test email now" endpoint and
 * the scheduled digest job — excludes jobs the seeker already applied to or
 * saved, since re-recommending those adds no value.
 */
export const getRecommendedJobsForDigest = async (jobAlert) => {
  const seekerId = jobAlert.seekerId;

  const [appliedDocs, savedDocs] = await Promise.all([
    Application.find({ seekerId }).select('jobId').lean(),
    SavedJob.find({ seekerId }).select('jobId').lean(),
  ]);

  const excludeJobIds = [
    ...appliedDocs.map((a) => a.jobId),
    ...savedDocs.map((s) => s.jobId),
  ];

  return findMatchingJobs(jobAlert, excludeJobIds);
};

export default { findMatchingJobs, getRecommendedJobsForDigest };
