import { PrismaClient, type EmploymentStatus } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();
const countries = [
  { code: 'US', name: 'United States', currency: 'USD' }, { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'DE', name: 'Germany', currency: 'EUR' }, { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'CA', name: 'Canada', currency: 'CAD' }, { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' }, { code: 'JP', name: 'Japan', currency: 'JPY' }
];
const departmentNames = ['Engineering', 'Product', 'People', 'Finance', 'Sales', 'Marketing', 'Operations', 'Customer Success'];
const firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Jamie', 'Cameron', 'Priya', 'Maya', 'Oliver', 'Noah', 'Amara', 'Ethan'];
const lastNames = ['Smith', 'Patel', 'Garcia', 'Chen', 'Brown', 'Khan', 'Wilson', 'Singh', 'Miller', 'Sharma', 'Kim', 'Lopez', 'Davis', 'Martin', 'Taylor', 'Nguyen'];
const statuses: EmploymentStatus[] = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ON_LEAVE', 'TERMINATED'];
const titles: Record<string, string[]> = {
  Engineering: ['Software Engineer', 'Senior Software Engineer', 'Staff Engineer', 'Engineering Manager'], Product: ['Product Analyst', 'Product Manager', 'Senior Product Manager'],
  People: ['People Partner', 'Recruiter', 'HR Manager'], Finance: ['Financial Analyst', 'Accountant', 'Finance Manager'], Sales: ['Account Executive', 'Sales Manager', 'Solutions Consultant'],
  Marketing: ['Marketing Specialist', 'Content Strategist', 'Marketing Manager'], Operations: ['Operations Analyst', 'Program Manager', 'Operations Manager'],
  'Customer Success': ['Customer Success Manager', 'Support Specialist', 'Implementation Consultant']
};
const annualSalaryRanges: Record<string, { base: number; spread: number; minorUnit: number }> = {
  US: { base: 55_000, spread: 125_000, minorUnit: 100 }, GB: { base: 36_000, spread: 95_000, minorUnit: 100 },
  DE: { base: 40_000, spread: 110_000, minorUnit: 100 }, IN: { base: 700_000, spread: 3_500_000, minorUnit: 100 },
  CA: { base: 50_000, spread: 110_000, minorUnit: 100 }, AU: { base: 60_000, spread: 130_000, minorUnit: 100 },
  SG: { base: 50_000, spread: 120_000, minorUnit: 100 }, JP: { base: 4_000_000, spread: 14_000_000, minorUnit: 1 }
};

async function main() {
  await prisma.salaryHistory.deleteMany();
  await prisma.employee.deleteMany();
  for (const country of countries) await prisma.country.upsert({ where: { code: country.code }, update: country, create: country });
  for (const name of departmentNames) await prisma.department.upsert({ where: { name }, update: {}, create: { name } });
  const departments = await prisma.department.findMany();
  const countryCurrency = new Map(countries.map((country) => [country.code, country.currency]));
  const departmentByName = new Map(departments.map((department) => [department.name, department.id]));
  const rows = Array.from({ length: 10_000 }, (_, index) => {
    const country = countries[(index * 13 + Math.floor(index / 17)) % countries.length]!;
    const department = departmentNames[(index * 7 + Math.floor(index / 9)) % departmentNames.length]!;
    const firstName = firstNames[(index * 5 + Math.floor(index / 11)) % firstNames.length]!;
    const lastName = lastNames[(index * 3 + Math.floor(index / 7)) % lastNames.length]!;
    const seed = (index * 9301 + 49297) % 233280;
    const salaryRange = annualSalaryRanges[country.code]!;
    const salaryMajor = salaryRange.base + Math.floor(seed / 233_280 * salaryRange.spread);
    const baseSalaryMinor = salaryMajor * salaryRange.minorUnit;
    const bonusMinor = Math.floor(baseSalaryMinor * ((index % 6) / 100));
    const hireDate = new Date(Date.UTC(2015 + (index % 11), index % 12, (index % 27) + 1));
    return {
      employeeCode: `EMP-${String(index + 1).padStart(5, '0')}`,
      firstName, lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${String(index + 1).padStart(5, '0')}@example.com`,
      countryCode: country.code, departmentId: departmentByName.get(department)!, jobTitle: titles[department]![index % titles[department]!.length]!,
      employmentStatus: statuses[(index * 3 + Math.floor(index / 19)) % statuses.length]!, hireDate,
      currency: countryCurrency.get(country.code)!, baseSalaryMinor, bonusMinor,
      salaryEffectiveDate: new Date(Date.UTC(2024 + (index % 3), index % 12, 1))
    };
  });
  for (let offset = 0; offset < rows.length; offset += 1000) {
    await prisma.employee.createMany({ data: rows.slice(offset, offset + 1000) });
  }
  const count = await prisma.employee.count();
  if (count !== 10_000) throw new Error(`Seed verification failed: expected 10000 employees, found ${count}`);
  console.info(`Seeded exactly ${count} employees.`);
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
