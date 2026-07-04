import express from 'express';
import { getSeekerDashboard, getRecruiterDashboard } from '../controllers/dashboardController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.get('/seeker', protect, getSeekerDashboard);
router.get('/recruiter', protect, getRecruiterDashboard);

export default router;
