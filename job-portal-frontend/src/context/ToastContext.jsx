import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

const VARIANTS = {
  success: {
    bg: 'bg-white',
    border: 'border-l-4 border-green-500',
    icon: (
      <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-white',
    border: 'border-l-4 border-red-500',
    icon: (
      <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  info: {
    bg: 'bg-white',
    border: 'border-l-4 border-blue-500',
    icon: (
      <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  // Bumped once a second while a rate-limit countdown toast is showing, so
  // that toast's remaining-seconds text re-renders live instead of being
  // frozen at whatever it said when the toast first appeared.
  const [, forceTick] = useState(0);
  const timers = useRef({});
  const countdownIntervalRef = useRef(null);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const showToast = useCallback(
    (message, variant = 'success', duration = 3500) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, variant }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  // Rate-limit toast (Bug #2 fix): counts down live from the backend's
  // `retryAfter` (seconds) instead of showing a static, generic message —
  // the recruiter can see exactly how long is left instead of guessing.
  const showRateLimitToast = useCallback(
    (retryAfterSeconds, baseMessage) => {
      const id = ++idCounter;
      const safeSeconds = Number.isFinite(retryAfterSeconds) ? Math.max(0, retryAfterSeconds) : 30;
      const retryAt = Date.now() + safeSeconds * 1000;
      setToasts((prev) => [...prev, { id, variant: 'error', retryAt, baseMessage }]);
      timers.current[id] = setTimeout(() => dismiss(id), safeSeconds * 1000 + 3000);
      return id;
    },
    [dismiss]
  );

  // Single shared interval, only alive while at least one toast needs a
  // live-ticking countdown — avoids a stray timer running for the whole
  // app lifetime when nobody has hit a rate limit.
  useEffect(() => {
    const hasCountdown = toasts.some((t) => t.retryAt);
    if (hasCountdown && !countdownIntervalRef.current) {
      countdownIntervalRef.current = setInterval(() => forceTick((t) => t + 1), 1000);
    } else if (!hasCountdown && countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, [toasts]);

  useEffect(
    () => () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      Object.values(timers.current).forEach(clearTimeout);
    },
    []
  );

  const toast = {
    success: (msg, duration) => showToast(msg, 'success', duration),
    error: (msg, duration) => showToast(msg, 'error', duration),
    info: (msg, duration) => showToast(msg, 'info', duration),
    rateLimit: (retryAfterSeconds, baseMessage = "You're sending requests too quickly.") =>
      showRateLimitToast(retryAfterSeconds, baseMessage),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map(({ id, message, variant, retryAt, baseMessage }) => {
          const v = VARIANTS[variant] || VARIANTS.info;
          const remaining = retryAt ? Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)) : null;
          const displayMessage = retryAt
            ? remaining > 0
              ? `${baseMessage} Please try again in ${remaining}s.`
              : `${baseMessage} You can try again now.`
            : message;
          return (
            <div
              key={id}
              role="status"
              className={`${v.bg} ${v.border} shadow-lg rounded-lg px-4 py-3 flex items-start gap-3 animate-[toast-in_0.2s_ease-out]`}
            >
              {v.icon}
              <p className="text-sm text-gray-800 flex-1 leading-snug">{displayMessage}</p>
              <button
                onClick={() => dismiss(id)}
                aria-label="Dismiss notification"
                className="text-gray-400 hover:text-gray-600 shrink-0 leading-none text-lg"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
