# AI Usage Record

## Master instruction (formatted summary of the supplied request)

Build a production-quality Employee Salary Management System for an HR Manager supporting 10,000 employees across countries. Use React, TypeScript, Vite, Tailwind, Express, TypeScript, SQLite, Prisma, Zod, and meaningful backend/frontend tests. Implement a server-paginated/searchable/filterable/sortable directory, employee details, salary updates with validation, atomic salary history, optimistic concurrency, database-backed currency-aware dashboard analytics, and deterministic exactly-10,000 seed data. Include requirements, architecture, trade-off, performance, AI-usage, and setup documentation. Configure linting but do not run it. Verify migrations, seed, tests, type checking, and production build where the environment permits; never claim unverified behavior. Do not create Git commits. Keep the architecture pragmatic and review for data integrity, monetary precision, security, query efficiency, accessibility, and API contract consistency.

## Assistance used in this repository

- The user-provided master instruction above guided product scope, stack selection, implementation phases, verification, and documentation.
- AI assistance drafted requirements and architecture decisions, Prisma schema and migration inputs, server/client modules, deterministic seed logic, UI components, tests, and the documentation in this repository.
- The implementation used an incremental workflow: requirements/plan first; repository setup; persistence and API; client workflows; tests and operational documents.

## Review and verification record

- Automated TypeScript checking, migration, seed execution, tests, production dependency audit, and production build were run during this task; detailed results are in the delivery summary.
- The implementation has been reviewed during generation for integer money storage, server-side pagination/aggregation, query whitelisting, transaction boundaries, stale-write behavior, and whether cross-currency totals are misleading.
- No independent human code review is recorded here. The repository should receive normal maintainer review before deployment.
- `npm audit --omit=dev` reported zero production dependency vulnerabilities after a non-forced npm audit fix. The full audit still reports two moderate findings in development-only Vitest tooling; resolving them requires the Vitest 5 major upgrade and was deferred.
- No benchmark or independent human reviewer is claimed.
- A dashboard integration test exposed a BigInt JSON serialization failure from SQLite's raw aggregate result. The response mapping was narrowed to explicit fields and counts are converted to numbers before HTTP serialization.
- Prisma's default generated-client location hit a Windows file-rename error in this environment. The client uses a repository-local generated output folder; the server build copies it beside compiled code.
- A compiled-server smoke test caught Prisma resolving the relative SQLite path under `dist/prisma` after copying its generated client. The build copy step now adjusts the generated client's relative schema path so compiled and source servers use the same migrated database.
- Review caught that one history currency code could mislabel the previous amount when an edit changes currency. Salary history now stores the previous currency separately; the view only computes a salary delta when both currency codes match.

## Known generated-code risks to review

- This is an unauthenticated assessment app. Salary change history records `changedBy: null`; do not expose it to an untrusted network.
- Seed salaries are synthetic demonstration values and must never be treated as real compensation data.
- Cross-currency payroll is intentionally not summed. A common-currency view requires an approved rate source and policy.
