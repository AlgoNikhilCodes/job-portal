import express from 'express';
import protect from '../middleware/auth.js';
import {
  createApplication,
  getMyApplications,
  getApplicationsForJob,
  updateApplicationStatus,
  getApplicationStats,
  bulkUpdateApplicationStatus,
  addApplicationNote,
} from '../controllers/applicationController.js';

const router = express.Router();

// Static routes before param routes (avoids route collision) — /bulk/status
// in particular MUST come before /:applicationId or Express would try to
// treat "bulk" as an applicationId.
router.get('/my-applications', protect, getMyApplications);
router.get('/stats/job/:jobId', protect, getApplicationStats);
router.get('/job/:jobId', protect, getApplicationsForJob);
router.put('/bulk/status', protect, bulkUpdateApplicationStatus);

router.post('/', protect, createApplication);
router.put('/:applicationId', protect, updateApplicationStatus);
router.put('/:id/note', protect, addApplicationNote);

export default router;
