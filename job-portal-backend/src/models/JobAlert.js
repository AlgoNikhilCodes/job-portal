import mongoose from 'mongoose';
import crypto from 'crypto';

const jobAlertSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
    preferences: {
      skills: { type: [String], default: [] },
      locations: { type: [String], default: [] },
      minSalary: { type: Number, min: 0 },
      maxSalary: { type: Number, min: 0 },
      jobTypes: {
        type: [String],
        enum: ['Full-time', 'Part-time', 'Contract', 'Remote'],
        default: [],
      },
      experienceLevel: { type: Number, min: 0 },
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'never'],
      default: 'daily',
    },
    emailAddress: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    lastDigestSent: {
      type: Date,
      default: null,
    },
    lastDigestJobsCount: {
      type: Number,
      default: 0,
    },
    // Used to build the one-click unsubscribe link in digest emails —
    // random and unique so it can't be guessed/enumerated.
    unsubscribeToken: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(24).toString('hex'),
    },
  },
  { timestamps: true }
);

// seekerId already gets a unique index from `unique: true` above.
// These two support the scheduler's "find alerts due for a digest" queries.
jobAlertSchema.index({ isEnabled: 1, frequency: 1 });

const JobAlert = mongoose.model('JobAlert', jobAlertSchema);
export default JobAlert;
