import Job from '../models/Job.js';
import RecruiterProfile from '../models/RecruiterProfile.js';
import Application from '../models/Application.js';

const PAGE_SIZE = 10;

// Helper: ensure the requesting user owns the job
const assertOwnership = (job, userId) => {
  if (job.recruiterId.toString() !== userId.toString()) {
    const err = new Error('You are not authorized to modify this job');
    err.status = 403;
    throw err;
  }
};

// POST /api/jobs
export const createJob = async (req, res) => {
  try {
    if (req.user.userType !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can post jobs' });
    }

    const {
      title,
      description,
      salaryMin,
      salaryMax,
      location,
      jobType,
      experienceRequired,
      skillsRequired,
    } = req.body;

    // Parse comma-separated skills string or accept array
    const skills =
      typeof skillsRequired === 'string'
        ? skillsRequired.split(',').map((s) => s.trim()).filter(Boolean)
        : skillsRequired || [];

    const job = await Job.create({
      recruiterId: req.user._id,
      title,
      description,
      salaryMin: salaryMin || undefined,
      salaryMax: salaryMax || undefined,
      location,
      jobType: jobType || 'Full-time',
      experienceRequired: experienceRequired || 0,
      skillsRequired: skills,
    });

    res.status(201).json(job);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => ({ field: e.path, message: e.message }));
      return res.status(400).json({ message: 'Please fix the highlighted fields and try again.', errors });
    }
    console.error(`[${new Date().toISOString()}] createJob error:`, error);
    res.status(500).json({ message: 'Something went wrong while posting your job. Please try again.' });
  }
};

// GET /api/jobs — public, with filtering & pagination
export const getJobs = async (req, res) => {
  try {
    const { page = 1, location, minSalary, maxSalary, jobType, search } = req.query;
    const currentPage = Math.max(1, parseInt(page));

    const filter = { isActive: true };

    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }
    if (jobType) {
      filter.jobType = jobType;
    }
    if (minSalary) {
      filter.salaryMax = { $gte: Number(minSalary) };
    }
    if (maxSalary) {
      filter.salaryMin = { ...filter.salaryMin, $lte: Number(maxSalary) };
    }
    // Keyword search: use text index if available, else regex on title
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [jobs, totalCount] = await Promise.all([
      Job.find(filter)
        .populate('recruiterId', 'name email')
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      Job.countDocuments(filter),
    ]);

    res.json({
      jobs,
      totalCount,
      page: currentPage,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
      limit: PAGE_SIZE,
    });
  } catch (error) {
    console.error('getJobs error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching jobs. Please try again.' });
  }
};

// GET /api/jobs/recruiter/my-jobs — protected, recruiter only
export const getMyJobs = async (req, res) => {
  try {
    if (req.user.userType !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can view their jobs' });
    }

    const { page = 1 } = req.query;
    const currentPage = Math.max(1, parseInt(page));

    const filter = { recruiterId: req.user._id };

    const [jobs, totalCount] = await Promise.all([
      Job.find(filter)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      Job.countDocuments(filter),
    ]);

    // Attach application count to each job
    const jobIds = jobs.map((j) => j._id);
    const appCounts = await Application.aggregate([
      { $match: { jobId: { $in: jobIds } } },
      { $group: { _id: '$jobId', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(appCounts.map((a) => [a._id.toString(), a.count]));
    const jobsWithCounts = jobs.map((j) => ({
      ...j.toObject(),
      applicationCount: countMap[j._id.toString()] || 0,
    }));

    res.json({
      jobs: jobsWithCounts,
      totalCount,
      page: currentPage,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
      limit: PAGE_SIZE,
    });
  } catch (error) {
    console.error('getMyJobs error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching your jobs. Please try again.' });
  }
};

// GET /api/jobs/:id — public
export const getJobById = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, isActive: true }).populate(
      'recruiterId',
      'name email'
    );

    if (!job) {
      return res.status(404).json({ message: 'Job not found. Please check the URL and try again.' });
    }

    // Attach recruiter company profile and total application count
    const [recruiterProfile, applicationCount] = await Promise.all([
      RecruiterProfile.findOne({ userId: job.recruiterId._id }),
      Application.countDocuments({ jobId: job._id }),
    ]);

    res.json({ ...job.toObject(), recruiterProfile, applicationCount });
  } catch (error) {
    // Invalid ObjectId format
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Job not found. Please check the URL and try again.' });
    }
    console.error(`[${new Date().toISOString()}] getJobById error:`, error);
    res.status(500).json({ message: 'Something went wrong while loading this job. Please try again.' });
  }
};

// PUT /api/jobs/:id — protected, owner only
export const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job || !job.isActive) {
      return res.status(404).json({ message: 'Job not found. Please check the URL and try again.' });
    }

    assertOwnership(job, req.user._id);

    const allowedFields = [
      'title', 'description', 'salaryMin', 'salaryMax',
      'location', 'jobType', 'experienceRequired', 'skillsRequired',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        job[field] = req.body[field];
      }
    });

    // Handle comma-separated skills from form input
    if (typeof req.body.skillsRequired === 'string') {
      job.skillsRequired = req.body.skillsRequired
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    await job.save();
    res.json(job);
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ message: error.message });
    }
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => ({ field: e.path, message: e.message }));
      return res.status(400).json({ message: 'Please fix the highlighted fields and try again.', errors });
    }
    console.error(`[${new Date().toISOString()}] updateJob error:`, error);
    res.status(500).json({ message: 'Something went wrong while updating your job. Please try again.' });
  }
};

// DELETE /api/jobs/:id — soft delete, protected, owner only
export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job || !job.isActive) {
      return res.status(404).json({ message: 'Job not found. Please check the URL and try again.' });
    }

    assertOwnership(job, req.user._id);

    job.isActive = false;
    await job.save();

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ message: error.message });
    }
    console.error('deleteJob error:', error);
    res.status(500).json({ message: 'Something went wrong while deleting job. Please try again.' });
  }
};
