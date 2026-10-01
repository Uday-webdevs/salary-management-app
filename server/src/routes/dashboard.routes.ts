import { Router } from 'express';
import * as controller from '../controllers/dashboard.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import { requirePermission } from '../auth/access-control.js';

export const dashboardRouter = Router();
dashboardRouter.get('/summary', requirePermission('readEmployeeData'), asyncHandler(controller.summary));
dashboardRouter.get('/by-country', requirePermission('readEmployeeData'), asyncHandler(controller.byCountry));
dashboardRouter.get('/by-department', requirePermission('readEmployeeData'), asyncHandler(controller.byDepartment));
dashboardRouter.get('/salary-distribution', requirePermission('readEmployeeData'), asyncHandler(controller.salaryDistribution));
