import cron from 'node-cron';
import JobAlert from '../models/JobAlert.js';
import { getRecommendedJobsForDigest } from '../services/jobMatchingService.js';
import { sendDigestEmail } from '../services/digestEmailService.js';

const ts = () => new Date().toISOString();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Runs the digest job for every alert matching the given frequency.
 * Shared by both the daily and weekly schedulers — the only difference
 * between them is which alerts they query and how often they fire.
 *
 * Each alert is processed independently inside its own try/catch so one
 * seeker's bad data (e.g. a stale email address) can't stop the whole
 * batch — matches the "handle failures gracefully" requirement.
 */
const runDigestBatch = async (frequency, cutoff) => {
  const alerts = await JobAlert.find({
    isEnabled: true,
    frequency,
    $or: [{ lastDigestSent: null }, { lastDigestSent: { $lt: cutoff } }],
  }).populate('seekerId', 'name email');

  console.log(`[${ts()}] [Job Alert Scheduler] ${frequency} run: ${alerts.length} alert(s) due`);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const alert of alerts) {
    try {
      if (!alert.seekerId) {
        // Seeker account was deleted but the alert document wasn't cleaned
        // up — skip rather than crash the batch.
        skipped++;
        continue;
      }

      const jobs = await getRecommendedJobsForDigest(alert);
      if (jobs.length === 0) {
        skipped++;
        continue;
      }

      const result = await sendDigestEmail(alert.seekerId, alert, jobs);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      console.error(`[${ts()}] [Job Alert Scheduler] Failed for seeker ${alert.seekerId?._id || alert.seekerId}:`, error.message);
    }
  }

  console.log(`[${ts()}] [Job Alert Scheduler] ${frequency} run complete — sent: ${sent}, skipped (no matches): ${skipped}, failed: ${failed}`);

  // Returned so callers (the manual admin trigger endpoint) can report back
  // what happened — the cron-driven callers above just ignore this.
  return { totalAlerts: alerts.length, sent, skipped, failed };
};

/**
 * Daily digest — fires every day at ALERT_DAILY_TIME (default 9 AM), sending
 * to any 'daily' alert that hasn't had a digest in the last 24 hours.
 */
export const startDailyScheduler = () => {
  if (process.env.ALERT_SCHEDULER_ENABLED === 'false') {
    console.log(`[${ts()}] [Job Alert Scheduler] Daily scheduler disabled via ALERT_SCHEDULER_ENABLED=false`);
    return null;
  }

  const cronTime = process.env.ALERT_DAILY_TIME || '0 9 * * *';

  if (!cron.validate(cronTime)) {
    console.error(`[${ts()}] [Job Alert Scheduler] Invalid ALERT_DAILY_TIME "${cronTime}" — daily scheduler not started`);
    return null;
  }

  const task = cron.schedule(cronTime, async () => {
    console.log(`[${ts()}] [Job Alert Scheduler] Starting daily run`);
    try {
      await runDigestBatch('daily', new Date(Date.now() - ONE_DAY_MS));
    } catch (error) {
      // Belt-and-suspenders — runDigestBatch already isolates per-alert
      // errors, but a failure in the query itself shouldn't crash the process.
      console.error(`[${ts()}] [Job Alert Scheduler] Daily run failed:`, error);
    }
  });

  console.log(`[${ts()}] [Job Alert Scheduler] Daily scheduler started (cron: "${cronTime}")`);
  return task;
};

/**
 * Weekly digest — fires every Monday at ALERT_WEEKLY_TIME (default 9 AM),
 * sending to any 'weekly' alert that hasn't had a digest in the last 7 days.
 */
export const startWeeklyScheduler = () => {
  if (process.env.ALERT_SCHEDULER_ENABLED === 'false') {
    console.log(`[${ts()}] [Job Alert Scheduler] Weekly scheduler disabled via ALERT_SCHEDULER_ENABLED=false`);
    return null;
  }

  const cronTime = process.env.ALERT_WEEKLY_TIME || '0 9 * * 1';

  if (!cron.validate(cronTime)) {
    console.error(`[${ts()}] [Job Alert Scheduler] Invalid ALERT_WEEKLY_TIME "${cronTime}" — weekly scheduler not started`);
    return null;
  }

  const task = cron.schedule(cronTime, async () => {
    console.log(`[${ts()}] [Job Alert Scheduler] Starting weekly run`);
    try {
      await runDigestBatch('weekly', new Date(Date.now() - 7 * ONE_DAY_MS));
    } catch (error) {
      console.error(`[${ts()}] [Job Alert Scheduler] Weekly run failed:`, error);
    }
  });

  console.log(`[${ts()}] [Job Alert Scheduler] Weekly scheduler started (cron: "${cronTime}")`);
  return task;
};

// Exported for manual/test triggering (e.g. an admin "run now" button or a
// test script) without waiting for the actual cron time to arrive.
export const runDailyDigestNow = () => runDigestBatch('daily', new Date(Date.now() - ONE_DAY_MS));
export const runWeeklyDigestNow = () => runDigestBatch('weekly', new Date(Date.now() - 7 * ONE_DAY_MS));

export default { startDailyScheduler, startWeeklyScheduler, runDailyDigestNow, runWeeklyDigestNow };
