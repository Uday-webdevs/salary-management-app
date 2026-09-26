import { EmploymentStatus } from '../generated/prisma/index.js';
import { z } from 'zod';

const positiveIntFromQuery = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive());
export const employeeQuerySchema = z.object({
  page: z.preprocess((value) => value === undefined ? '1' : value, positiveIntFromQuery),
  pageSize: z.preprocess((value) => value === undefined ? '25' : value, positiveIntFromQuery.pipe(z.union([z.literal(10), z.literal(25), z.literal(50), z.literal(100)]))),
  search: z.string().trim().max(120).optional(),
  country: z.string().length(2).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  department: z.string().trim().min(1).max(80).optional(),
  status: z.nativeEnum(EmploymentStatus).optional(),
  minSalary: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().nonnegative()).optional(),
  maxSalary: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().nonnegative()).optional(),
  sortBy: z.enum(['employeeCode', 'name', 'country', 'department', 'status', 'baseSalary', 'hireDate']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
}).strict().refine((v) => v.minSalary === undefined || v.maxSalary === undefined || v.minSalary <= v.maxSalary, { message: 'minSalary must be less than or equal to maxSalary' });

export const employeeIdSchema = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive());
export const salaryUpdateSchema = z.object({
  baseSalaryMinor: z.number().int().nonnegative().max(2_000_000_000),
  bonusMinor: z.number().int().nonnegative().max(2_000_000_000),
  currency: z.string().regex(/^[A-Z]{3}$/),
  effectiveDate: z.string().date(),
  expectedVersion: z.number().int().positive()
}).strict();
