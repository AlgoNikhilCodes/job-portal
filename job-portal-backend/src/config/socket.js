import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const ts = () => new Date().toISOString();

/**
 * Socket.io authentication middleware.
 * Runs once per connection attempt, BEFORE the "connection" event fires.
 * The client sends its JWT in `socket.handshake.auth.token` (see frontend
 * services/socket.js). We verify it exactly like the REST `protect`
 * middleware does, then attach the user to `socket.user` for later use.
 */
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('No token provided, access denied'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(new Error('Token is invalid or expired'));
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach the authenticated user onto the socket for use in event handlers
    socket.user = {
      id: user._id.toString(),
      name: user.name,
      userType: user.userType,
    };

    next();
  } catch (error) {
    console.error(`[${ts()}] Socket auth error:`, error.message);
    next(new Error('Server error during socket authentication'));
  }
};

/**
 * Sets up Socket.io on top of the existing HTTP server.
 * Rooms used throughout the app:
 *   - `user_{userId}`       — personal notifications for this exact user
 *   - `recruiter_{userId}`  — recruiter-only broadcasts (application received, etc.)
 *   - `seeker_{userId}`     — seeker-only broadcasts (status changes, job alerts)
 *   - `notifications`       — global room, reserved for site-wide announcements
 *
 * A user always joins `user_{id}` plus either `recruiter_{id}` or `seeker_{id}`
 * depending on their role, so socketService can target either "this exact
 * user" or "this user in their role" depending on the event.
 */
export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    // If a client can't establish a WebSocket (corporate proxy, old browser,
    // etc.) Socket.io transparently falls back to long-polling.
    transports: ['websocket', 'polling'],
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    const { id: userId, name, userType } = socket.user;

    // Personal room — always joined, regardless of role
    socket.join(`user_${userId}`);
    // Role room — lets socketService target "all recruiters" style broadcasts
    // as well as this specific recruiter/seeker's own room
    socket.join(`${userType}_${userId}`);
    // Global room for site-wide announcements (not used yet, reserved)
    socket.join('notifications');

    console.log(`[${ts()}] Socket connected: ${name} (${userType}, id=${userId}) — socket ${socket.id}`);

    socket.on('user:online', () => {
      socket.broadcast.emit('user:presence', { userId, online: true });
    });

    socket.on('disconnect', (reason) => {
      console.log(`[${ts()}] Socket disconnected: ${name} (id=${userId}) — reason: ${reason}`);
      socket.broadcast.emit('user:presence', { userId, online: false });
    });

    socket.on('error', (err) => {
      console.error(`[${ts()}] Socket error for user ${userId}:`, err.message);
    });
  });

  io.engine.on('connection_error', (err) => {
    // Fires for failed handshakes (e.g. bad/missing token) — logged for visibility,
    // the client sees the rejection via the "connect_error" event.
    console.error(`[${ts()}] Socket.io connection error: ${err.message}`);
  });

  console.log(`[${ts()}] Socket.io initialized`);
  return io;
};

export default initializeSocket;
