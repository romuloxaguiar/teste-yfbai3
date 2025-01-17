# Azure SQL Database Infrastructure Module
# Version: 1.0
# Provider Requirements
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm" # version ~> 3.0
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random" # version ~> 3.0
      version = "~> 3.0"
    }
  }
}

# Local variables for resource naming and configuration
locals {
  server_name    = "${var.resource_group_name}-sql-${var.environment}"
  database_name  = "meeting-minutes-db-${var.environment}"
  admin_username = "sqladmin"
  retention_days = 90
  max_size_gb    = 256
  sku_name       = "BC_Gen5_2"
}

# Generate secure random password for SQL admin
resource "random_password" "sql_admin" {
  length           = 32
  special          = true
  min_special      = 2
  min_numeric      = 2
  min_upper        = 2
  min_lower        = 2
  override_special = "!@#$%^&*()-_=+[]{}<>:?"
}

# Azure SQL Server instance
resource "azurerm_mssql_server" "sql_server" {
  name                         = local.server_name
  resource_group_name          = var.resource_group_name
  location                     = var.location
  version                      = "12.0"
  administrator_login          = local.admin_username
  administrator_login_password = random_password.sql_admin.result
  minimum_tls_version         = "1.2"
  public_network_access_enabled = false

  azuread_administrator {
    login_username = var.sql_config.aad_admin_username
    object_id      = var.sql_config.aad_admin_object_id
  }

  identity {
    type = "SystemAssigned"
  }

  tags = merge(var.tags, {
    Environment = var.environment
    Service     = "SQL Server"
  })
}

# Azure SQL Database
resource "azurerm_mssql_database" "database" {
  name                        = local.database_name
  server_id                   = azurerm_mssql_server.sql_server.id
  collation                   = "SQL_Latin1_General_CP1_CI_AS"
  sku_name                    = local.sku_name
  max_size_gb                 = local.max_size_gb
  zone_redundant             = true
  read_scale                 = true
  auto_pause_delay_in_minutes = -1 # Disabled for production workload
  
  # High Availability and Disaster Recovery
  geo_backup_enabled         = true
  storage_account_type       = "Geo"

  # Advanced Threat Protection
  threat_detection_policy {
    state                      = "Enabled"
    email_account_admins      = true
    email_addresses           = var.threat_detection_config.email_addresses
    retention_days            = local.retention_days
    disabled_alerts          = []
    storage_endpoint         = azurerm_storage_account.audit_logs.primary_blob_endpoint
    storage_account_access_key = azurerm_storage_account.audit_logs.primary_access_key
  }

  # Backup Policies
  short_term_retention_policy {
    retention_days          = 7
    backup_interval_in_hours = 24
  }

  long_term_retention_policy {
    weekly_retention  = "P4W"
    monthly_retention = "P12M"
    yearly_retention  = "P5Y"
    week_of_year     = 1
  }

  # Performance Monitoring
  maintenance_configuration_name = "SQL_Default"

  tags = merge(var.tags, {
    Environment = var.environment
    Service     = "SQL Database"
  })
}

# Audit Log Storage Account
resource "azurerm_storage_account" "audit_logs" {
  name                     = "${replace(local.server_name, "-", "")}logs"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
  min_tls_version         = "TLS1_2"
  
  network_rules {
    default_action = "Deny"
    bypass         = ["AzureServices"]
  }

  tags = merge(var.tags, {
    Environment = var.environment
    Service     = "SQL Audit Logs"
  })
}

# Database Auditing Policy
resource "azurerm_mssql_database_extended_auditing_policy" "audit_policy" {
  database_id            = azurerm_mssql_database.database.id
  storage_endpoint       = azurerm_storage_account.audit_logs.primary_blob_endpoint
  retention_in_days     = var.audit_retention_days
  storage_account_access_key = azurerm_storage_account.audit_logs.primary_access_key
}

# Outputs
output "server_name" {
  value = azurerm_mssql_server.sql_server.fully_qualified_domain_name
  description = "The fully qualified domain name of the SQL server"
}

output "database_name" {
  value = azurerm_mssql_database.database.name
  description = "The name of the SQL database"
}

output "connection_string" {
  value = "Server=tcp:${azurerm_mssql_server.sql_server.fully_qualified_domain_name},1433;Database=${azurerm_mssql_database.database.name};Authentication=Active Directory Default;"
  description = "The connection string for the SQL database"
  sensitive = true
}