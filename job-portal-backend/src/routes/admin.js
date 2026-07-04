import express from 'express';
import {
  getDashboardStats,
  getGrowthTrends,
  getAllUsers,
  getUserDetails,
  suspendUser,
  activateUser,
  deleteUser,
  addAdminNote,
  getAllJobs,
  getAllApplications,
  getApplicationStats,
  getSystemHealth,
  triggerJobAlerts,
} from '../controllers/adminController.js';
import { getAuditLogs } from '../controllers/auditController.js';

const router = express.Router();

// Mounted in server.js behind `protect` + `adminOnly` — every route here is
// already guaranteed an authenticated, active, admin-role req.user.
router.get('/stats', getDashboardStats);
router.get('/trends', getGrowthTrends);

router.get('/users', getAllUsers);
router.get('/users/:userId', getUserDetails);
router.put('/users/:userId/suspend', suspendUser);
router.put('/users/:userId/activate', activateUser);
router.put('/users/:userId/note', addAdminNote);
router.delete('/users/:userId', deleteUser);

router.get('/jobs', getAllJobs);

router.get('/applications/stats', getApplicationStats); // before /:applicationId-style routes would go, if any existed
router.get('/applications', getAllApplications);

router.get('/health', getSystemHealth);

router.get('/audit-logs', getAuditLogs);

// QA fix #3 — manual trigger for job alert digests (dev/testing convenience,
// doesn't require waiting for the real 9 AM/Monday cron schedule).
router.post('/test/trigger-job-alerts', triggerJobAlerts);

export default router;
