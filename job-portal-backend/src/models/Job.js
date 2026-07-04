import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      minlength: [20, 'Description must be at least 20 characters'],
    },
    salaryMin: {
      type: Number,
      min: [0, 'Salary cannot be negative'],
    },
    salaryMax: {
      type: Number,
      min: [0, 'Salary cannot be negative'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    jobType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Remote'],
      default: 'Full-time',
    },
    experienceRequired: {
      type: Number,
      default: 0,
      min: [0, 'Experience cannot be negative'],
    },
    skillsRequired: {
      type: [String],
      default: [],
    },
    // Soft delete flag — we never hard-delete jobs
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes for common query patterns
jobSchema.index({ recruiterId: 1 });
jobSchema.index({ isActive: 1 });
jobSchema.index({ title: 'text', description: 'text' }); // full-text search

const Job = mongoose.model('Job', jobSchema);
export default Job;
