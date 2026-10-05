# Production Readiness Checklist

Use this checklist before exposing the salary management system to production users. Items are ordered by priority. “Complete” means implemented in the repository; production configuration and operational verification still need to happen in the target environment.

## P0 — Required before production

### 1. Organization sign-in and server-side role checks — Implemented; verify deployment

- OIDC Authorization Code Flow is configured for Microsoft Entra ID.
- The API maps the configured role claim to read and compensation-edit permissions and checks those permissions on protected routes.
- Before release, verify the production tenant, app registration, callback URL, role assignments, HTTPS origin, and deployment secrets. Confirm that a user without either configured role cannot read salary data.

### 2. Record the authenticated actor on every compensation change — Implemented; verify deployment configuration

- New salary history rows record the authenticated server session’s subject (`sub`), Entra tenant ID (`tid`), user object ID (`oid`), and display-name snapshot; the actor is never accepted from the browser request body. Administrators can resolve `tid` + `oid` to the Entra user in that tenant. Existing rows retain their current actor value and cannot be reliably backfilled.
- The controller passes the actor from the session to the service, and the history insert shares a transaction with the compensation update. Updates fail closed when there is no authenticated session subject.
- Only the `AUTH_AUDIT_ROLE` role (default `salary:audit:admin`) can retrieve history. Assign that Entra application role only to designated audit administrators; the API denies history requests for other roles.
- History is purged when `changedAt` is older than three years. The purge runs at API startup and every 24 hours. The database relation prevents employee deletion from cascading into early history deletion.
- Verify in the deployment environment that successful updates are attributable, failed or stale updates do not create history rows, a caller cannot spoof another actor, non-admin users receive 403, and expired records are purged.

## P1 — Operational controls to complete before or during rollout

### 3. Backups and recovery

- Define automated database backups, retention, access restrictions, and encryption for the chosen production database.
- Perform a restore exercise and document the recovery point and recovery time objectives.
- SQLite is currently configured. If deployment needs multiple API instances, high write concurrency, or managed high availability, move to managed PostgreSQL and verify migrations and backups there.

### 4. Monitoring and incident response

- Collect application errors, authentication failures, database availability, and resource usage without logging salary values, tokens, cookies, or unnecessary employee personal data.
- Set alerts, identify the person responsible for response, and document how to disable access or rotate credentials after an incident.

### 5. Security and policy review

- Review the production dependency audit and upgrade the deferred development-only Vitest findings when practical.
- Confirm the organization’s policies for compensation approvals, audit retention, employee-data access, and data deletion. Implement approval workflows if policy requires them; they are not currently part of the app.
- Verify production TLS, secret storage and rotation, and the Entra role assignments with the deployment owner.

## Later or requirements-dependent work

- Add payroll execution, tax/benefits integrations, or foreign-exchange conversion only if those workflows are in scope.
- Measure production-like query plans and load before adding indexes or changing pagination strategy.
- Review whether the chosen database and deployment architecture meet the expected number of writers, availability target, and data-retention obligations.
