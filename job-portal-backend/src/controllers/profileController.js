import SeekerProfile from '../models/SeekerProfile.js';
import RecruiterProfile from '../models/RecruiterProfile.js';
import Job from '../models/Job.js';

// ─── Seeker Profile ───────────────────────────────────────────────────────────

// GET /api/profiles/seeker/:userId — public
export const getSeekerProfile = async (req, res) => {
  try {
    const profile = await SeekerProfile.findOne({ userId: req.params.userId }).populate(
      'userId',
      'name email'
    );
    if (!profile) return res.status(404).json({ message: 'This seeker has not created a profile yet.' });
    res.json(profile);
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'Profile not found. Please check the URL and try again.' });
    console.error(`[${new Date().toISOString()}] getSeekerProfile error:`, error);
    res.status(500).json({ message: 'Something went wrong while loading this profile. Please try again.' });
  }
};

// PUT /api/profiles/seeker — protected, seeker only
export const updateSeekerProfile = async (req, res) => {
  try {
    if (req.user.userType !== 'seeker') {
      return res.status(403).json({ message: 'Only seekers can update seeker profile' });
    }

    const { phone, location, experience, skills, resumeLink, summary, education } = req.body;

    // Parse comma-separated skills or accept array
    const parsedSkills =
      typeof skills === 'string'
        ? skills.split(',').map((s) => s.trim()).filter(Boolean)
        : Array.isArray(skills)
        ? skills
        : undefined;

    const update = {};
    if (phone !== undefined) update.phone = phone;
    if (location !== undefined) update.location = location;
    if (experience !== undefined) update.experience = Number(experience);
    if (parsedSkills !== undefined) update.skills = parsedSkills;
    if (resumeLink !== undefined) update.resumeLink = resumeLink;
    if (summary !== undefined) update.summary = summary;
    if (education !== undefined) update.education = education;

    // upsert: creates profile on first update, updates on subsequent calls
    const profile = await SeekerProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    ).populate('userId', 'name email');

    res.json(profile);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => ({ field: e.path, message: e.message }));
      return res.status(400).json({ message: 'Please fix the highlighted fields and try again.', errors });
    }
    console.error(`[${new Date().toISOString()}] updateSeekerProfile error:`, error);
    res.status(500).json({ message: 'Something went wrong while saving your profile. Please try again.' });
  }
};

// ─── Recruiter Profile ────────────────────────────────────────────────────────

// GET /api/profiles/recruiter/:userId — public
export const getRecruiterProfile = async (req, res) => {
  try {
    const [profile, jobCount] = await Promise.all([
      RecruiterProfile.findOne({ userId: req.params.userId }).populate('userId', 'name email'),
      Job.countDocuments({ recruiterId: req.params.userId, isActive: true }),
    ]);

    if (!profile) return res.status(404).json({ message: 'This recruiter has not created a company profile yet.' });

    res.json({ ...profile.toObject(), jobCount });
  } catch (error) {
    if (error.name === 'CastError') return res.status(404).json({ message: 'Profile not found. Please check the URL and try again.' });
    console.error(`[${new Date().toISOString()}] getRecruiterProfile error:`, error);
    res.status(500).json({ message: 'Something went wrong while loading this profile. Please try again.' });
  }
};

// PUT /api/profiles/recruiter — protected, recruiter only
export const updateRecruiterProfile = async (req, res) => {
  try {
    if (req.user.userType !== 'recruiter') {
      return res.status(403).json({ message: 'Only recruiters can update recruiter profile' });
    }

    const {
      companyName, companyLogo, companyDescription,
      companyWebsite, location, companySize,
    } = req.body;

    const update = {};
    if (companyName !== undefined) update.companyName = companyName;
    if (companyLogo !== undefined) update.companyLogo = companyLogo;
    if (companyDescription !== undefined) update.companyDescription = companyDescription;
    if (companyWebsite !== undefined) update.companyWebsite = companyWebsite;
    if (location !== undefined) update.location = location;
    if (companySize !== undefined) update.companySize = companySize;

    const profile = await RecruiterProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    ).populate('userId', 'name email');

    res.json(profile);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => ({ field: e.path, message: e.message }));
      return res.status(400).json({ message: 'Please fix the highlighted fields and try again.', errors });
    }
    console.error(`[${new Date().toISOString()}] updateRecruiterProfile error:`, error);
    res.status(500).json({ message: 'Something went wrong while saving your company profile. Please try again.' });
  }
};
