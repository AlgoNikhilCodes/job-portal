import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * Creates (but does not yet guarantee-connect) a Socket.io client tied to a
 * specific JWT. The token travels in the handshake `auth` payload, where the
 * backend's socketAuth middleware (config/socket.js) verifies it — same JWT
 * used for REST calls, so a single login covers both.
 *
 * autoConnect stays true so the socket starts connecting immediately; the
 * built-in reconnection logic (reconnection: true) means transient network
 * loss recovers on its own without any extra code here.
 */
export const initSocket = (token) => {
  const socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: Number(import.meta.env?.VITE_SOCKET_RECONNECT_DELAY) || 5000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    socket.emit('user:online');
  });

  return socket;
};

/**
 * Gracefully tears down a socket connection — used on logout/unmount so we
 * don't leak connections or keep listening for events for a signed-out user.
 */
export const disconnectSocket = (socket) => {
  if (!socket) return;
  try {
    socket.emit('user:offline');
  } catch {
    // Socket may already be in a broken state — safe to ignore, we're
    // tearing it down regardless.
  }
  socket.disconnect();
};

export default { initSocket, disconnectSocket };
