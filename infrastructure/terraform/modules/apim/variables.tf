# Azure API Management variables for Automated Meeting Minutes System
# Version: 1.0
# Provider: hashicorp/terraform ~> 1.0

variable "resource_group_name" {
  description = "Name of the resource group where APIM will be deployed"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9-_]{3,63}$", var.resource_group_name))
    error_message = "Resource group name must be 3-63 characters of alphanumeric, hyphens and underscores"
  }
}

variable "location" {
  description = "Azure region where APIM will be deployed"
  type        = string

  validation {
    condition     = contains(["eastus", "eastus2", "westus2", "northeurope", "westeurope"], var.location)
    error_message = "Location must be a supported Azure region"
  }
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod"
  }
}

variable "sku_name" {
  description = "SKU name for APIM (Developer, Basic, Standard, Premium)"
  type        = string

  validation {
    condition     = contains(["Developer", "Basic", "Standard", "Premium"], var.sku_name)
    error_message = "SKU must be Developer, Basic, Standard, or Premium"
  }
}

variable "sku_capacity" {
  description = "SKU capacity (units) for APIM"
  type        = number
  default     = 1

  validation {
    condition     = var.sku_capacity > 0 && var.sku_capacity <= 10
    error_message = "SKU capacity must be between 1 and 10"
  }
}

variable "publisher_name" {
  description = "Name of the API publisher"
  type        = string

  validation {
    condition     = length(var.publisher_name) > 0
    error_message = "Publisher name cannot be empty"
  }
}

variable "publisher_email" {
  description = "Email of the API publisher"
  type        = string

  validation {
    condition     = can(regex("^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$", var.publisher_email))
    error_message = "Must be a valid email address"
  }
}

variable "virtual_network_type" {
  description = "Type of virtual network integration (None, External, Internal)"
  type        = string
  default     = "None"

  validation {
    condition     = contains(["None", "External", "Internal"], var.virtual_network_type)
    error_message = "Virtual network type must be None, External, or Internal"
  }
}

variable "subnet_id" {
  description = "ID of the subnet for APIM virtual network integration"
  type        = string
  default     = null
}

variable "app_insights_key" {
  description = "Instrumentation key for Application Insights integration"
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Additional tags for APIM resources"
  type        = map(string)
  default     = {}
}

# Validation rules
locals {
  # Ensure appropriate SKU for environment
  validate_sku = var.environment == "dev" ? var.sku_name == "Developer" : contains(["Basic", "Standard", "Premium"], var.sku_name)
  validate_sku_msg = "Developer SKU only allowed in dev environment"

  # Validate network configuration
  validate_network = var.virtual_network_type == "None" ? true : var.subnet_id != null
  validate_network_msg = "Subnet ID required for network integration"
}

# Validation checks
check "sku_validation" {
  assert {
    condition     = local.validate_sku
    error_message = local.validate_sku_msg
  }
}

check "network_validation" {
  assert {
    condition     = local.validate_network
    error_message = local.validate_network_msg
  }
}