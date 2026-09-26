import express from 'express';
import { resolve } from 'node:path';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { employeeRouter } from './routes/employee.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { HttpError } from './utils/http-error.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json({ limit: '32kb' }));
app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok' } }));
app.use('/api/employees', employeeRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'Route not found')));
if (env.NODE_ENV === 'production') {
  const clientBuild = resolve(process.cwd(), '../client/dist');
  app.use(express.static(clientBuild));
  app.get('*', (_req, res, next) => res.sendFile(resolve(clientBuild, 'index.html'), (error) => { if (error) next(error); }));
}
app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'Route not found')));
app.use(errorHandler);
