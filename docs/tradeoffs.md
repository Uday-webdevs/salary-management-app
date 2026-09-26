# Engineering Trade-offs

## SQLite and deployment

SQLite keeps this assessment easy to run locally, backs relational constraints and indexes, and is sufficient for the seeded 10,000 records and a single HR workspace. It allows concurrent reads but serializes writes; it is not the default choice for a multi-instance or write-heavy production HR system. A production deployment with multiple application instances, backups, high availability, and stricter operational controls would likely use managed PostgreSQL.

## REST and server-side work

REST gives the directory and dashboard a small, explicit API contract. Pagination, filters, sorting, and organizational aggregates run in the database. Sorting accepts a fixed enum mapped to Prisma order clauses. A cursor-based API may be preferable for very deep pagination, but the requested page-number interface is practical for 10,000 employees.

## Relational design and indexes

Country and department names are reference records, with foreign keys from employees. Current compensation is kept on Employee to make list filters efficient; SalaryHistory is append-only through application behavior and keeps old/new currencies so edits remain legible when currency changes. Unique indexes protect employee code and email. Additional indexes cover salary ordering/ranges, status, and country/department plus status. Search uses name/code/email contains matching; at much larger scale it may need a dedicated full-text index.

## Money and currency

Money uses integer minor units. Supported currencies currently follow the two-minor-unit convention except JPY, which has no fractional minor unit. Dashboard payroll, mean, median, range, and department/country salary measures are grouped by currency. They are not converted, and the UI makes this visible. A real cross-country budget view would require an approved FX provider, exchange-rate date, rounding policy, and reporting currency.

## Audit and identity

Salary updates and history inserts share a database transaction. A monotonically incremented version prevents stale edits from overwriting newer compensation. Authentication, RBAC, approval, and a trustworthy employee identity provider are not implemented; `changedBy` is therefore null. Do not expose this unauthenticated application to an untrusted network. A production HR service needs SSO, role checks, authorization at every API boundary, protected audit retention, and policy-led approvals.

## Scaling beyond this assessment

At 10,000 rows, database pagination and indexed filters are adequate and avoid sending every record to the browser. With larger datasets or multiple writers, move to managed PostgreSQL, review actual query plans and indexes, consider full-text search and cursor pagination, and add connection pooling, backups, monitoring, and authorization. No benchmark is claimed here; the implementation favors bounded query shapes over infrastructure added without a measured bottleneck.
