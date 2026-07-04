import mongoose from 'mongoose';

// Tracks every admin action taken against a user account, for compliance
// and so admins can see what other admins have done.
const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['suspend', 'activate', 'delete', 'add_note', 'create_admin'],
      required: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Free-form snapshot of what changed — shape varies by action, e.g.
    // { reason: 'Spam account' } for suspend, { hardDelete: true } for delete.
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    reason: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

auditLogSchema.index({ adminId: 1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ targetUserId: 1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
