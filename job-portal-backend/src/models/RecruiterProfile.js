import mongoose from 'mongoose';

const recruiterProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    companyName: { type: String, trim: true },
    companyLogo: { type: String, trim: true },
    companyDescription: { type: String, trim: true },
    companyWebsite: { type: String, trim: true },
    location: { type: String, trim: true },
    companySize: {
      type: String,
      enum: ['1-10', '10-50', '50-200', '200-500', '500+', ''],
      default: '',
    },
  },
  { timestamps: true }
);

const RecruiterProfile = mongoose.model('RecruiterProfile', recruiterProfileSchema);
export default RecruiterProfile;
