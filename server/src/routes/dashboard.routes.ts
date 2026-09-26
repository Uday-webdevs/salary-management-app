import { Router } from 'express';
import * as controller from '../controllers/dashboard.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const dashboardRouter = Router();
dashboardRouter.get('/summary', asyncHandler(controller.summary));
dashboardRouter.get('/by-country', asyncHandler(controller.byCountry));
dashboardRouter.get('/by-department', asyncHandler(controller.byDepartment));
dashboardRouter.get('/salary-distribution', asyncHandler(controller.salaryDistribution));
