-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Employee" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "employmentStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "hireDate" DATETIME NOT NULL,
    "currency" TEXT NOT NULL,
    "baseSalaryMinor" INTEGER NOT NULL,
    "bonusMinor" INTEGER NOT NULL,
    "salaryEffectiveDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "Employee_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country" ("code") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Employee" ("baseSalaryMinor", "bonusMinor", "countryCode", "createdAt", "currency", "departmentId", "email", "employeeCode", "employmentStatus", "firstName", "hireDate", "id", "jobTitle", "lastName", "salaryEffectiveDate", "updatedAt") SELECT "baseSalaryMinor", "bonusMinor", "countryCode", "createdAt", "currency", "departmentId", "email", "employeeCode", "employmentStatus", "firstName", "hireDate", "id", "jobTitle", "lastName", "salaryEffectiveDate", "updatedAt" FROM "Employee";
DROP TABLE "Employee";
ALTER TABLE "new_Employee" RENAME TO "Employee";
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");
CREATE INDEX "Employee_lastName_firstName_idx" ON "Employee"("lastName", "firstName");
CREATE INDEX "Employee_countryCode_employmentStatus_idx" ON "Employee"("countryCode", "employmentStatus");
CREATE INDEX "Employee_departmentId_employmentStatus_idx" ON "Employee"("departmentId", "employmentStatus");
CREATE INDEX "Employee_baseSalaryMinor_idx" ON "Employee"("baseSalaryMinor");
CREATE INDEX "Employee_employmentStatus_idx" ON "Employee"("employmentStatus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
