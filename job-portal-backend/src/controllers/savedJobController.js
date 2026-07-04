import SavedJob from '../models/SavedJob.js';
import Job from '../models/Job.js';

const PAGE_SIZE = 10;

// POST /api/saved-jobs
export const saveJob = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can save jobs' });
    }

    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ message: 'Please select a job to save.' });

    const job = await Job.findOne({ _id: jobId, isActive: true });
    if (!job) return res.status(404).json({ message: 'Job not found or no longer active' });

    const saved = await SavedJob.create({ seekerId: req.user._id, jobId });
    res.status(201).json(saved);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Job already saved' });
    }
    console.error('saveJob error:', error);
    res.status(500).json({ message: 'Something went wrong while saving job. Please try again.' });
  }
};

// DELETE /api/saved-jobs/:jobId
export const removeSavedJob = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can unsave jobs' });
    }

    const deleted = await SavedJob.findOneAndDelete({
      seekerId: req.user._id,
      jobId: req.params.jobId,
    });

    if (!deleted) return res.status(404).json({ message: 'Saved job not found' });

    res.json({ message: 'Job removed from saved list' });
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'Saved job not found' });
    console.error('removeSavedJob error:', error);
    res.status(500).json({ message: 'Something went wrong while removing saved job. Please try again.' });
  }
};

// GET /api/saved-jobs
export const getMySavedJobs = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can view saved jobs' });
    }

    const { page = 1, sort = '-createdAt' } = req.query;
    const currentPage = Math.max(1, parseInt(page));

    // Allowed sort fields — map frontend sort keys to Mongoose paths
    const sortMap = {
      '-savedAt': '-createdAt',
      'title': 'jobId.title',   // NOTE: can't sort by populated field — we sort after populate
      '-salary': '-jobId.salaryMax',
    };
    const mongoSort = sortMap[sort] || '-createdAt';

    const [savedJobs, totalCount] = await Promise.all([
      SavedJob.find({ seekerId: req.user._id })
        .populate({
          path: 'jobId',
          select: 'title location salaryMin salaryMax jobType recruiterId isActive',
          populate: { path: 'recruiterId', select: 'name' },
        })
        .sort(mongoSort.startsWith('jobId') ? '-createdAt' : mongoSort) // fallback for nested sorts
        .skip((currentPage - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      SavedJob.countDocuments({ seekerId: req.user._id }),
    ]);

    // Filter out saved jobs where the job was since deleted (isActive: false)
    const active = savedJobs.filter((s) => s.jobId?.isActive !== false);

    // Client-side sort for title / salary (Mongoose can't sort by populated fields)
    if (sort === 'title') {
      active.sort((a, b) => (a.jobId?.title || '').localeCompare(b.jobId?.title || ''));
    }
    if (sort === '-salary') {
      active.sort((a, b) => (b.jobId?.salaryMax || 0) - (a.jobId?.salaryMax || 0));
    }

    res.json({
      savedJobs: active,
      totalCount,
      page: currentPage,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
    });
  } catch (error) {
    console.error('getMySavedJobs error:', error);
    res.status(500).json({ message: 'Something went wrong while fetching saved jobs. Please try again.' });
  }
};

// GET /api/saved-jobs/check/:jobId
export const checkIfSaved = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.json({ isSaved: false });
    }

    const exists = await SavedJob.exists({
      seekerId: req.user._id,
      jobId: req.params.jobId,
    });

    res.json({ isSaved: !!exists });
  } catch (error) {
    res.json({ isSaved: false }); // graceful degradation
  }
};
