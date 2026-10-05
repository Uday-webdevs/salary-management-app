import { prisma } from '../config/database.js';

const RETENTION_YEARS = 3;

export function salaryHistoryRetentionCutoff(now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - RETENTION_YEARS);
  return cutoff;
}

export function purgeExpiredSalaryHistory(now = new Date()) {
  return prisma.salaryHistory.deleteMany({
    where: { changedAt: { lt: salaryHistoryRetentionCutoff(now) } }
  });
}
