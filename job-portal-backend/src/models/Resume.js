import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    extractedText: {
      type: String,
      default: '',
    },
    parsedData: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      skills: { type: [String], default: [] },
      experience: { type: Number, default: 0 },
      education: { type: String, default: '' },
      summary: { type: String, default: '' },
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    // Whether recruiters can see this resume at all (preview or full).
    // Seeker-only actions (own dashboard, download) never check this flag.
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Resume = mongoose.model('Resume', resumeSchema);
export default Resume;
