# Azure Cache for Redis Module
# Version: 1.0
# Provider Requirements:
# - hashicorp/azurerm ~> 3.0
# - hashicorp/random ~> 3.0

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

locals {
  redis_name = "${var.prefix}-redis-${var.environment}"
  default_tags = {
    Project            = "Automated Meeting Minutes"
    Component          = "Cache Layer"
    Environment        = var.environment
    ManagedBy         = "Terraform"
    CostCenter         = "Infrastructure"
    DataClassification = "Internal"
    Criticality       = "High"
    DR                = "Required"
  }
}

resource "azurerm_redis_cache" "main" {
  name                          = local.redis_name
  resource_group_name           = var.resource_group_name
  location                      = var.location
  capacity                      = var.capacity
  family                        = "P"  # Premium SKU family
  sku_name                      = var.sku
  enable_non_ssl_port          = false
  minimum_tls_version          = "1.2"
  public_network_access_enabled = false
  
  redis_configuration {
    maxmemory_reserved              = var.redis_configuration.maxmemory_reserved
    maxmemory_delta                 = var.redis_configuration.maxmemory_delta
    maxmemory_policy                = var.redis_configuration.maxmemory_policy
    maxfragmentationmemory_reserved = var.redis_configuration.maxfragmentationmemory_reserved
    enable_authentication           = var.redis_configuration.enable_authentication
    rdb_backup_enabled             = var.redis_configuration.rdb_backup_enabled
    rdb_backup_frequency           = var.redis_configuration.rdb_backup_frequency
    rdb_backup_max_snapshot_count  = var.redis_configuration.rdb_backup_max_snapshot_count
    aof_backup_enabled            = var.redis_configuration.aof_backup_enabled
    notify_keyspace_events        = var.redis_configuration.notify_keyspace_events
  }

  patch_schedule {
    day_of_week    = "Sunday"
    start_hour_utc = 2
  }

  # Enable zone redundancy for high availability
  zones = ["1", "2", "3"]

  tags = merge(local.default_tags, var.tags)

  lifecycle {
    prevent_destroy = true
  }
}

# Firewall rule to allow Azure services
resource "azurerm_redis_firewall_rule" "azure_services" {
  name                = "allow_azure_services"
  resource_group_name = var.resource_group_name
  redis_cache_name    = azurerm_redis_cache.main.name
  start_ip           = "0.0.0.0"
  end_ip             = "0.0.0.0"
}

# Diagnostic settings for monitoring
resource "azurerm_monitor_diagnostic_setting" "redis" {
  name                       = "${local.redis_name}-diagnostics"
  target_resource_id         = azurerm_redis_cache.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  metric {
    category = "AllMetrics"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 30
    }
  }
}

# Outputs for use in other modules
output "redis_cache_id" {
  value       = azurerm_redis_cache.main.id
  description = "The ID of the Redis Cache instance"
}

output "redis_cache_name" {
  value       = azurerm_redis_cache.main.name
  description = "The name of the Redis Cache instance"
}

output "redis_cache_hostname" {
  value       = azurerm_redis_cache.main.hostname
  description = "The hostname of the Redis Cache instance"
}

output "redis_cache_ssl_port" {
  value       = azurerm_redis_cache.main.ssl_port
  description = "The SSL port of the Redis Cache instance"
}

output "redis_cache_primary_access_key" {
  value       = azurerm_redis_cache.main.primary_access_key
  description = "The primary access key for the Redis Cache instance"
  sensitive   = true
}

output "redis_cache_primary_connection_string" {
  value       = azurerm_redis_cache.main.primary_connection_string
  description = "The primary connection string for the Redis Cache instance"
  sensitive   = true
}