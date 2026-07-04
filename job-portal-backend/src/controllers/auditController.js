import AuditLog from '../models/AuditLog.js';

const ts = () => new Date().toISOString();

// GET /api/admin/audit-logs?page=&limit=&action=&userId=
export const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { action, userId } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (userId) filter.$or = [{ adminId: userId }, { targetUserId: userId }];

    const [logs, totalCount] = await Promise.all([
      AuditLog.find(filter)
        .populate('adminId', 'name email')
        .populate('targetUserId', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      logs: logs.map((l) => ({
        id: l._id,
        admin: l.adminId ? { id: l.adminId._id, name: l.adminId.name, email: l.adminId.email } : null,
        action: l.action,
        targetUser: l.targetUserId ? { id: l.targetUserId._id, name: l.targetUserId.name, email: l.targetUserId.email } : null,
        changes: l.changes,
        reason: l.reason,
        timestamp: l.timestamp,
      })),
      totalCount,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    });
  } catch (error) {
    console.error(`[${ts()}] getAuditLogs error:`, error);
    res.status(500).json({ message: 'Something went wrong while loading audit logs. Please try again.' });
  }
};
