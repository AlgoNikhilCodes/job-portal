import Job from '../models/Job.js';
import RecruiterProfile from '../models/RecruiterProfile.js';

const PAGE_SIZE = 10;

// GET /api/search — full-text search with filters
export const advancedSearch = async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      q, search,
      location, minSalary, maxSalary,
      jobType, experienceRequired,
      page = 1,
    } = req.query;

    const keyword = (q || search || '').trim();
    const currentPage = Math.max(1, parseInt(page));

    const filter = { isActive: true };

    if (keyword) {
      // Use MongoDB text index for relevance-ranked full-text search
      filter.$text = { $search: keyword };
    }
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
      filter.salaryMin = { ...(filter.salaryMin || {}), $lte: Number(maxSalary) };
    }
    if (experienceRequired !== undefined && experienceRequired !== '') {
      filter.experienceRequired = { $lte: Number(experienceRequired) };
    }

    // When using $text, sort by text relevance score; otherwise sort by date
    const projection = keyword ? { score: { $meta: 'textScore' } } : {};
    const sort = keyword ? { score: { $meta: 'textScore' } } : { createdAt: -1 };

    const [jobs, totalCount] = await Promise.all([
      Job.find(filter, projection)
        .populate('recruiterId', 'name email')
        .sort(sort)
        .skip((currentPage - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      Job.countDocuments(filter),
    ]);

    // Optionally attach recruiter company profiles for richer results
    const recruiterIds = [...new Set(jobs.map((j) => j.recruiterId?._id?.toString()).filter(Boolean))];
    const profiles = await RecruiterProfile.find({ userId: { $in: recruiterIds } });
    const profileMap = Object.fromEntries(profiles.map((p) => [p.userId.toString(), p]));

    const enriched = jobs.map((job) => ({
      ...job.toObject(),
      recruiterProfile: profileMap[job.recruiterId?._id?.toString()] || null,
    }));

    res.json({
      jobs: enriched,
      totalCount,
      page: currentPage,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
      limit: PAGE_SIZE,
      searchTime: ((Date.now() - startTime) / 1000).toFixed(2),
      keyword,
    });
  } catch (error) {
    console.error('advancedSearch error:', error);
    res.status(500).json({ message: 'Something went wrong during search. Please try again' });
  }
};

// GET /api/search/suggestions?q=... — autocomplete suggestions
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (q.trim().length < 2) {
      return res.json({ suggestions: [] });
    }

    // Grab up to 8 distinct active job titles matching the prefix
    const jobs = await Job.find(
      { isActive: true, title: { $regex: q.trim(), $options: 'i' } },
      { title: 1 }
    ).limit(8);

    // Deduplicate titles (there may be many "React Developer" postings)
    const seen = new Set();
    const suggestions = [];
    for (const j of jobs) {
      const t = j.title.trim();
      if (!seen.has(t)) {
        seen.add(t);
        suggestions.push(t);
      }
    }

    res.json({ suggestions: suggestions.slice(0, 5) });
  } catch (error) {
    console.error('getSearchSuggestions error:', error);
    res.json({ suggestions: [] }); // graceful degradation
  }
};
