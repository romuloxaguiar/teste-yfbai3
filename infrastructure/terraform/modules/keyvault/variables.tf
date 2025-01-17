# Core Terraform functionality for variable definitions and validation rules
terraform {
  # Version constraint specified in imports
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

variable "resource_group_name" {
  description = "Name of the resource group where Key Vault will be created"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9-]{3,63}$", var.resource_group_name))
    error_message = "Resource group name must be 3-63 characters and contain only alphanumeric characters and hyphens"
  }
}

variable "location" {
  description = "Azure region where Key Vault will be deployed"
  type        = string

  validation {
    condition     = contains(["eastus", "eastus2", "westus2", "northeurope", "westeurope"], var.location)
    error_message = "Location must be a supported Azure region for the Automated Meeting Minutes system"
  }
}

variable "name_prefix" {
  description = "Prefix for Key Vault name - will be combined with a unique suffix"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{3,16}$", var.name_prefix))
    error_message = "Name prefix must be 3-16 characters and contain only lowercase alphanumeric characters and hyphens"
  }
}

variable "sku_name" {
  description = "SKU name for Key Vault (standard or premium) - premium required for HSM-backed keys"
  type        = string
  default     = "standard"

  validation {
    condition     = contains(["standard", "premium"], var.sku_name)
    error_message = "SKU name must be either standard or premium"
  }
}

variable "enabled_for_disk_encryption" {
  description = "Enable Key Vault for disk encryption - required for Azure Disk Encryption"
  type        = bool
  default     = true
}

variable "purge_protection_enabled" {
  description = "Enable purge protection for Key Vault - prevents permanent deletion within retention period"
  type        = bool
  default     = true
}

variable "soft_delete_retention_days" {
  description = "Retention days for soft delete - must comply with organizational data retention policies"
  type        = number
  default     = 90

  validation {
    condition     = var.soft_delete_retention_days >= 7 && var.soft_delete_retention_days <= 90
    error_message = "Soft delete retention days must be between 7 and 90 days per security requirements"
  }
}

variable "network_acls" {
  description = "Network ACLs for Key Vault - controls network-level access"
  type = object({
    default_action             = string
    bypass                     = string
    ip_rules                   = list(string)
    virtual_network_subnet_ids = list(string)
  })
  default = {
    default_action             = "Deny"
    bypass                     = "AzureServices"
    ip_rules                   = []
    virtual_network_subnet_ids = []
  }

  validation {
    condition     = contains(["Allow", "Deny"], var.network_acls.default_action) && contains(["None", "AzureServices"], var.network_acls.bypass)
    error_message = "Invalid network ACLs configuration. Check default_action and bypass values"
  }
}

variable "enable_private_endpoint" {
  description = "Enable private endpoint for Key Vault - recommended for enhanced security"
  type        = bool
  default     = true
}

variable "private_endpoint_subnet_id" {
  description = "Subnet ID for private endpoint deployment"
  type        = string
  default     = null
}

variable "tags" {
  description = "Tags to be applied to Key Vault - must include required organizational tags"
  type        = map(string)
  default = {
    Project            = "Automated Meeting Minutes"
    Module             = "Key Vault"
    Environment        = "Production"
    ManagedBy         = "Terraform"
    SecurityLevel     = "High"
    ComplianceRequired = "True"
  }
}

# Local variables for internal validation and processing
locals {
  vault_name = "${var.name_prefix}-kv"
}

# Additional validation rules using locals
variable "validation_checks" {
  type    = any
  default = null

  validation {
    condition     = can(regex("^[a-zA-Z0-9-]{3,24}$", local.vault_name))
    error_message = "Key Vault name must be 3-24 characters and contain only alphanumeric characters and hyphens"
  }

  validation {
    condition     = var.network_acls.default_action == "Deny" || var.enable_private_endpoint == true
    error_message = "Network ACLs must be properly configured for security. Default action should be Deny or private endpoint must be enabled"
  }

  validation {
    condition     = !var.enable_private_endpoint || var.private_endpoint_subnet_id != null
    error_message = "Private endpoint subnet ID must be provided when private endpoint is enabled"
  }
}