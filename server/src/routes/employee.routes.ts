import { Router } from 'express';
import * as controller from '../controllers/employee.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

export const employeeRouter = Router();
employeeRouter.get('/', asyncHandler(controller.list));
employeeRouter.get('/countries', asyncHandler(controller.countries));
employeeRouter.get('/departments', asyncHandler(controller.departments));
employeeRouter.get('/:id/salary-history', asyncHandler(controller.history));
employeeRouter.patch('/:id/salary', asyncHandler(controller.updateSalary));
employeeRouter.get('/:id', asyncHandler(controller.get));
