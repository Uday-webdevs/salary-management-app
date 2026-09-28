import type { EmploymentStatus, Prisma } from '../generated/prisma/index.js';
import { prisma } from '../config/database.js';

export interface EmployeeFilters {
  search?: string; country?: string; currency?: string; department?: string; status?: EmploymentStatus;
  minSalary?: number; maxSalary?: number;
}

export async function listEmployees(filters: EmployeeFilters, page: number, pageSize: number, sortBy: string, sortOrder: 'asc' | 'desc') {
  const where: Prisma.EmployeeWhereInput = {
    ...(filters.country ? { countryCode: filters.country } : {}),
    ...(filters.currency ? { currency: filters.currency } : {}),
    ...(filters.department ? { department: { name: filters.department } } : {}),
    ...(filters.status ? { employmentStatus: filters.status } : {}),
    ...(filters.minSalary !== undefined || filters.maxSalary !== undefined ? { baseSalaryMinor: { ...(filters.minSalary !== undefined ? { gte: filters.minSalary } : {}), ...(filters.maxSalary !== undefined ? { lte: filters.maxSalary } : {}) } } : {}),
    ...(filters.search ? { OR: [
      { employeeCode: { contains: filters.search } }, { firstName: { contains: filters.search } },
      { lastName: { contains: filters.search } }, { email: { contains: filters.search } },
      { AND: [{ firstName: { contains: filters.search.split(/\s+/)[0] ?? '' } }, { lastName: { contains: filters.search.split(/\s+/).slice(1).join(' ') } }] }
    ] } : {})
  };
  const sort: Prisma.EmployeeOrderByWithRelationInput = sortBy === 'name'
    ? { lastName: sortOrder }
    : sortBy === 'country' ? { country: { name: sortOrder } }
      : sortBy === 'department' ? { department: { name: sortOrder } }
        : sortBy === 'status' ? { employmentStatus: sortOrder }
          : sortBy === 'baseSalary' ? { baseSalaryMinor: sortOrder }
            : sortBy === 'hireDate' ? { hireDate: sortOrder } : { employeeCode: sortOrder };
  const [total, rows] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({ where, orderBy: [sort, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize, include: { country: true, department: true } })
  ]);
  return { rows, total };
}

export const findEmployee = (id: number) => prisma.employee.findUnique({ where: { id }, include: { country: true, department: true } });

export const listSalaryHistory = (employeeId: number) => prisma.salaryHistory.findMany({ where: { employeeId }, orderBy: [{ changedAt: 'desc' }, { id: 'desc' }] });

export const listCountries = () => prisma.country.findMany({ select: { code: true, name: true, currency: true }, orderBy: { name: 'asc' } });

export const listDepartments = () => prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
