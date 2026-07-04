// Lightweight in-process request metrics — no external APM/logging DB exists
// in this project, so the admin "System Health" panel needs *something* real
// to read from rather than hardcoded numbers. This tracks counts/timings
// since the process started; it resets on every server restart, which is an
// accepted trade-off for a project this size (noted in adminController.js).

const store = {
  totalRequests: 0,
  serverErrors: 0, // responses with status >= 500
  totalResponseTimeMs: 0,
  startedAt: new Date(),
};

// Mounted once, early, in server.js — before the route handlers — so it
// wraps every request the API receives.
export const requestMetrics = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    store.totalRequests += 1;
    store.totalResponseTimeMs += durationMs;
    if (res.statusCode >= 500) store.serverErrors += 1;
  });

  next();
};

// Read-only snapshot used by GET /api/admin/health and the dashboard stats.
export const getMetricsSnapshot = () => {
  const { totalRequests, serverErrors, totalResponseTimeMs, startedAt } = store;
  const errorRate = totalRequests > 0 ? (serverErrors / totalRequests) * 100 : 0;
  const apiUptime = totalRequests > 0 ? 100 - errorRate : 100;
  const averageResponseTime = totalRequests > 0 ? totalResponseTimeMs / totalRequests : 0;

  return {
    totalRequests,
    serverErrors,
    errorRate: Number(errorRate.toFixed(2)),
    apiUptime: Number(apiUptime.toFixed(2)),
    averageResponseTime: Number(averageResponseTime.toFixed(1)),
    processStartedAt: startedAt,
  };
};
