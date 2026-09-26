import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/database.js';

const server = app.listen(env.PORT, () => console.info(`Salary management API listening on port ${env.PORT}`));

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}

process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });
