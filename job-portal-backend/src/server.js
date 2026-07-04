import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import { initializeSocket } from './config/socket.js';
import protect, { adminOnly } from './middleware/auth.js';
import { requestMetrics } from './middleware/requestMetrics.js';
import authRoutes from './routes/auth.js';
import jobRoutes from './routes/jobs.js';
import applicationRoutes from './routes/applications.js';
import profileRoutes from './routes/profiles.js';
import savedJobRoutes from './routes/savedJobs.js';
import searchRoutes from './routes/search.js';
import dashboardRoutes from './routes/dashboard.js';
import recommendationRoutes from './routes/recommendations.js';
import notificationRoutes from './routes/notifications.js';
import jobAlertRoutes from './routes/jobAlerts.js';
import resumeRoutes from './routes/resumes.js';
import adminRoutes from './routes/admin.js';
import { startDailyScheduler, startWeeklyScheduler } from './jobs/dailyJobAlertScheduler.js';
import { ensureUploadDir } from './middleware/uploadMiddleware.js';

const app = express();

// Socket.io needs a raw HTTP server to attach to — Express apps are
// normally handed to http.createServer() under the hood by app.listen(),
// but we need the server object explicitly here so Socket.io can share it.
const server = http.createServer(app);

// Security & parsing middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Tracks request counts/errors/timings in-memory for the admin "System
// Health" panel — must be mounted before the routes so it wraps every request.
app.use(requestMetrics);

// Rate limiting: max 100 requests per 15 minutes per IP.
// Custom handler so a 429 response always includes a precise `retryAfter`
// (in seconds) the frontend can show to the user — the express-rate-limit
// default body is just a generic string, which is what left the UI showing
// "Something went wrong. Please try again." with no indication of *how
// long* to wait.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      message: `You're sending requests too quickly. Please wait ${retryAfter} second${retryAfter !== 1 ? 's' : ''} and try again.`,
      isRateLimit: true,
      retryAfter,
    });
  },
});
app.use('/api', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/saved-jobs', savedJobRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/job-alerts', jobAlertRoutes);
app.use('/api/resumes', resumeRoutes);
// `protect` populates/validates req.user (and rejects suspended accounts);
// `adminOnly` then checks req.user.userType === 'admin' before anything
// in adminRoutes runs.
app.use('/api/admin', protect, adminOnly, adminRoutes);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// 404 handler
app.use((_req, res) =>
  res.status(404).json({ message: 'This route does not exist. Please check the URL and try again.' })
);

// Global error handler — catches anything passed to next(err) and any
// Mongoose errors that slip through a controller's own try/catch.
app.use((err, _req, res, _next) => {
  const ts = new Date().toISOString();
  console.error(`[${ts}] Unhandled error:`, err.stack || err.message);

  // Translate common Mongoose/Mongo errors into friendly, actionable messages
  if (err.name === 'CastError') {
    return res.status(404).json({ message: 'The requested item could not be found. Please check the URL and try again.' });
  }
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return res.status(400).json({ message: 'Please fix the highlighted fields and try again.', errors });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({ message: `That ${field} is already in use. Please try a different one.` });
  }

  res.status(err.status || 500).json({
    message: err.status ? err.message : 'Something went wrong on our end. Please try again in a moment.',
  });
});

const PORT = process.env.PORT || 5000;
const ts = () => new Date().toISOString();

console.log(`[${ts()}] Starting Job Portal API…`);

// Make sure the resume upload directory exists before any upload request
// can arrive — a fresh checkout won't have /uploads/resumes yet.
ensureUploadDir();

connectDB().then(() => {
  // Attach Socket.io to the same HTTP server/port as the REST API — no
  // separate port or process needed. Controllers reach it via
  // `req.app.get('io')` (see applicationController.js, notificationController.js).
  const io = initializeSocket(server);
  app.set('io', io);

  // Background job alert digests — daily/weekly emails, no manual trigger needed.
  startDailyScheduler();
  startWeeklyScheduler();

  server.listen(PORT, () => console.log(`[${ts()}] Server running on http://localhost:${PORT} (REST + Socket.io)`));
});

process.on('unhandledRejection', (reason) => {
  console.error(`[${ts()}] Unhandled promise rejection:`, reason);
});
