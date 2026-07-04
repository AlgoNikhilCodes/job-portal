import express from 'express';
import protect from '../middleware/auth.js';
import { uploadSingle } from '../middleware/uploadMiddleware.js';
import {
  uploadResume,
  getResume,
  downloadResume,
  downloadResumeForRecruiter,
  getResumePreview,
  getResumeForApplication,
  deleteResume,
  updateResumePublicity,
} from '../controllers/resumeController.js';

const router = express.Router();

// Static/specific routes before dynamic /:seekerId ones — same convention
// used across this codebase's other route files.
router.post('/upload', protect, uploadSingle('resume'), uploadResume);
router.get('/download', protect, downloadResume);
router.put('/public', protect, updateResumePublicity);

router.get('/preview/:seekerId', getResumePreview); // public — recruiter/anyone can view a public preview
router.get('/application/:seekerId', protect, getResumeForApplication); // recruiter-only, full detail
router.get('/download/:seekerId', protect, downloadResumeForRecruiter); // recruiter-only PDF download

router.get('/', protect, getResume);
router.delete('/', protect, deleteResume);

export default router;
