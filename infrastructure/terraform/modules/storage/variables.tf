# Variable definitions for Azure Storage module used in the Automated Meeting Minutes System
# Defines configuration parameters for secure blob storage implementation with RA-GRS redundancy,
# hot access tier, and lifecycle management

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where storage resources will be created"

  validation {
    condition     = length(var.resource_group_name) > 0
    error_message = "Resource group name cannot be empty"
  }
}

variable "location" {
  type        = string
  description = "Azure region where storage resources will be deployed"

  validation {
    condition     = can(regex("^[a-z]+-[a-z]+[0-9]*$", var.location))
    error_message = "Location must be a valid Azure region name"
  }
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

variable "storage_account_prefix" {
  type        = string
  description = "Prefix for storage account name"
  default     = "meetingminutes"

  validation {
    condition     = can(regex("^[a-z0-9]{3,16}$", var.storage_account_prefix))
    error_message = "Storage account prefix must be 3-16 characters and contain only lowercase letters and numbers"
  }
}

variable "account_tier" {
  type        = string
  description = "Performance tier of the storage account"
  default     = "Standard"

  validation {
    condition     = contains(["Standard", "Premium"], var.account_tier)
    error_message = "Account tier must be either Standard or Premium"
  }
}

variable "replication_type" {
  type        = string
  description = "Type of replication for the storage account"
  default     = "RA-GRS"

  validation {
    condition     = contains(["LRS", "GRS", "RAGRS", "ZRS", "GZRS", "RAGZRS"], var.replication_type)
    error_message = "Replication type must be one of: LRS, GRS, RAGRS, ZRS, GZRS, RAGZRS"
  }
}

variable "access_tier" {
  type        = string
  description = "Access tier for blob storage"
  default     = "Hot"

  validation {
    condition     = contains(["Hot", "Cool"], var.access_tier)
    error_message = "Access tier must be either Hot or Cool"
  }
}

variable "min_tls_version" {
  type        = string
  description = "Minimum TLS version for storage account"
  default     = "TLS1_2"

  validation {
    condition     = contains(["TLS1_0", "TLS1_1", "TLS1_2"], var.min_tls_version)
    error_message = "Minimum TLS version must be one of: TLS1_0, TLS1_1, TLS1_2"
  }
}

variable "retention_days" {
  type        = number
  description = "Number of days to retain deleted blobs"
  default     = 90

  validation {
    condition     = var.retention_days >= 1 && var.retention_days <= 365
    error_message = "Retention days must be between 1 and 365"
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags to be applied to all resources"
  default     = {}
}

# Custom validation rules
locals {
  # Ensure Premium tier only uses LRS replication
  premium_storage_validation = var.account_tier != "Premium" || var.replication_type == "LRS"
  premium_storage_validation_error = "Premium storage accounts only support locally redundant storage (LRS)"

  # Validate environment naming
  environment_validation = contains(["dev", "staging", "prod"], var.environment)
  environment_validation_error = "Environment must be one of: dev, staging, prod"
}