import express from 'express';
import protect from '../middleware/auth.js';
import {
  saveJob,
  removeSavedJob,
  getMySavedJobs,
  checkIfSaved,
} from '../controllers/savedJobController.js';

const router = express.Router();

// Static routes before param routes to avoid collision
router.get('/check/:jobId', protect, checkIfSaved);   // GET /api/saved-jobs/check/:jobId
router.get('/', protect, getMySavedJobs);              // GET /api/saved-jobs
router.post('/', protect, saveJob);                    // POST /api/saved-jobs
router.delete('/:jobId', protect, removeSavedJob);    // DELETE /api/saved-jobs/:jobId

export default router;
