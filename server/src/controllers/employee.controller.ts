import type { Request, Response } from 'express';
import { getSalaryHistoryActor } from '../auth/access-control.js';
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
  const actor = getSalaryHistoryActor(req);
  if (!actor) throw new HttpError(401, 'UNAUTHENTICATED', 'A valid organization identity is required to update compensation');

  res.json({
    data: await service.updateSalary(
      employeeIdSchema.parse(req.params.id),
      salaryUpdateSchema.parse(req.body),
      actor
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
