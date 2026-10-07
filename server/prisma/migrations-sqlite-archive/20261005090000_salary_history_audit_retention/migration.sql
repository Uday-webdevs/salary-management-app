-- Recreate SalaryHistory to add actor mapping fields and preserve history when an employee is deleted.
CREATE TABLE "new_SalaryHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" INTEGER NOT NULL,
    "previousBaseSalaryMinor" INTEGER NOT NULL,
    "newBaseSalaryMinor" INTEGER NOT NULL,
    "previousBonusMinor" INTEGER NOT NULL,
    "newBonusMinor" INTEGER NOT NULL,
    "previousCurrency" TEXT,
    "currency" TEXT NOT NULL,
    "effectiveDate" DATETIME NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT,
    "changedByTenantId" TEXT,
    "changedByObjectId" TEXT,
    "changedByName" TEXT,
    CONSTRAINT "SalaryHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_SalaryHistory" (
    "id",
    "employeeId",
    "previousBaseSalaryMinor",
    "newBaseSalaryMinor",
    "previousBonusMinor",
    "newBonusMinor",
    "previousCurrency",
    "currency",
    "effectiveDate",
    "changedAt",
    "changedBy"
)
SELECT
    "id",
    "employeeId",
    "previousBaseSalaryMinor",
    "newBaseSalaryMinor",
    "previousBonusMinor",
    "newBonusMinor",
    "previousCurrency",
    "currency",
    "effectiveDate",
    "changedAt",
    "changedBy"
FROM "SalaryHistory";

DROP TABLE "SalaryHistory";
ALTER TABLE "new_SalaryHistory" RENAME TO "SalaryHistory";

CREATE INDEX "SalaryHistory_employeeId_changedAt_idx" ON "SalaryHistory"("employeeId", "changedAt");
CREATE INDEX "SalaryHistory_changedAt_idx" ON "SalaryHistory"("changedAt");
