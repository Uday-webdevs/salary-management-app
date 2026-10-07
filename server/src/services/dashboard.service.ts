import { prisma } from '../config/database.js';

export async function getDashboardSummary() {
  const [headcount, active, payroll, average, extrema, medians] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { employmentStatus: 'ACTIVE' } }),
    prisma.employee.groupBy({ by: ['currency'], where: { employmentStatus: 'ACTIVE' }, _sum: { baseSalaryMinor: true } }),
    prisma.employee.groupBy({ by: ['currency'], where: { employmentStatus: 'ACTIVE' }, _avg: { baseSalaryMinor: true } }),
    prisma.employee.groupBy({ by: ['currency'], where: { employmentStatus: 'ACTIVE' }, _min: { baseSalaryMinor: true }, _max: { baseSalaryMinor: true } }),
    prisma.$queryRaw<Array<{ currency: string; medianMinor: number }>>`
      WITH ranked AS (
        SELECT "currency", "baseSalaryMinor", ROW_NUMBER() OVER (PARTITION BY "currency" ORDER BY "baseSalaryMinor") AS row_num,
               COUNT(*) OVER (PARTITION BY "currency") AS row_count
        FROM "Employee" WHERE "employmentStatus" = 'ACTIVE'
      )
      SELECT "currency", AVG("baseSalaryMinor") AS "medianMinor" FROM ranked
      WHERE row_num IN ((row_count + 1) / 2, (row_count + 2) / 2) GROUP BY "currency" ORDER BY "currency"
    `
  ]);
  return {
    totalEmployees: headcount,
    activeEmployees: active,
    annualBasePayrollByCurrency: payroll.map((item) => ({ currency: item.currency, amountMinor: item._sum.baseSalaryMinor ?? 0 })),
    salaryStatisticsByCurrency: average.map((item) => {
      const bounds = extrema.find((entry) => entry.currency === item.currency);
      const median = medians.find((entry) => entry.currency === item.currency);
      return { currency: item.currency, averageMinor: Math.round(item._avg.baseSalaryMinor ?? 0), medianMinor: Math.round(median?.medianMinor ?? 0), minimumMinor: bounds?._min.baseSalaryMinor ?? 0, maximumMinor: bounds?._max.baseSalaryMinor ?? 0 };
    })
  };
}

export async function getCountryAnalytics() {
  const groups = await prisma.employee.groupBy({ by: ['countryCode', 'currency'], where: { employmentStatus: 'ACTIVE' }, _count: { _all: true }, _sum: { baseSalaryMinor: true } });
  const countries = await prisma.country.findMany({ select: { code: true, name: true } });
  const names = new Map(countries.map((country) => [country.code, country.name]));
  return groups.map((group) => ({ countryCode: group.countryCode, country: names.get(group.countryCode) ?? group.countryCode, currency: group.currency, headcount: group._count._all, annualBasePayrollMinor: group._sum.baseSalaryMinor ?? 0 })).sort((a, b) => a.country.localeCompare(b.country) || a.currency.localeCompare(b.currency));
}

export async function getDepartmentAnalytics() {
  const groups = await prisma.employee.groupBy({ by: ['departmentId', 'currency'], where: { employmentStatus: 'ACTIVE' }, _count: { _all: true }, _sum: { baseSalaryMinor: true }, _avg: { baseSalaryMinor: true } });
  const departments = await prisma.department.findMany({ select: { id: true, name: true } });
  const names = new Map(departments.map((department) => [department.id, department.name]));
  return groups.map((group) => ({ department: names.get(group.departmentId) ?? 'Unknown', currency: group.currency, headcount: group._count._all, annualBasePayrollMinor: group._sum.baseSalaryMinor ?? 0, averageSalaryMinor: Math.round(group._avg.baseSalaryMinor ?? 0) })).sort((a, b) => a.department.localeCompare(b.department) || a.currency.localeCompare(b.currency));
}

export async function getSalaryDistribution() {
  const rows = await prisma.$queryRaw<Array<{ currency: string; salaryBand: string; headcount: number }>>`
    SELECT "currency",
      CASE
        WHEN "currency" = 'INR' THEN CASE WHEN "baseSalaryMinor" < 80000000 THEN 'Under ₹800k' WHEN "baseSalaryMinor" < 150000000 THEN '₹800k–1.5m' WHEN "baseSalaryMinor" < 250000000 THEN '₹1.5m–2.5m' WHEN "baseSalaryMinor" < 400000000 THEN '₹2.5m–4m' ELSE '₹4m+' END
        WHEN "currency" = 'JPY' THEN CASE WHEN "baseSalaryMinor" < 4000000 THEN 'Under ¥4m' WHEN "baseSalaryMinor" < 8000000 THEN '¥4m–8m' WHEN "baseSalaryMinor" < 12000000 THEN '¥8m–12m' WHEN "baseSalaryMinor" < 18000000 THEN '¥12m–18m' ELSE '¥18m+' END
        ELSE CASE WHEN "baseSalaryMinor" < 3000000 THEN 'Under 30k' WHEN "baseSalaryMinor" < 6000000 THEN '30k–60k' WHEN "baseSalaryMinor" < 10000000 THEN '60k–100k' WHEN "baseSalaryMinor" < 15000000 THEN '100k–150k' ELSE '150k+' END
      END AS "salaryBand",
      MIN("baseSalaryMinor") AS "firstSalary",
      COUNT(*) AS headcount
    FROM "Employee" WHERE "employmentStatus" = 'ACTIVE'
    GROUP BY "currency", "salaryBand" ORDER BY "currency", "firstSalary"
  `;
  return rows.map((row) => ({ currency: row.currency, salaryBand: row.salaryBand, headcount: Number(row.headcount) }));
}
