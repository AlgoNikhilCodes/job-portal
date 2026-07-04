import mongoose from 'mongoose';

const savedJobSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

// Prevent saving the same job twice
savedJobSchema.index({ seekerId: 1, jobId: 1 }, { unique: true });
savedJobSchema.index({ seekerId: 1 });

const SavedJob = mongoose.model('SavedJob', savedJobSchema);
export default SavedJob;
