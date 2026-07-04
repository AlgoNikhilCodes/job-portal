import express from 'express';
import protect from '../middleware/auth.js';
import {
  createOrUpdateJobAlert,
  getJobAlert,
  updateJobAlertFrequency,
  testJobAlert,
  unsubscribeJobAlert,
  getDigestHistory,
} from '../controllers/jobAlertController.js';

const router = express.Router();

// Public route — no auth. Must be declared before any dynamic protected
// routes that could otherwise shadow it, though none currently conflict.
router.get('/unsubscribe/:token', unsubscribeJobAlert);

// Static routes before /: to keep with this codebase's routing convention
router.get('/history', protect, getDigestHistory);
router.put('/frequency', protect, updateJobAlertFrequency);
router.post('/test', protect, testJobAlert);

router.put('/', protect, createOrUpdateJobAlert);
router.get('/', protect, getJobAlert);

export default router;
