import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    status: {
      type: String,
      enum: ['Applied', 'Shortlisted', 'Rejected', 'Accepted'],
      default: 'Applied',
    },
    recruiterNotes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Prevent a seeker from applying to the same job twice
applicationSchema.index({ seekerId: 1, jobId: 1 }, { unique: true });

// Fast lookups by job and by seeker
applicationSchema.index({ jobId: 1 });
applicationSchema.index({ seekerId: 1 });
applicationSchema.index({ status: 1 });

const Application = mongoose.model('Application', applicationSchema);
export default Application;
