# Employee Salary Management System Requirements

## Goal

Replace spreadsheet-based salary tracking with a reliable internal web application for finding employees, reviewing compensation, recording salary changes, and understanding salary distribution across a 10,000-person international organization.

## User and problem

The primary user is an HR Manager. Today, salary information lives in Excel, making employee lookup, consistent updates, change history, and organization-wide analysis difficult and error-prone.

## Scope and core features

- A dashboard with database-backed workforce and annual base-payroll metrics, country and department breakdowns, and salary distribution.
- An employee directory with server-side pagination, search, country/department/status/salary filters, and whitelisted sorting.
- Employee details with personal, employment, current compensation, and salary history information.
- Salary updates for base salary, bonus, currency, and effective date, with server and client validation, optimistic concurrency, and atomic history recording.
- A reproducible seed command that creates exactly 10,000 employees.
- API, database, frontend, tests, operational setup, and documentation in one repository.

## Non-functional requirements

- Strict TypeScript and validated API boundaries; consistent errors; safe database access; unique employee codes/emails; relational integrity and query-oriented indexes.
- Money stored as integer minor units to avoid floating-point persistence errors. Cross-country salary aggregates are reported by currency and are not converted to a common currency.
- Directory operations and analytics run in the backend/database, not over a 10,000-row browser payload.
- Responsive, keyboard-accessible HR workflows with clear loading, empty, error, and success states.
- Deterministic tests and seed data; documented setup and trade-offs.

## Assumptions and decisions

- SQLite is appropriate for this self-contained assessment and dataset; use Prisma unless an existing suitable persistence layer is present.
- Currency uses ISO 4217 codes supported by the app. Dashboard payroll and salary metrics mean base salary; bonus is shown separately. Cross-currency sums/averages are grouped by currency because no exchange-rate source or valuation date is specified.
- Salary update requests include the employee's current `updatedAt` value. A stale value returns HTTP 409 instead of overwriting a newer edit.
- Authentication is excluded, so salary history records `changedBy` as null and the limitation is explicit. This app is an internal assessment system, not ready for exposure as an unauthenticated production service.
- Department and country are normalized reference entities; current salary remains on the employee for straightforward filtering, with historical changes in an append-only salary-history table.

## Out of scope

Payroll execution, tax and benefits calculations, employee self-service, authentication/RBAC, approval workflows, and external payroll or exchange-rate integrations. These require policy, identity, or external-system decisions beyond the stated HR assessment workflow.
