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

Before deployment, use the [production readiness checklist](docs/production-readiness.md) to track required implementation and operational work.

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

Local development uses an explicit local developer identity so the app can run without an identity provider. The development server binds to loopback only. Before production, set `NODE_ENV=production`, `AUTH_MODE=oidc`, the OIDC settings described below, and an HTTPS `CLIENT_ORIGIN`; production startup rejects development authentication and missing OIDC credentials.

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
- `GET /api/employees/:id/salary-history` (audit administrators only)
- `GET /api/employees/countries` and `GET /api/employees/departments`
- `GET /api/dashboard/summary`, `by-country`, `by-department`, and `salary-distribution`

Salary values and salary bounds in API requests are integer minor units (USD 1.00 is 100; JPY 1 is 1). Salary updates include `expectedVersion` from the latest employee response. Errors use `{ error: { code, message, details? } }`; a stale version returns HTTP 409. Dashboard aggregations are grouped by currency.

Salary history records both the previous and new currency codes so a currency change never relabels the old amount or produces a cross-currency delta.

## Authentication and authorization

The server uses OpenID Connect Authorization Code Flow for organization sign-in and requests `prompt=consent` on each sign-in attempt, asking Entra to show its app-consent prompt after authentication. Tenant consent policies may require an administrator to approve the requested permissions. Configure `AUTH_ISSUER_URL`, `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, and a random `AUTH_SESSION_SECRET` of at least 32 characters in the deployment secret store. `AUTH_ISSUER_URL` normally uses the authority root (for Microsoft Entra ID, `https://login.microsoftonline.com/<tenant-id>/v2.0`); if you paste its full `/.well-known/openid-configuration` URL, the server removes that suffix automatically. `CLIENT_ORIGIN` is the public app origin and must use HTTPS in production. Register `${CLIENT_ORIGIN}/api/auth/callback` as the OIDC callback and `${CLIENT_ORIGIN}/` as the post-logout return URL. The app session cookie is HTTP-only, secure in production, SameSite=Lax, and has a 30-minute idle and 8-hour absolute lifetime.

Configure Entra to emit the role claim named by `AUTH_ROLE_CLAIM` in the ID token and assign the application roles. `AUTH_READ_ROLE` grants employee and dashboard read access. `AUTH_EDIT_ROLE` grants those read permissions plus compensation updates. `AUTH_AUDIT_ROLE` (default `salary:audit:admin`) grants employee read access and salary-history access; only this role can view history. The API enforces each permission independently of the UI. New history rows store the OIDC subject plus Entra tenant ID and user object ID so an administrator can resolve the actor in the correct tenant.

In development, `AUTH_MODE=development` supplies a local developer identity with read, edit, and audit access; this mode cannot be used with `NODE_ENV=production`. Existing history rows can have null attribution because there is no trustworthy way to backfill their original actors. History is retained for three years from `changedAt`; the API purges expired rows at startup and once per day. Employee deletion is restricted while salary history exists.

## Testing and verification

Apply migrations and seed before running tests. API integration tests use the configured local SQLite database, insert a uniquely named fixture employee, then remove it. Tests cover directory query behavior, validation, details, salary/history/concurrency, and analytics. Frontend tests cover directory results, search/filter requests, API error recovery, and salary form validation/update behavior.

## Decisions and limitations

- SQLite keeps the assessment self-contained. A multi-instance production HR service would need an operationally managed database such as PostgreSQL.
- OIDC authentication, reader/editor API authorization, audit-administrator-only history access, actor attribution, and three-year history retention are implemented. Entra role assignment and retention behavior still need deployment verification. Approval workflows, payroll execution, tax/benefits, and external payroll/FX integrations remain out of scope.
- Salary metrics remain in native currency; no FX conversion is available.
- Seed records are synthetic and must not be mistaken for real compensation.
- The dependency audit remediation removed the high-severity Prisma config advisory. The remaining audit findings are moderate and development-only in Vitest tooling; npm reports that its fix requires a Vitest 5 major upgrade, so the test runner should be upgraded and reverified as a separate change.

## Suggested next work

Validate audit role assignments and the three-year retention policy in deployment, add an approval workflow if organization policy requires it, add a currency conversion policy only if finance requires consolidated reporting, and measure query plans under representative load before tuning.

## Suggested commit boundaries

1. `docs: define salary management requirements and architecture`
2. `feat(server): add employee API and salary audit transactions`
3. `feat(server): add currency-aware workforce analytics`
4. `feat(client): add HR directory and compensation dashboard`
5. `test: cover salary workflows and analytics`
