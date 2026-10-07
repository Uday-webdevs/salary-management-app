import 'dotenv/config';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { PrismaClient } from '../src/generated/prisma/index.js';

const sourcePath = resolve(process.argv[2] ?? 'prisma/dev.db');
const source = new DatabaseSync(sourcePath, { readOnly: true });
source.exec('PRAGMA query_only = ON');

const target = new PrismaClient();
const tableNames = ['Country', 'Department', 'Employee', 'SalaryHistory'];
const allowedEmploymentStatuses = new Set(['ACTIVE', 'ON_LEAVE', 'TERMINATED']);
const verifyOnly = process.argv[3] === '--verify-only';

function readRows(tableName) {
  const columns = new Set(source.prepare(`PRAGMA table_info("${tableName}")`).all().map((column) => column.name));
  if (columns.size === 0) throw new Error(`Required SQLite table is missing: ${tableName}`);
  const orderBy = tableName === 'Country' ? 'code' : 'id';
  return source.prepare(`SELECT * FROM "${tableName}" ORDER BY "${orderBy}"`).all().map((row) => ({ row, columns }));
}

function required(row, columns, name, tableName) {
  if (!columns.has(name) || row[name] === null || row[name] === undefined) {
    throw new Error(`Required source field is missing: ${tableName}.${name}`);
  }
  return row[name];
}

function asDate(value, fieldName) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)) {
    value = `${value.replace(' ', 'T')}Z`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date value in source field: ${fieldName}`);
  return date;
}

function optional(row, columns, name) {
  return columns.has(name) ? row[name] ?? null : null;
}

async function createInBatches(tx, delegate, rows) {
  for (let offset = 0; offset < rows.length; offset += 500) {
    await tx[delegate].createMany({ data: rows.slice(offset, offset + 500) });
  }
}

async function setSequenceToMax(tx, tableName) {
  await tx.$queryRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), ` +
      `GREATEST(COALESCE((SELECT MAX("id") FROM "${tableName}"), 1), 1), ` +
      `EXISTS(SELECT 1 FROM "${tableName}"))`
  );
}

function fingerprint(rows, fields) {
  const canonicalRows = rows.map((row) => fields.map((field) => {
    const value = row[field];
    return value instanceof Date ? value.toISOString() : value;
  }));
  return createHash('sha256').update(JSON.stringify(canonicalRows)).digest('hex');
}

async function verifyTarget(sourceCounts, sourceData) {
  const counts = await Promise.all([
    target.country.count(),
    target.department.count(),
    target.employee.count(),
    target.salaryHistory.count()
  ]);
  const expectedCounts = tableNames.map((name) => sourceCounts[name]);
  if (counts.some((count, index) => count !== expectedCounts[index])) {
    throw new Error('PostgreSQL row counts do not match the SQLite source.');
  }

  const targetData = await Promise.all([
    target.country.findMany({ orderBy: { code: 'asc' } }),
    target.department.findMany({ orderBy: { id: 'asc' } }),
    target.employee.findMany({ orderBy: { id: 'asc' } }),
    target.salaryHistory.findMany({ orderBy: { id: 'asc' } })
  ]);
  const fields = [
    ['code', 'name', 'currency'],
    ['id', 'name'],
    ['id', 'employeeCode', 'firstName', 'lastName', 'email', 'countryCode', 'departmentId', 'jobTitle', 'employmentStatus', 'hireDate', 'currency', 'baseSalaryMinor', 'bonusMinor', 'salaryEffectiveDate', 'createdAt', 'updatedAt', 'version'],
    ['id', 'employeeId', 'previousBaseSalaryMinor', 'newBaseSalaryMinor', 'previousBonusMinor', 'newBonusMinor', 'previousCurrency', 'currency', 'effectiveDate', 'changedAt', 'changedBy', 'changedByTenantId', 'changedByObjectId', 'changedByName']
  ];
  for (let index = 0; index < tableNames.length; index += 1) {
    if (fingerprint(sourceData[index], fields[index]) !== fingerprint(targetData[index], fields[index])) {
      throw new Error(`Imported values do not match in table ${tableNames[index]}.`);
    }
  }
  return counts;
}

async function main() {
  const sourceRows = Object.fromEntries(tableNames.map((name) => [name, readRows(name)]));
  const sourceCounts = Object.fromEntries(tableNames.map((name) => [name, sourceRows[name].length]));
  if (Object.values(sourceCounts).every((count) => count === 0)) {
    throw new Error('The four application tables in the SQLite source are empty; no data was imported.');
  }

  const targetCounts = await Promise.all([
    target.country.count(),
    target.department.count(),
    target.employee.count(),
    target.salaryHistory.count()
  ]);
  if (!verifyOnly && targetCounts.some((count) => count !== 0)) {
    throw new Error('The PostgreSQL target is not empty. Import stopped without changing either database.');
  }

  const countries = sourceRows.Country.map(({ row, columns }) => ({
    code: required(row, columns, 'code', 'Country'),
    name: required(row, columns, 'name', 'Country'),
    currency: required(row, columns, 'currency', 'Country')
  }));

  const departments = sourceRows.Department.map(({ row, columns }) => ({
    id: required(row, columns, 'id', 'Department'),
    name: required(row, columns, 'name', 'Department')
  }));

  const employees = sourceRows.Employee.map(({ row, columns }) => {
    const employmentStatus = required(row, columns, 'employmentStatus', 'Employee');
    if (!allowedEmploymentStatuses.has(employmentStatus)) {
      throw new Error('The SQLite source contains an unknown employment status; import stopped.');
    }
    return {
      id: required(row, columns, 'id', 'Employee'),
      employeeCode: required(row, columns, 'employeeCode', 'Employee'),
      firstName: required(row, columns, 'firstName', 'Employee'),
      lastName: required(row, columns, 'lastName', 'Employee'),
      email: required(row, columns, 'email', 'Employee'),
      countryCode: required(row, columns, 'countryCode', 'Employee'),
      departmentId: required(row, columns, 'departmentId', 'Employee'),
      jobTitle: required(row, columns, 'jobTitle', 'Employee'),
      employmentStatus,
      hireDate: asDate(required(row, columns, 'hireDate', 'Employee'), 'Employee.hireDate'),
      currency: required(row, columns, 'currency', 'Employee'),
      baseSalaryMinor: required(row, columns, 'baseSalaryMinor', 'Employee'),
      bonusMinor: required(row, columns, 'bonusMinor', 'Employee'),
      salaryEffectiveDate: asDate(required(row, columns, 'salaryEffectiveDate', 'Employee'), 'Employee.salaryEffectiveDate'),
      createdAt: asDate(required(row, columns, 'createdAt', 'Employee'), 'Employee.createdAt'),
      updatedAt: asDate(required(row, columns, 'updatedAt', 'Employee'), 'Employee.updatedAt'),
      version: columns.has('version') ? row.version : 1
    };
  });

  const salaryHistory = sourceRows.SalaryHistory.map(({ row, columns }) => ({
    id: required(row, columns, 'id', 'SalaryHistory'),
    employeeId: required(row, columns, 'employeeId', 'SalaryHistory'),
    previousBaseSalaryMinor: required(row, columns, 'previousBaseSalaryMinor', 'SalaryHistory'),
    newBaseSalaryMinor: required(row, columns, 'newBaseSalaryMinor', 'SalaryHistory'),
    previousBonusMinor: required(row, columns, 'previousBonusMinor', 'SalaryHistory'),
    newBonusMinor: required(row, columns, 'newBonusMinor', 'SalaryHistory'),
    previousCurrency: optional(row, columns, 'previousCurrency'),
    currency: required(row, columns, 'currency', 'SalaryHistory'),
    effectiveDate: asDate(required(row, columns, 'effectiveDate', 'SalaryHistory'), 'SalaryHistory.effectiveDate'),
    changedAt: asDate(required(row, columns, 'changedAt', 'SalaryHistory'), 'SalaryHistory.changedAt'),
    changedBy: optional(row, columns, 'changedBy'),
    changedByTenantId: optional(row, columns, 'changedByTenantId'),
    changedByObjectId: optional(row, columns, 'changedByObjectId'),
    changedByName: optional(row, columns, 'changedByName')
  }));

  if (!verifyOnly) {
    await target.$transaction(async (tx) => {
      await createInBatches(tx, 'country', countries);
      await createInBatches(tx, 'department', departments);
      await createInBatches(tx, 'employee', employees);
      await createInBatches(tx, 'salaryHistory', salaryHistory);
      await setSequenceToMax(tx, 'Department');
      await setSequenceToMax(tx, 'Employee');
      await setSequenceToMax(tx, 'SalaryHistory');
    }, { timeout: 120_000 });
  }

  const importedCounts = await verifyTarget(sourceCounts, [countries, departments, employees, salaryHistory]);

  console.info(`SQLite data ${verifyOnly ? 'and PostgreSQL values verified' : 'imported; row counts and values verified'} (Country, Department, Employee, SalaryHistory):`);
  console.info(importedCounts.join(', '));
}

try {
  await main();
} catch {
  console.error('SQLite import failed. No row contents or credentials were logged; inspect the script and database state before retrying.');
  process.exitCode = 1;
} finally {
  source.close();
  await target.$disconnect();
}
