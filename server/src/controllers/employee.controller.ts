import type { Request, Response } from 'express';
import { getAccessSession } from '../auth/access-control.js';
import * as service from '../services/employee.service.js';
import { employeeIdSchema, employeeQuerySchema, salaryUpdateSchema } from '../schemas/employee.schema.js';
import { HttpError } from '../utils/http-error.js';

export async function list(req: Request, res: Response) {
  res.json(await service.getEmployees(employeeQuerySchema.parse(req.query)));
}
export async function get(req: Request, res: Response) {
  res.json({ data: await service.getEmployee(employeeIdSchema.parse(req.params.id)) });
}
export async function updateSalary(req: Request, res: Response) {
  const session = getAccessSession(req);
  if (!session) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue');

  res.json({
    data: await service.updateSalary(
      employeeIdSchema.parse(req.params.id),
      salaryUpdateSchema.parse(req.body),
      session.user.subject
    )
  });
}
export async function history(req: Request, res: Response) {
  res.json({ data: await service.getSalaryHistory(employeeIdSchema.parse(req.params.id)) });
}
export async function countries(_req: Request, res: Response) {
  res.json({ data: await service.getCountries() });
}
export async function departments(_req: Request, res: Response) {
  res.json({ data: await service.getDepartments() });
}
