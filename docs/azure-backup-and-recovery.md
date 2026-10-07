# Azure database backup and recovery

## Selected Azure services

Use **Azure Database for PostgreSQL Flexible Server** for the production database. The application currently uses SQLite, so this is the target service; the Prisma provider and migrations must be moved to PostgreSQL before deploying the app against this server. The Bicep template in [`infra/azure/postgresql.bicep`](../infra/azure/postgresql.bicep) creates a PostgreSQL server and database with the requested `Standard_B1ms` burstable compute, local backup redundancy, and public access controlled by IP firewall rules. It does not migrate app data or configure the app connection string.

Use Flexible Server's built-in automated backups and point-in-time restore (PITR). Azure takes a daily snapshot of the database files and continuously archives PostgreSQL transaction logs (WAL). PITR replays those logs, so it can restore to a selected time between snapshots. Azure documents a typical RPO under five minutes for regional PITR. Backups are encrypted at rest by the service. This template configures seven-day retention with local backup redundancy, TLS, public network access with IP firewall rules, and no high availability.

The target is the stricter interpretation of the supplied RPO: **no more than one hour of data loss**. Native PITR is more granular than that within the primary region. Local backup redundancy does not provide a regional disaster recovery copy. With high availability disabled, the two-hour RTO is not guaranteed; restore duration varies with database size and recovery work and must be measured in an exercise.

## How this maps to the requested backup schedule

Azure Flexible Server does not expose an hourly-snapshot-for-one-day then daily-snapshot-for-six-days policy. Instead, it retains the recovery chain for seven days: daily data snapshots plus continuous WAL logs allow recovery to points throughout that window. The service automatically removes backups outside the configured seven-day window. This gives more restore points during the seven days than a daily-only schedule, with a seven-day retention window.

The managed snapshots and WAL files are Azure's internal recovery chain; they are not customer-readable files and are not exported into a customer storage account. With local redundancy, the backup copy is limited to the same Azure region. If the organization needs an independently controlled copy for regional recovery or stronger isolation, add and validate a separate export or cross-region backup design.

## What "snapshot" means

A **snapshot** is a point-in-time copy of the database's underlying data files. It is a recovery starting point, not necessarily a complete independent copy for every timestamp. PostgreSQL's WAL records the changes after the snapshot. To recover to (for example) 10:20, Azure restores the closest earlier snapshot and replays WAL records up to 10:20.

"Store and protect snapshots separately" means keep recovery material outside the same live database failure/deletion boundary, with separate access controls and redundancy. In this design Azure manages and encrypts the recovery chain separately from the live server, but local redundancy does not copy it to a paired region. Do not manually copy the live SQLite file while the app is writing to it and call that a consistent backup.

## Implemented in the repository: first three controls

1. **Automated database backups:** the Bicep template provisions Flexible Server, which automatically takes snapshots and archives WAL logs for PITR.
2. **Retention and deletion:** the template sets the recovery window to seven days (`backupRetentionDays: 7`). Azure removes expired recovery data automatically. The retention setting is configurable from 7 to 35 days.
3. **Access and encryption:** the database requires TLS and has a public endpoint, but firewall access is granted only to IP ranges supplied in the `firewallRules` parameter. Azure encrypts managed backups at rest and stores them with local redundancy. Do not add `0.0.0.0` to `firewallRules`; Azure defines that as allowing connections from all Azure services, including other customers' subscriptions. Grant Azure resource access only to designated database operators, and create a least-privilege PostgreSQL application role during database migration. Keep the server administrator credential in Key Vault or deployment secret storage; never put it in this repository or app logs.

The firewall list is empty by default, so the public endpoint will not accept connections until you add an explicit source IP range. For an app hosted on Azure App Service, allow its outbound IP addresses or configure a fixed outbound IP path; don't use the broad “allow all Azure services” rule. The free offer currently covers 750 hours/month of B1MS compute, 32 GB storage, and 32 GB backup storage for 12 months for eligible new Azure accounts. The template caps storage at 32 GB and disables storage auto-growth, but it cannot cap backup growth, other resources, or usage after the offer expires. Monitor Cost Management and configure a budget. Microsoft describes Burstable compute as intended for development; this small size is not a production performance or availability guarantee.

## Deployment inputs and operational verification

Provide `location`, a globally unique `serverName`, `administratorLogin`, and a secure administrator password as deployment inputs. Add a `firewallRules` array containing only the required IP ranges. Do not save the password in a `.bicepparam` file committed to Git. Review and deploy with Azure CLI after signing into the intended tenant and subscription:

```powershell
az deployment group what-if --resource-group <resource-group> --template-file infra/azure/postgresql.bicep --parameters location=<region> serverName=<unique-name> administratorLogin=<admin-name>
```

Supply the secure password through your approved secret-backed deployment pipeline, then create the resources with the reviewed deployment. No Azure resources have been created by editing this repository.

Before production data is loaded:

- Migrate the Prisma schema and migrations from SQLite to PostgreSQL and rehearse copying existing data.
- Confirm backup status and the seven-day recovery window in Azure; confirm the backup redundancy is locally redundant. Note that this does not protect against a full regional outage.
- Run a PITR restore into a separate server, validate employee and salary-history row counts and sample consistency, and record elapsed restore and application cutover time. Meet the two-hour RTO in a timed rehearsal.
- Repeat the exercise after meaningful schema/architecture changes and at the organization's chosen cadence.

Until those deployment and restore checks pass, the checklist item remains in progress. The infrastructure template is not evidence that a backup has run or that the two-hour RTO has been achieved.

## References

- [Azure Database for PostgreSQL Flexible Server backup and restore](https://learn.microsoft.com/en-us/azure/postgresql/backup-restore/concepts-backup-restore)
- [Business continuity in Azure Database for PostgreSQL Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/backup-restore/concepts-business-continuity)
- [Azure Database for PostgreSQL Flexible Server firewall rules](https://learn.microsoft.com/en-us/azure/postgresql/security/security-firewall-rules)
- [Azure free account offers](https://azure.microsoft.com/en-us/pricing/free-trial/)
- [Azure Flexible Server resource reference for Bicep](https://learn.microsoft.com/en-us/azure/templates/microsoft.dbforpostgresql/2024-08-01/flexibleservers)
