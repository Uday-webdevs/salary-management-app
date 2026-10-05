import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/database.js';
import { purgeExpiredSalaryHistory } from './services/salary-history-retention.service.js';

const RETENTION_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function runSalaryHistoryRetention() {
  try {
    const result = await purgeExpiredSalaryHistory();
    if (result.count > 0) console.info(`[audit-retention] removed ${result.count} expired salary history records`);
  } catch {
    console.error('[audit-retention] failed to remove expired salary history records');
  }
}

void runSalaryHistoryRetention();
const retentionTimer = setInterval(() => { void runSalaryHistoryRetention(); }, RETENTION_SWEEP_INTERVAL_MS);
retentionTimer.unref();

const onListening = () => console.info(`Salary management API listening on port ${env.PORT}`);
const server = env.AUTH_MODE === 'development'
  ? app.listen(env.PORT, '127.0.0.1', onListening)
  : app.listen(env.PORT, onListening);

async function shutdown() {
  clearInterval(retentionTimer);
  server.close();
  await prisma.$disconnect();
}

process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });
