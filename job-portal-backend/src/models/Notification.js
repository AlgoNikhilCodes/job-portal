import mongoose from 'mongoose';

const NOTIFICATION_TYPES = [
  'application:submitted',
  'application:status_changed',
  'job:new_matching',
  'dashboard:application_count_changed',
];

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    // Free-form payload — jobId, jobTitle, applicantId, status, etc.
    // Kept as Mixed since shape varies by notification type.
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    // Where the frontend should navigate to when the notification is clicked
    link: {
      type: String,
      default: null,
    },
    // Optional TTL — old notifications can be auto-purged by a Mongo TTL index
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Most common query: "give me this user's notifications, newest first,
// optionally filtered to unread only" — this compound index serves both.
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// TTL index: MongoDB automatically deletes documents once expiresAt passes.
// expireAfterSeconds: 0 means "expire exactly at the stored date".
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
