import express from 'express';
import { getRecommendedJobs, trackJobView } from '../controllers/recommendationController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.get('/jobs', protect, getRecommendedJobs);
router.post('/view/:jobId', protect, trackJobView);

export default router;
