import type { z } from 'zod';
import { prisma } from '../config/database.js';
import * as repository from '../repositories/employee.repository.js';
import type { employeeQuerySchema, salaryUpdateSchema } from '../schemas/employee.schema.js';
import { HttpError } from '../utils/http-error.js';

const supportedCurrencies = new Set(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'SGD', 'JPY']);

export async function getEmployees(query: z.infer<typeof employeeQuerySchema>) {
  const { page, pageSize, sortBy, sortOrder } = query;
  const filters = {
    ...(query.search !== undefined ? { search: query.search } : {}),
    ...(query.country !== undefined ? { country: query.country } : {}),
    ...(query.currency !== undefined ? { currency: query.currency } : {}),
    ...(query.department !== undefined ? { department: query.department } : {}),
    ...(query.status !== undefined ? { status: query.status } : {}),
    ...(query.minSalary !== undefined ? { minSalary: query.minSalary } : {}),
    ...(query.maxSalary !== undefined ? { maxSalary: query.maxSalary } : {})
  };
  const { rows, total } = await repository.listEmployees(filters, page, pageSize, sortBy, sortOrder);
  return {
    data: rows.map((employee) => ({ ...employee, totalCompensationMinor: employee.baseSalaryMinor + employee.bonusMinor })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
  };
}

export async function getEmployee(id: number) {
  const employee = await repository.findEmployee(id);
  if (!employee) throw new HttpError(404, 'NOT_FOUND', 'Employee not found');
  return { ...employee, totalCompensationMinor: employee.baseSalaryMinor + employee.bonusMinor };
}

export async function getSalaryHistory(id: number) {
  await getEmployee(id);
  return repository.listSalaryHistory(id);
}

export async function updateSalary(id: number, input: z.infer<typeof salaryUpdateSchema>, changedBy: string) {
  const actorSubject = changedBy.trim();
  if (!actorSubject) throw new HttpError(401, 'UNAUTHENTICATED', 'A signed-in actor is required to update compensation');
  if (!supportedCurrencies.has(input.currency)) throw new HttpError(400, 'VALIDATION_ERROR', 'Unsupported currency');
  const effectiveDate = new Date(`${input.effectiveDate}T00:00:00.000Z`);
  await prisma.$transaction(async (tx) => {
    const current = await tx.employee.findUnique({ where: { id } });
    if (!current) throw new HttpError(404, 'NOT_FOUND', 'Employee not found');
    if (current.version !== input.expectedVersion) throw new HttpError(409, 'STALE_UPDATE', 'Employee compensation changed since it was loaded. Refresh and try again.');
    const changed = await tx.employee.updateMany({
      where: { id, version: input.expectedVersion },
      data: { baseSalaryMinor: input.baseSalaryMinor, bonusMinor: input.bonusMinor, currency: input.currency, salaryEffectiveDate: effectiveDate, version: { increment: 1 } }
    });
    if (changed.count !== 1) throw new HttpError(409, 'STALE_UPDATE', 'Employee compensation changed since it was loaded. Refresh and try again.');
    await tx.salaryHistory.create({
      data: {
        employeeId: id,
        previousBaseSalaryMinor: current.baseSalaryMinor,
        newBaseSalaryMinor: input.baseSalaryMinor,
        previousBonusMinor: current.bonusMinor,
        newBonusMinor: input.bonusMinor,
        previousCurrency: current.currency,
        currency: input.currency,
        effectiveDate,
        changedBy: actorSubject
      }
    });
  });
  return getEmployee(id);
}

export const getCountries = () => repository.listCountries();
export const getDepartments = () => repository.listDepartments();
