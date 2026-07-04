import express from 'express';
import protect from '../middleware/auth.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from '../controllers/notificationController.js';

const router = express.Router();

// Static routes MUST come before /:notificationId — same ordering
// convention used in routes/jobs.js — otherwise Express would match
// "mark-all-read" or "count" as a :notificationId value.
router.put('/mark-all-read', protect, markAllAsRead);      // PUT /api/notifications/mark-all-read
router.get('/count/unread', protect, getUnreadCount);       // GET /api/notifications/count/unread

router.get('/', protect, getNotifications);                 // GET /api/notifications
router.put('/:notificationId', protect, markAsRead);         // PUT /api/notifications/:notificationId
router.delete('/:notificationId', protect, deleteNotification); // DELETE /api/notifications/:notificationId

export default router;
