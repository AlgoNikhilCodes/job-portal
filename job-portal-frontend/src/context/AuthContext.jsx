import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiPost } from '../services/api.js';
import { initSocket, disconnectSocket } from '../services/socket.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // The live Socket.io connection for the current session. Kept in state (not
  // a plain variable) so consumers like NotificationContext re-render when it
  // changes from null -> connected instance on login, and back on logout.
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  const startSocket = useCallback((tokenValue) => {
    // Tear down any previous connection first — guards against double
    // connections if startSocket is ever called twice in a row (e.g. login
    // right after a stale reconnect attempt).
    if (socketRef.current) {
      disconnectSocket(socketRef.current);
    }
    const newSocket = initSocket(tokenValue);
    socketRef.current = newSocket;
    setSocket(newSocket);
  }, []);

  const stopSocket = useCallback(() => {
    if (socketRef.current) {
      disconnectSocket(socketRef.current);
      socketRef.current = null;
    }
    setSocket(null);
  }, []);

  // On mount, restore user from localStorage if token exists
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        startSocket(token);
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setToken(null);
      }
    }
    setLoading(false);

    // Disconnect the socket when the whole app unmounts (page close/nav away
    // from the SPA entirely) — normal route changes don't unmount this provider.
    return () => stopSocket();
  }, [startSocket, stopSocket]);

  const persistAuth = (tokenValue, userData) => {
    localStorage.setItem('token', tokenValue);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(tokenValue);
    setUser(userData);
    setError(null);
    startSocket(tokenValue);
  };

  const clearAuth = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    stopSocket();
  }, [stopSocket]);

  const register = async (name, email, password, userType) => {
    setError(null);
    const data = await apiPost('/auth/register', { name, email, password, userType });
    persistAuth(data.token, data.user);
    return data;
  };

  const login = async (email, password) => {
    setError(null);
    const data = await apiPost('/auth/login', { email, password });
    persistAuth(data.token, data.user);
    return data;
  };

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  // Admin is just userType === 'admin' — exposed as a helper so components
  // don't have to spell out the string comparison everywhere.
  const isAdmin = useCallback(() => user?.userType === 'admin', [user]);

  return (
    <AuthContext.Provider value={{ user, token, loading, error, setError, login, register, logout, socket, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook — throws if used outside AuthProvider
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
