import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Endpoints where a 401 is an EXPECTED, normal outcome (wrong credentials on
// a fresh login/register attempt) — never force-logout/redirect for these.
const AUTH_ENTRY_POINTS = ['/auth/login', '/auth/register'];

// On 401 from an already-authenticated request, the session has gone stale
// (expired/invalid token) — clear it and send the user back to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEntryPoint = AUTH_ENTRY_POINTS.some((p) => error.config?.url?.includes(p));
    const hadToken = !!localStorage.getItem('token');
    const onAdminPath = window.location.pathname.startsWith('/admin');
    const loginPath = onAdminPath ? '/admin/login' : '/login';

    if (error.response?.status === 401 && hadToken && !isAuthEntryPoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = loginPath;
    }

    // A 403 from `protect` specifically means "your account was suspended
    // mid-session" (see middleware/auth.js) — that's also a forced logout,
    // not just a permissions error to show inline.
    if (error.response?.status === 403 && hadToken && /suspended/i.test(error.response?.data?.message || '')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = loginPath;
    }

    if (!error.response) {
      // Network failure — backend unreachable, timeout, offline, etc.
      const netErr = new Error('Cannot reach the server. Please check your connection and try again.');
      netErr.isNetworkError = true;
      return Promise.reject(netErr);
    }

    // 429 (rate limited) — the backend now sends { message, isRateLimit,
    // retryAfter } (see server.js / auth.js limiters). Previously this fell
    // through to the generic "Something went wrong" message below with no
    // indication of how long to wait; surface the real wait time instead,
    // falling back to the `Retry-After` header if a given endpoint's
    // limiter didn't include it in the body for some reason.
    if (error.response.status === 429) {
      const data = error.response.data || {};
      const headerRetryAfter = Number(error.response.headers?.['retry-after']);
      const retryAfter = Number.isFinite(data.retryAfter)
        ? data.retryAfter
        : Number.isFinite(headerRetryAfter)
        ? headerRetryAfter
        : null;

      const rateLimitErr = new Error(
        data.message ||
          (retryAfter
            ? `You're sending requests too quickly. Please wait ${retryAfter} second${retryAfter !== 1 ? 's' : ''} and try again.`
            : 'Too many requests. Please wait a moment and try again.')
      );
      rateLimitErr.status = 429;
      rateLimitErr.isRateLimit = true;
      rateLimitErr.retryAfter = retryAfter;
      return Promise.reject(rateLimitErr);
    }

    // Re-throw a clean error message for components to catch
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.message ||
      'Something went wrong. Please try again.';

    const err = new Error(message);
    err.status = error.response?.status;

    // Field-level validation errors, keyed by field name for easy lookup:
    // { title: "Job title is required...", location: "Location is required" }
    const rawErrors = error.response?.data?.errors;
    if (Array.isArray(rawErrors)) {
      err.fieldErrors = Object.fromEntries(rawErrors.map((e) => [e.field, e.message]));
    }

    return Promise.reject(err);
  }
);

export const apiGet = (url, config) => api.get(url, config).then((r) => r.data);
export const apiPost = (url, data, config) => api.post(url, data, config).then((r) => r.data);
export const apiPut = (url, data, config) => api.put(url, data, config).then((r) => r.data);
export const apiDelete = (url, config, data) => api.delete(url, { ...config, data }).then((r) => r.data);

// ─── Admin API (Day 10) ─────────────────────────────────────────────────────
// Thin named wrappers, matching the shape asked for in the spec, but all
// still going through the same apiGet/Post/Put/Delete + interceptors above.
const qs = (params = {}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
};

export const getDashboardStats = () => apiGet('/admin/stats');
export const getGrowthTrends = (days = 30) => apiGet(`/admin/trends${qs({ days })}`);
export const getAllUsers = (page = 1, filters = {}) => apiGet(`/admin/users${qs({ page, ...filters })}`);
export const getUserDetails = (userId) => apiGet(`/admin/users/${userId}`);
export const suspendUser = (userId, reason, duration) =>
  apiPut(`/admin/users/${userId}/suspend`, { reason, duration });
export const activateUser = (userId) => apiPut(`/admin/users/${userId}/activate`, {});
export const deleteUser = (userId, hardDelete = false) =>
  apiDelete(`/admin/users/${userId}`, undefined, { hardDelete });
export const addAdminNote = (userId, note) => apiPut(`/admin/users/${userId}/note`, { note });
export const getAllJobs = (page = 1, filters = {}) => apiGet(`/admin/jobs${qs({ page, ...filters })}`);
export const getAllApplications = (page = 1, filters = {}) => apiGet(`/admin/applications${qs({ page, ...filters })}`);
export const getApplicationStats = () => apiGet('/admin/applications/stats');
export const getSystemHealth = () => apiGet('/admin/health');
export const getAuditLogs = (page = 1, filters = {}) => apiGet(`/admin/audit-logs${qs({ page, ...filters })}`);

export default api;
