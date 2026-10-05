import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { EmploymentStatus } from './generated/prisma/index.js';
import { prisma } from './config/database.js';
import { app } from './app.js';

let employeeId = 0;
let departmentId = 0;

beforeAll(async () => {
  await prisma.country.upsert({ where: { code: 'US' }, update: {}, create: { code: 'US', name: 'United States', currency: 'USD' } });
  const department = await prisma.department.upsert({ where: { name: 'Test Operations' }, update: {}, create: { name: 'Test Operations' } });
  departmentId = department.id;
  const employee = await prisma.employee.create({ data: {
    employeeCode: 'TEST-API-0001', firstName: 'Avery', lastName: 'Fixture', email: 'avery.fixture.test@example.com',
    countryCode: 'US', departmentId, jobTitle: 'Test Engineer', employmentStatus: EmploymentStatus.ACTIVE,
    hireDate: new Date('2022-04-01T00:00:00Z'), currency: 'USD', baseSalaryMinor: 8500000, bonusMinor: 250000,
    salaryEffectiveDate: new Date('2024-01-01T00:00:00Z')
  } });
  employeeId = employee.id;
});

afterAll(async () => {
  if (employeeId) await prisma.employee.delete({ where: { id: employeeId } });
  if (departmentId && await prisma.employee.count({ where: { departmentId } }) === 0) {
    await prisma.department.deleteMany({ where: { id: departmentId, name: 'Test Operations' } });
  }
  await prisma.$disconnect();
});

describe('employee API', () => {
  it('paginates with an explicit page size and consistent response shape', async () => {
    const response = await request(app).get('/api/employees').query({ page: 1, pageSize: 10 });
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(10);
    expect(response.body.pagination).toMatchObject({ page: 1, pageSize: 10, total: expect.any(Number), totalPages: expect.any(Number) });
  });

  it('searches across employee names and email on the server', async () => {
    const response = await request(app).get('/api/employees').query({ search: 'avery.fixture.test@example.com' });
    expect(response.status).toBe(200);
    expect(response.body.data.map((item: { id: number }) => item.id)).toEqual([employeeId]);
  });

  it('filters by country, department, status, salary, and sorts by a whitelisted field', async () => {
    const response = await request(app).get('/api/employees').query({ country: 'US', department: 'Test Operations', status: 'ACTIVE', currency: 'USD', minSalary: 8000000, maxSalary: 9000000, sortBy: 'baseSalary', sortOrder: 'desc' });
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(employeeId);
    expect((await request(app).get('/api/employees').query({ sortBy: 'email' })).status).toBe(400);
  });

  it('rejects invalid query parameters and range combinations', async () => {
    expect((await request(app).get('/api/employees?page=0')).status).toBe(400);
    expect((await request(app).get('/api/employees?minSalary=90&maxSalary=10')).status).toBe(400);
  });

  it('returns employee detail and a structured not-found response', async () => {
    expect((await request(app).get('/api/employees/' + employeeId)).body.data.employeeCode).toBe('TEST-API-0001');
    const missing = await request(app).get('/api/employees/99999999');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  it('updates compensation and writes history atomically, then rejects stale versions', async () => {
    const initial = (await request(app).get('/api/employees/' + employeeId)).body.data as { version: number };
    const body = { baseSalaryMinor: 9000000, bonusMinor: 400000, currency: 'EUR', effectiveDate: '2025-06-01', expectedVersion: initial.version };
    const updated = await request(app).patch('/api/employees/' + employeeId + '/salary').send(body);
    expect(updated.status).toBe(200);
    expect(updated.body.data.baseSalaryMinor).toBe(body.baseSalaryMinor);
    expect(updated.body.data.version).toBe(initial.version + 1);
    const history = await request(app).get('/api/employees/' + employeeId + '/salary-history');
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(1);
    expect(history.body.data[0]).toMatchObject({
      previousBaseSalaryMinor: 8500000,
      newBaseSalaryMinor: 9000000,
      previousCurrency: 'USD',
      currency: 'EUR',
      changedBy: 'local-development-user'
    });
    expect((await request(app).patch('/api/employees/' + employeeId + '/salary').send(body)).status).toBe(409);
    expect((await request(app).get('/api/employees/' + employeeId + '/salary-history')).body.data).toHaveLength(1);
  });

  it('rolls back the current compensation when writing salary history fails', async () => {
    const current = (await request(app).get('/api/employees/' + employeeId)).body.data as { version: number; baseSalaryMinor: number; bonusMinor: number };
    await prisma.$executeRawUnsafe(`CREATE TRIGGER test_reject_history BEFORE INSERT ON SalaryHistory WHEN NEW.employeeId = ${employeeId} BEGIN SELECT RAISE(ABORT, 'forced history failure'); END`);
    try {
      const response = await request(app).patch('/api/employees/' + employeeId + '/salary').send({ baseSalaryMinor: 9500000, bonusMinor: 500000, currency: 'USD', effectiveDate: '2025-07-01', expectedVersion: current.version });
      expect(response.status).toBe(500);
      const after = await prisma.employee.findUniqueOrThrow({ where: { id: employeeId } });
      expect(after).toMatchObject({ version: current.version, baseSalaryMinor: current.baseSalaryMinor, bonusMinor: current.bonusMinor });
      expect(await prisma.salaryHistory.count({ where: { employeeId } })).toBe(1);
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS test_reject_history');
    }
  });

  it('rejects invalid salary amounts and unsupported currencies', async () => {
    const employee = (await request(app).get('/api/employees/' + employeeId)).body.data as { version: number };
    const payload = { baseSalaryMinor: -1, bonusMinor: 0, currency: 'USD', effectiveDate: '2025-06-01', expectedVersion: employee.version };
    expect((await request(app).patch('/api/employees/' + employeeId + '/salary').send(payload)).status).toBe(400);
    expect((await request(app).patch('/api/employees/' + employeeId + '/salary').send({ ...payload, baseSalaryMinor: 1, currency: 'XXX' })).status).toBe(400);
  });

  it('calculates dashboard metrics from persisted employee data', async () => {
    const summary = await request(app).get('/api/dashboard/summary');
    expect(summary.status).toBe(200);
    expect(summary.body.data.totalEmployees).toBeGreaterThan(0);
    expect(summary.body.data.activeEmployees).toBeGreaterThan(0);
    const usdAggregate = await prisma.employee.aggregate({ where: { currency: 'USD', employmentStatus: EmploymentStatus.ACTIVE }, _sum: { baseSalaryMinor: true }, _avg: { baseSalaryMinor: true }, _min: { baseSalaryMinor: true }, _max: { baseSalaryMinor: true } });
    const usdSummary = summary.body.data.salaryStatisticsByCurrency.find((item: { currency: string }) => item.currency === 'USD');
    expect(summary.body.data.annualBasePayrollByCurrency).toContainEqual({ currency: 'USD', amountMinor: usdAggregate._sum.baseSalaryMinor });
    expect(usdSummary.averageMinor).toBe(Math.round(usdAggregate._avg.baseSalaryMinor ?? 0));
    expect(usdSummary.minimumMinor).toBe(usdAggregate._min.baseSalaryMinor);
    expect(usdSummary.maximumMinor).toBe(usdAggregate._max.baseSalaryMinor);
    expect(usdSummary.medianMinor).toBeGreaterThanOrEqual(usdSummary.minimumMinor);
    expect(usdSummary.medianMinor).toBeLessThanOrEqual(usdSummary.maximumMinor);
    expect((await request(app).get('/api/dashboard/by-country')).status).toBe(200);
    expect((await request(app).get('/api/dashboard/by-department')).status).toBe(200);
    expect((await request(app).get('/api/dashboard/salary-distribution')).status).toBe(200);
  });
});
