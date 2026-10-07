@description('Azure region for the PostgreSQL server.')
param location string

@minLength(3)
@maxLength(63)
@description('Globally unique Azure PostgreSQL server name.')
param serverName string

@description('PostgreSQL administrator login. Use only for initial setup and break-glass operations.')
param administratorLogin string

@secure()
@description('Supply through a secure deployment parameter or secret pipeline variable. Do not commit it.')
param administratorLoginPassword string

@description('Explicit IP allow-list entries for public access. Each object has name, startIpAddress, and endIpAddress. Leave empty to deny all client IPs. Never use 0.0.0.0 as an allow-all shortcut.')
param firewallRules array = []

@description('Database name used by the application after its SQLite-to-PostgreSQL migration.')
param databaseName string = 'salary_manager'

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: serverName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    version: '16'
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
      tenantId: subscription().tenantId
    }
    backup: {
      // Local redundancy keeps backups in-region and is the lowest-cost option.
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      // Public endpoint is enabled, but access remains blocked until an explicit firewall rule matches.
      publicNetworkAccess: 'Enabled'
    }
    storage: {
      // Keep provisioned storage within the free-account allowance; alert before it fills.
      autoGrow: 'Disabled'
      storageSizeGB: 32
    }
  }
  tags: {
    workload: 'salary-manager'
    dataClassification: 'confidential-employee-data'
  }
}

resource firewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = [for rule in firewallRules: {
  parent: postgres
  name: rule.name
  properties: {
    startIpAddress: rule.startIpAddress
    endIpAddress: rule.endIpAddress
  }
}]

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource requireTls 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: postgres
  name: 'require_secure_transport'
  properties: {
    value: 'ON'
    source: 'user-override'
  }
}

output serverFullyQualifiedDomainName string = postgres.properties.fullyQualifiedDomainName
output databaseName string = database.name
