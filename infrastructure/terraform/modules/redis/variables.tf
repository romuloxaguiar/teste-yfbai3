# Azure Cache for Redis Module Variables
# Version: 1.0
# Required Provider: hashicorp/terraform ~> 1.0

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where Redis Cache will be deployed"

  validation {
    condition     = length(var.resource_group_name) > 0 && length(var.resource_group_name) <= 90
    error_message = "Resource group name must be between 1 and 90 characters"
  }
}

variable "location" {
  type        = string
  description = "Azure region where Redis Cache will be deployed"

  validation {
    condition     = contains(["eastus", "westus", "westeurope", "eastus2", "northeurope"], var.location)
    error_message = "Location must be a supported Azure region for Redis Cache deployment"
  }
}

variable "prefix" {
  type        = string
  description = "Prefix for Redis Cache resource naming, must be globally unique"

  validation {
    condition     = length(var.prefix) >= 3 && length(var.prefix) <= 11 && can(regex("^[a-zA-Z0-9]+$", var.prefix))
    error_message = "Prefix must be between 3 and 11 alphanumeric characters"
  }
}

variable "environment" {
  type        = string
  description = "Environment name for resource tagging and naming convention"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod"
  }
}

variable "sku" {
  type        = string
  description = "SKU name for Redis Cache, enforced to Premium for production requirements"
  default     = "Premium"

  validation {
    condition     = var.sku == "Premium"
    error_message = "Only Premium SKU is supported for production requirements and SLA compliance"
  }
}

variable "capacity" {
  type        = number
  description = "Redis Cache capacity in GB, must be aligned with expected workload"
  default     = 6

  validation {
    condition     = contains([1, 2, 4, 6, 8], var.capacity)
    error_message = "Capacity must be 1, 2, 4, 6, or 8 GB for Premium SKU"
  }
}

variable "enable_non_ssl_port" {
  type        = bool
  description = "Enable non-SSL port for Redis Cache, disabled by default for security"
  default     = false

  validation {
    condition     = var.enable_non_ssl_port == false
    error_message = "Non-SSL port must be disabled for security compliance"
  }
}

variable "minimum_tls_version" {
  type        = string
  description = "Minimum TLS version for Redis Cache connections"
  default     = "1.2"

  validation {
    condition     = var.minimum_tls_version == "1.2"
    error_message = "TLS version must be 1.2 for security compliance"
  }
}

variable "redis_configuration" {
  type = object({
    maxmemory_policy                = string
    maxfragmentationmemory_reserved = string
    maxmemory_reserved             = string
    maxmemory_delta                = string
    enable_authentication          = bool
    rdb_backup_enabled            = bool
    rdb_backup_frequency          = number
    rdb_backup_max_snapshot_count = number
    aof_backup_enabled           = bool
    notify_keyspace_events       = string
  })
  description = "Comprehensive Redis configuration settings for optimal performance"
  default = {
    maxmemory_policy                = "volatile-lru"
    maxfragmentationmemory_reserved = "642"
    maxmemory_reserved             = "642"
    maxmemory_delta                = "642"
    enable_authentication          = true
    rdb_backup_enabled            = true
    rdb_backup_frequency          = 60
    rdb_backup_max_snapshot_count = 1
    aof_backup_enabled           = false
    notify_keyspace_events       = "KEA"
  }

  validation {
    condition     = var.redis_configuration.maxmemory_policy == "volatile-lru"
    error_message = "maxmemory_policy must be set to volatile-lru for optimal memory management"
  }

  validation {
    condition     = var.redis_configuration.enable_authentication == true
    error_message = "Authentication must be enabled for security compliance"
  }

  validation {
    condition     = var.redis_configuration.rdb_backup_enabled == true
    error_message = "RDB backup must be enabled for data persistence"
  }
}

variable "tags" {
  type        = map(string)
  description = "Resource tags for Redis Cache instance"
  default = {
    managed_by = "terraform"
    service    = "redis_cache"
  }
}