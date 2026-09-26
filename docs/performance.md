# Performance Notes

## Dataset and directory

The supported seed creates exactly 10,000 reproducible employee rows. The default directory page is 25 rows, with 10/25/50/100 options. The client sends filters and sort options to `GET /api/employees`; Prisma runs a filtered count and a bounded `findMany` in parallel. The response contains only one page and count metadata.

Employee code and email are unique indexes. Name lookup has a composite last-name/first-name index. Country/status, department/status, employment status, and base salary have indexes for common filtering and sorting. Relation names are resolved using indexed foreign keys. The current API issues two directory queries (count and page) and includes country and department through Prisma relations; it does not issue one query per row.

Search checks employee code, first name, last name, and email. It is a contains search, so ordinary B-tree indexes do not guarantee efficient substring matching. This is acceptable for the current 10,000-row assessment; use full-text search or a measured search index if this becomes a bottleneck.

## Dashboard

Headcount, payroll sums, averages, minimums, maximums, department and country groups are calculated in SQLite/Prisma. Median uses a partitioned SQL window query that returns one row per currency, not all employee salaries. Salary distribution returns a small grouped result. The UI gets summary data and the three breakdown endpoints in parallel and renders only aggregate rows.

## Frontend rendering and limits

The employee table renders at most 100 rows per page. Filters and search are debounced or applied as controls change; no 10,000-row array is held by React. Dashboard charts consume grouped rows (countries, departments, salary bands).

No latency or query-plan benchmark was performed. SQLite write serialization and substring search are the most likely bottlenecks if usage grows. For higher concurrency or substantially larger data, review `EXPLAIN QUERY PLAN` against real query patterns, measure representative workloads, move to a server database when operational needs justify it, and consider full-text search or cursor pagination based on evidence.
