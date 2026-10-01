import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/database.js';

const onListening = () => console.info(`Salary management API listening on port ${env.PORT}`);
const server = env.AUTH_MODE === 'development'
  ? app.listen(env.PORT, '127.0.0.1', onListening)
  : app.listen(env.PORT, onListening);

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}

process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });
