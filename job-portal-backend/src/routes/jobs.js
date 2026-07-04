import express from 'express';
import protect from '../middleware/auth.js';
import {
  createJob,
  getJobs,
  getJobById,
  getMyJobs,
  updateJob,
  deleteJob,
} from '../controllers/jobController.js';

const router = express.Router();

// Static routes MUST be declared before /:id param routes
// otherwise Express will match "recruiter" as the :id value
router.get('/recruiter/my-jobs', protect, getMyJobs); // GET /api/jobs/recruiter/my-jobs
router.post('/', protect, createJob);                  // POST /api/jobs
router.get('/', getJobs);                              // GET  /api/jobs

// Dynamic param routes
router.get('/:id', getJobById);                        // GET  /api/jobs/:id
router.put('/:id', protect, updateJob);                // PUT  /api/jobs/:id
router.delete('/:id', protect, deleteJob);             // DELETE /api/jobs/:id

export default router;
