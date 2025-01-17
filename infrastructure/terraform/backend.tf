# Backend configuration for Terraform state management
# Version: 1.0
# Provider: hashicorp/terraform ~> 1.0

terraform {
  backend "azurerm" {
    # Resource group name for state storage following naming convention
    resource_group_name = "${var.project}-${var.environment}-rg"

    # Storage account name for Terraform state with project and environment prefix
    storage_account_name = "${var.project}${var.environment}tfstate"

    # Container name for state files
    container_name = "tfstate"

    # State file name
    key = "terraform.tfstate"

    # Use Managed Identity for secure authentication
    use_msi = true

    # Azure subscription and tenant details
    subscription_id = "${var.subscription_id}"
    tenant_id = "${var.tenant_id}"

    # Enable state locking using Azure Blob lease mechanism
    # Default lease duration is 60 seconds with automatic renewal
    use_azuread_auth = true

    # Enable state file encryption at rest (enabled by default in Azure Storage)
    # Uses Azure Storage Service Encryption with Microsoft-managed keys

    # Network security settings
    # Note: Configure these if using private endpoints
    # endpoint_resource_id = "/subscriptions/.../privateEndpoints/..."
    # endpoint_subnet_id = "/subscriptions/.../subnets/..."
  }
}

# Backend configuration validation
locals {
  # Validate storage account name length and character requirements
  validate_storage_name = regex("^[a-z0-9]{3,24}tfstate$", "${var.project}${var.environment}tfstate")

  # Validate resource group naming convention
  validate_rg_name = regex("^[a-z0-9-]+-rg$", "${var.project}-${var.environment}-rg")
}