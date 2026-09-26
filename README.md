# PeopleOS · Employee Salary Management

An internal HR workspace for employee lookup, compensation updates, auditable salary history, and organization-wide pay insights. The app is designed around a reproducible 10,000 employee dataset and keeps directory queries and analytics on the server.

## Features

- Dashboard with total and active headcount, annual base payroll, average/median/minimum/maximum salary, and country/department/distribution views.
- Employee directory with server-side pagination, search, country, department, status, currency, salary bounds, and whitelisted sorting.
- Employee profile with employment and compensation details plus salary change history.
- Salary update validation, integer minor-unit money, atomic history creation, and stale-write conflicts using a version counter.
- Deterministic idempotent seed that replaces the current employee dataset with exactly 10,000 rows.

Dashboard payroll and salary statistics use **base salary only**, include active employees only, and are reported by each employee's native currency. Amounts in different currencies are never added or averaged together.

## Architecture and stack

React + TypeScript + Vite + Tailwind CSS client → JSON REST API → Express controllers and services → Prisma repositories → SQLite. Zod validates request input. Recharts provides dashboard visualizations. See [architecture](docs/architecture.md), [trade-offs](docs/tradeoffs.md), and [performance notes](docs/performance.md).

## Project structure

```text
client/                 React application and feature components
server/src/             Express app, routes, controllers, services, repositories
server/prisma/           Prisma schema, migrations, deterministic seed
docs/                    Requirements, plan, architecture, trade-offs, performance, AI usage
package.json             Root workspace and common commands
```

## Prerequisites and setup

- Node.js 20+ and npm.
- SQLite is embedded; no separate database service is needed.

From the repository root:

```powershell
npm install
Copy-Item server/env.example server/.env
npm run db:generate -w server
npm run db:migrate
npm run seed
```

The server reads `DATABASE_URL`, `PORT`, `CLIENT_ORIGIN`, and `NODE_ENV` from `server/.env`. Defaults are in [server/env.example](server/env.example). Never commit `.env`.

The seed resets the employee/history rows before inserting its deterministic dataset. Do not run it against a database containing real HR data.

## Development and scripts

```powershell
npm run dev          # API on :4000 and Vite on :5173
npm run typecheck    # strict TypeScript checks for both workspaces
npm run test         # API integration tests, then UI behavior tests
npm run build        # create both production builds
npm run lint         # configured lint command (intentionally not run for this task)
```

For an already migrated database, `npm run build` uses the generated Prisma client. After applying migrations that change the schema, run `npm run db:generate -w server` before type checking or building.

To apply migrations in a deployment environment, use `npm run db:deploy -w server`. After building, set `NODE_ENV=production` and start the API with `npm run start -w server`; Express serves the built client and the REST API from the same origin. In development, Vite proxies `/api` to port 4000.

Lint is configured with ESLint 9 and typescript-eslint. Per request, lint was not run; run `npm run lint` to check it.

## Database

`npm run db:migrate` applies the checked-in Prisma migrations to the SQLite database. `npm run db:generate -w server` generates the Prisma client. `npm run seed` creates exactly 10,000 employees with stable codes/emails and varied countries, departments, status, roles, salaries, and dates. The seed is repeatable: each run replaces seeded employee and salary-history rows.

## API overview

- `GET /api/employees?page=1&pageSize=25&search=alice&country=IN&department=Engineering&status=ACTIVE&currency=INR&minSalary=5000000&maxSalary=15000000&sortBy=baseSalary&sortOrder=desc`
- `GET /api/employees/:id`
- `PATCH /api/employees/:id/salary`
- `GET /api/employees/:id/salary-history`
- `GET /api/employees/countries` and `GET /api/employees/departments`
- `GET /api/dashboard/summary`, `by-country`, `by-department`, and `salary-distribution`

Salary values and salary bounds in API requests are integer minor units (USD 1.00 is 100; JPY 1 is 1). Salary updates include `expectedVersion` from the latest employee response. Errors use `{ error: { code, message, details? } }`; a stale version returns HTTP 409. Dashboard aggregations are grouped by currency.

Salary history records both the previous and new currency codes so a currency change never relabels the old amount or produces a cross-currency delta.

## Testing and verification

Apply migrations and seed before running tests. API integration tests use the configured local SQLite database, insert a uniquely named fixture employee, then remove it. Tests cover directory query behavior, validation, details, salary/history/concurrency, and analytics. Frontend tests cover directory results, search/filter requests, API error recovery, and salary form validation/update behavior.

## Decisions and limitations

- SQLite keeps the assessment self-contained. A multi-instance production HR service would need an operationally managed database such as PostgreSQL.
- Authentication, RBAC, approvals, payroll execution, tax/benefits, and external payroll/FX integrations are out of scope. This unauthenticated app is not safe to expose outside a trusted local environment.
- Salary history has a nullable actor because there is no real authentication context.
- Salary metrics remain in native currency; no FX conversion is available.
- Seed records are synthetic and must not be mistaken for real compensation.
- The dependency audit remediation removed the high-severity Prisma config advisory. The remaining audit findings are moderate and development-only in Vitest tooling; npm reports that its fix requires a Vitest 5 major upgrade, so the test runner should be upgraded and reverified as a separate change.

## Suggested next work

Add SSO and policy-based authorization, validate audit retention requirements, add a currency conversion policy only if finance requires consolidated reporting, and measure query plans under representative load before tuning.

## Suggested commit boundaries

1. `docs: define salary management requirements and architecture`
2. `feat(server): add employee API and salary audit transactions`
3. `feat(server): add currency-aware workforce analytics`
4. `feat(client): add HR directory and compensation dashboard`
5. `test: cover salary workflows and analytics`
