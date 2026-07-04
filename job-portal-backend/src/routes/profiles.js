import express from 'express';
import protect from '../middleware/auth.js';
import {
  getSeekerProfile,
  updateSeekerProfile,
  getRecruiterProfile,
  updateRecruiterProfile,
} from '../controllers/profileController.js';

const router = express.Router();

router.get('/seeker/:userId', getSeekerProfile);
router.put('/seeker', protect, updateSeekerProfile);

router.get('/recruiter/:userId', getRecruiterProfile);
router.put('/recruiter', protect, updateRecruiterProfile);

export default router;
