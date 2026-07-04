import mongoose from 'mongoose';

const seekerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    phone: { type: String, trim: true },
    location: { type: String, trim: true },
    experience: { type: Number, min: 0 }, // years
    skills: { type: [String], default: [] },
    resumeLink: { type: String, trim: true },
    summary: { type: String, trim: true },
    education: { type: String, trim: true },
    // Populated automatically when a resume PDF is parsed (Day 8) — kept
    // separate from the manually-edited `skills`/`experience` fields above
    // so we never silently overwrite something the seeker typed themselves
    // without a clear signal of where the data came from.
    resumeLastUpdated: { type: Date, default: null },
    resumeParsedSkills: { type: [String], default: [] },
    resumeExperience: { type: Number, default: null },
  },
  { timestamps: true }
);

const SeekerProfile = mongoose.model('SeekerProfile', seekerProfileSchema);
export default SeekerProfile;
