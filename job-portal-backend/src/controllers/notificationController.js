import Notification from '../models/Notification.js';
import { emitNotificationRead } from '../services/socketService.js';

const PAGE_SIZE = 20;

// GET /api/notifications — paginated list for the logged-in user
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, unread_only = 'false' } = req.query;
    const currentPage = Math.max(1, parseInt(page));

    const filter = { userId: req.user._id };
    if (unread_only === 'true') filter.isRead = false;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((currentPage - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: req.user._id, isRead: false }),
    ]);

    res.json({
      notifications,
      totalCount,
      unreadCount,
      page: currentPage,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] getNotifications error:`, error);
    res.status(500).json({ message: 'Something went wrong while fetching notifications. Please try again.' });
  }
};

// PUT /api/notifications/:notificationId — mark one as read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found. It may have already been removed.' });
    }

    const io = req.app.get('io');
    if (io) emitNotificationRead(io, req.user._id, notification._id);

    res.json(notification);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Notification not found. Please check the URL and try again.' });
    }
    console.error(`[${new Date().toISOString()}] markAsRead error:`, error);
    res.status(500).json({ message: 'Something went wrong while updating this notification. Please try again.' });
  }
};

// PUT /api/notifications/mark-all-read — mark every unread notification as read
export const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read', modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] markAllAsRead error:`, error);
    res.status(500).json({ message: 'Something went wrong while updating your notifications. Please try again.' });
  }
};

// DELETE /api/notifications/:notificationId
export const deleteNotification = async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.notificationId,
      userId: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Notification not found. It may have already been removed.' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Notification not found. Please check the URL and try again.' });
    }
    console.error(`[${new Date().toISOString()}] deleteNotification error:`, error);
    res.status(500).json({ message: 'Something went wrong while deleting this notification. Please try again.' });
  }
};

// GET /api/notifications/count/unread — cheap poll used to sync the bell badge on page load
export const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
    res.json({ unreadCount });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] getUnreadCount error:`, error);
    res.status(500).json({ message: 'Something went wrong while fetching your unread count. Please try again.' });
  }
};
