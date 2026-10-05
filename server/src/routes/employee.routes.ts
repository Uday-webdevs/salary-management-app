import { Router } from 'express';
import * as controller from '../controllers/employee.controller.js';
import { asyncHandler } from '../utils/async-handler.js';
import { requirePermission } from '../auth/access-control.js';

export const employeeRouter = Router();
employeeRouter.get('/', requirePermission('readEmployeeData'), asyncHandler(controller.list));
employeeRouter.get('/countries', requirePermission('readEmployeeData'), asyncHandler(controller.countries));
employeeRouter.get('/departments', requirePermission('readEmployeeData'), asyncHandler(controller.departments));
employeeRouter.get('/:id/salary-history', requirePermission('viewSalaryHistory'), asyncHandler(controller.history));
employeeRouter.patch('/:id/salary', requirePermission('editCompensation'), asyncHandler(controller.updateSalary));
employeeRouter.get('/:id', requirePermission('readEmployeeData'), asyncHandler(controller.get));
