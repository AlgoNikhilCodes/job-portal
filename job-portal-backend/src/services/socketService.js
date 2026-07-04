import Notification from '../models/Notification.js';

const ts = () => new Date().toISOString();

/**
 * Persist a notification to the DB and emit it over the given room in one
 * step. Every emit* helper below funnels through this so that:
 *   1. Every real-time event also becomes a row the user can see later on
 *      the /notifications history page (even if they were offline when it fired).
 *   2. A DB failure here never throws — sockets should keep working even if
 *      Mongo hiccups, matching the "fire-and-forget" philosophy already used
 *      for emails elsewhere in this app.
 *
 * NOTE on emails: the actual email sends (sendApplicationConfirmation,
 * sendApplicationReceivedToRecruiter, sendApplicationStatusUpdate) already
 * happen in applicationController.js right where the application/status
 * change is created. We deliberately do NOT re-send email from here — that
 * would double-send. This module's job is sockets + persisted notifications only.
 */
const persistAndEmit = async (io, { userId, room, event, type, title, message, data, link }) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data: data || {},
      link: link || null,
    });

    io.to(room).emit(event, {
      _id: notification._id,
      type,
      title,
      message,
      data: data || {},
      link: link || null,
      isRead: false,
      createdAt: notification.createdAt,
      timestamp: notification.createdAt,
    });

    return notification;
  } catch (error) {
    console.error(`[${ts()}] socketService: failed to persist/emit "${event}":`, error.message);
    // Still emit a best-effort real-time event even if persistence failed,
    // so the live UI update isn't silently lost.
    io.to(room).emit(event, {
      type,
      title,
      message,
      data: data || {},
      link: link || null,
      isRead: false,
      timestamp: new Date(),
    });
    return null;
  }
};

/**
 * A seeker just applied to a job — notify the recruiter who posted it.
 */
export const emitApplicationNotification = (io, jobId, recruiterId, seekerName, seekerId) => {
  const message = `New application from ${seekerName}`;
  return persistAndEmit(io, {
    userId: recruiterId,
    room: `recruiter_${recruiterId}`,
    event: 'application:submitted',
    type: 'application:submitted',
    title: 'New Application',
    message,
    data: { jobId, seekerId, seekerName },
    link: `/job/${jobId}/applications`,
  });
};

/**
 * A recruiter changed an application's status — notify the seeker.
 */
export const emitApplicationStatusUpdate = (io, seekerId, status, jobTitle, jobId, recruiterName) => {
  const message = `Your application for "${jobTitle}" was updated to ${status}`;
  return persistAndEmit(io, {
    userId: seekerId,
    room: `seeker_${seekerId}`,
    event: 'application:status_changed',
    type: 'application:status_changed',
    title: `Application ${status}`,
    message,
    data: { status, jobTitle, jobId, recruiterName },
    link: '/my-applications',
  });
};

/**
 * A new job was posted matching a seeker's saved skills.
 * (Wired for future use by a scheduled matching job — see recommendationController.)
 */
export const emitNewJobAlert = (io, seekerId, jobId, jobTitle) => {
  const message = `New job matching your skills: ${jobTitle}`;
  return persistAndEmit(io, {
    userId: seekerId,
    room: `seeker_${seekerId}`,
    event: 'job:new_matching',
    type: 'job:new_matching',
    title: 'New Job Match',
    message,
    data: { jobId, jobTitle },
    link: `/jobs/${jobId}`,
  });
};

/**
 * Lightweight, non-persisted event used to keep a recruiter's dashboard/job
 * card application counts live without a full notification entry — this one
 * intentionally does NOT go through persistAndEmit since it's a UI sync
 * signal, not something the user needs in their notification history.
 */
export const emitApplicationCountUpdate = (io, recruiterId, jobId, newCount) => {
  io.to(`recruiter_${recruiterId}`).emit('dashboard:application_count_changed', {
    jobId,
    newCount,
    timestamp: new Date(),
  });
};

/**
 * Broadcast that a notification was marked read, so if the same user has
 * multiple tabs/devices open they all stay in sync.
 */
export const emitNotificationRead = (io, userId, notificationId) => {
  io.to(`user_${userId}`).emit('notification:read', { notificationId, timestamp: new Date() });
};

/**
 * A recruiter moved several candidates at once via the Kanban board's bulk
 * toolbar. Lightweight UI-sync signal (not a persisted notification) — the
 * per-seeker "your status changed" notification is emitted separately via
 * emitApplicationStatusUpdate for each affected application.
 *
 * NOTE: this data model has exactly one recruiter (owner) per job — there's
 * no "team of recruiters sharing a job" concept. In practice this reaches
 * every OTHER TAB/DEVICE the same recruiter is logged in on, which is what
 * actually gives the "no refresh needed" real-time feel in this app.
 */
export const emitApplicationStatusChangedBulk = (io, recruiterId, jobId, applicationIds, newStatus) => {
  io.to(`recruiter_${recruiterId}`).emit('application:status_changed_bulk', {
    jobId,
    applicationIds,
    newStatus,
    timestamp: new Date(),
  });
};

/**
 * A single Kanban card was moved (drag-drop or a bulk action touching it) —
 * broadcast so any other open board for this job re-renders that card in
 * its new column instantly. Targets the owning recruiter's room (rooms are
 * keyed by user ID, not job ID — see config/socket.js) and includes jobId in
 * the payload so the client can ignore events for a board it isn't viewing.
 */
export const emitKanbanBoardUpdate = (io, recruiterId, jobId, applicationId, newStatus, movedByName) => {
  io.to(`recruiter_${recruiterId}`).emit('kanban:card_moved', {
    jobId,
    applicationId,
    newStatus,
    movedByName,
    timestamp: new Date(),
  });
};

export default {
  emitApplicationNotification,
  emitApplicationStatusUpdate,
  emitNewJobAlert,
  emitApplicationCountUpdate,
  emitNotificationRead,
  emitApplicationStatusChangedBulk,
  emitKanbanBoardUpdate,
};
