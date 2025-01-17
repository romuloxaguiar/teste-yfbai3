# Terraform Azure SQL Database Module Variables
# Version: 1.0
# Provider: hashicorp/terraform ~> 1.0

# Resource Group Configuration
variable "resource_group_name" {
  description = "Name of the resource group where SQL resources will be deployed"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{3,24}$", var.resource_group_name))
    error_message = "Resource group name must be 3-24 characters, lowercase alphanumeric with hyphens"
  }
}

variable "location" {
  description = "Azure region for SQL resource deployment"
  type        = string

  validation {
    condition     = contains(["eastus", "eastus2", "westus2", "northeurope", "westeurope"], var.location)
    error_message = "Location must be a supported Azure region"
  }
}

variable "tags" {
  description = "Resource tags for SQL resources"
  type        = map(string)
  default     = {}
}

# SQL Configuration Object
variable "sql_config" {
  description = "Comprehensive SQL Server and Database configuration settings"
  type = object({
    sku_name                    = string
    max_size_gb                 = number
    zone_redundant             = bool
    geo_backup_enabled         = bool
    backup_retention_days      = number
    auto_pause_delay_minutes   = number
    min_capacity               = number
    read_scale_enabled        = bool
    enable_advanced_monitoring = bool
  })

  default = {
    sku_name                    = "BC_Gen5_2"
    max_size_gb                 = 256
    zone_redundant             = true
    geo_backup_enabled         = true
    backup_retention_days      = 30
    auto_pause_delay_minutes   = 0
    min_capacity               = 2
    read_scale_enabled        = true
    enable_advanced_monitoring = true
  }

  validation {
    condition     = contains(["BC_Gen5_2", "BC_Gen5_4", "BC_Gen5_8", "BC_Gen5_16", "BC_Gen5_32"], var.sql_config.sku_name)
    error_message = "SQL SKU must be a valid Business Critical tier"
  }

  validation {
    condition     = var.sql_config.max_size_gb >= 128 && var.sql_config.max_size_gb <= 4096
    error_message = "SQL database size must be between 128GB and 4096GB"
  }

  validation {
    condition     = var.sql_config.backup_retention_days >= 7
    error_message = "Backup retention must be at least 7 days"
  }

  validation {
    condition     = var.sql_config.min_capacity >= 2
    error_message = "Minimum capacity must be at least 2 vCores for Business Critical tier"
  }

  validation {
    condition     = var.sql_config.auto_pause_delay_minutes == 0 || var.sql_config.auto_pause_delay_minutes >= 60
    error_message = "Auto-pause delay must be 0 (disabled) or at least 60 minutes"
  }
}

# Audit Configuration
variable "audit_retention_days" {
  description = "Number of days to retain audit logs"
  type        = number
  default     = 90

  validation {
    condition     = var.audit_retention_days >= 90
    error_message = "Audit retention must be at least 90 days for compliance"
  }
}

# Advanced Threat Protection Settings
variable "threat_detection_config" {
  description = "Advanced Threat Protection configuration for SQL Server"
  type = object({
    state                      = string
    email_account_admins      = bool
    email_addresses           = list(string)
    retention_days           = number
    disabled_alerts         = list(string)
  })

  default = {
    state                      = "Enabled"
    email_account_admins      = true
    email_addresses           = []
    retention_days           = 90
    disabled_alerts         = []
  }

  validation {
    condition     = contains(["Enabled", "Disabled"], var.threat_detection_config.state)
    error_message = "Threat detection state must be either 'Enabled' or 'Disabled'"
  }

  validation {
    condition     = var.threat_detection_config.retention_days >= 90
    error_message = "Threat detection retention days must be at least 90 days"
  }
}

# Performance Monitoring Configuration
variable "performance_monitoring_config" {
  description = "Performance monitoring and alerting configuration"
  type = object({
    enable_query_store        = bool
    query_store_retention_days = number
    enable_automatic_tuning   = bool
    workload_group_enabled   = bool
    max_dtu_percentage_alert = number
  })

  default = {
    enable_query_store        = true
    query_store_retention_days = 30
    enable_automatic_tuning   = true
    workload_group_enabled   = true
    max_dtu_percentage_alert = 90
  }

  validation {
    condition     = var.performance_monitoring_config.query_store_retention_days >= 7
    error_message = "Query store retention must be at least 7 days"
  }

  validation {
    condition     = var.performance_monitoring_config.max_dtu_percentage_alert > 0 && var.performance_monitoring_config.max_dtu_percentage_alert <= 100
    error_message = "Max DTU percentage alert must be between 1 and 100"
  }
}