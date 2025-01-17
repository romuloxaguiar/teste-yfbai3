# Azure Key Vault Terraform configuration for Automated Meeting Minutes System
# Provider requirements are inherited from root module

# Get current Azure client configuration
data "azurerm_client_config" "current" {}

# Generate unique suffix for Key Vault name
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
  min_numeric = 2
  min_lower = 2
}

# Local variables for resource configuration
locals {
  common_tags = {
    Project             = "Automated Meeting Minutes"
    Module              = "Key Vault"
    Environment         = var.environment
    ManagedBy          = "Terraform"
    SecurityLevel      = "High"
    ComplianceRequired = "True"
    DataClassification = "Confidential"
  }
}

# Azure Key Vault resource
resource "azurerm_key_vault" "main" {
  name                = "${var.name_prefix}-kv-${random_string.suffix.result}"
  location            = var.location
  resource_group_name = var.resource_group_name
  tenant_id          = data.azurerm_client_config.current.tenant_id
  sku_name           = var.sku_name

  # Security features
  enabled_for_disk_encryption     = true
  enabled_for_template_deployment = false
  enabled_for_deployment          = false
  purge_protection_enabled        = true
  soft_delete_retention_days      = 90
  enable_rbac_authorization       = true

  # Network configuration
  network_acls {
    default_action             = var.network_acls.default_action
    bypass                     = var.network_acls.bypass
    ip_rules                   = var.network_acls.ip_rules
    virtual_network_subnet_ids = var.network_acls.virtual_network_subnet_ids
  }

  # Contact information
  contact {
    email = "security@organization.com"
    name  = "Security Team"
    phone = "+1-555-0123"
  }

  tags = merge(local.common_tags, var.tags)

  lifecycle {
    prevent_destroy = true
  }
}

# Key Vault access policy
resource "azurerm_key_vault_access_policy" "main" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  key_permissions = [
    "Get", "List", "Create", "Delete", "Update",
    "Backup", "Restore", "Recover", "Purge"
  ]

  secret_permissions = [
    "Get", "List", "Set", "Delete",
    "Backup", "Restore", "Recover", "Purge"
  ]

  certificate_permissions = [
    "Get", "List", "Create", "Delete", "Update",
    "Backup", "Restore", "Recover", "Purge"
  ]

  storage_permissions = [
    "Get", "List", "Delete", "Set", "Update",
    "RegenerateKey", "Recover", "Purge"
  ]
}

# Diagnostic settings for audit logging
resource "azurerm_monitor_diagnostic_setting" "main" {
  name                       = "${var.name_prefix}-kv-diag"
  target_resource_id        = azurerm_key_vault.main.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  log {
    category = "AuditEvent"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 365
    }
  }

  log {
    category = "AzurePolicyEvaluationDetails"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 365
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 90
    }
  }
}

# Validation rules
locals {
  # Ensure Key Vault name meets Azure naming restrictions
  validate_name = regex("^[a-zA-Z0-9-]{3,24}$", "${var.name_prefix}-kv-${random_string.suffix.result}")
    ? null
    : file("ERROR: Invalid Key Vault name")

  # Validate network ACLs configuration
  validate_network = var.network_acls.default_action == "Deny" && length(coalesce(var.network_acls.ip_rules, [])) > 0
    ? null
    : file("ERROR: Invalid network ACLs configuration")

  # Validate SKU selection
  validate_sku = contains(["standard", "premium"], lower(var.sku_name))
    ? null
    : file("ERROR: Invalid SKU selection")
}