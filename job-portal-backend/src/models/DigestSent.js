import mongoose from 'mongoose';

// Historical record of every digest email sent — separate from JobAlert
// (which only tracks the *most recent* send) so seekers can see a full
// history and we can debug delivery issues after the fact.
const digestSentSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    jobAlertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobAlert',
      required: true,
    },
    jobIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Job',
      default: [],
    },
    jobCount: {
      type: Number,
      default: 0,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    emailAddress: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'bounced'],
      default: 'sent',
    },
    // Populated only when status === 'failed', for debugging without
    // needing to dig through server logs.
    errorMessage: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

digestSentSchema.index({ seekerId: 1, sentAt: -1 });

const DigestSent = mongoose.model('DigestSent', digestSentSchema);
export default DigestSent;
