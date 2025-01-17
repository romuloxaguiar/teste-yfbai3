# Azure Storage configuration for Automated Meeting Minutes System
# Implements secure blob storage with RA-GRS redundancy, hot access tier,
# and comprehensive lifecycle management for meeting documents

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

# Local variables for resource naming
locals {
  storage_name = "${var.storage_account_prefix}${random_string.suffix.result}"
}

# Generate random suffix for globally unique storage account name
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Primary storage account for meeting documents
resource "azurerm_storage_account" "main" {
  name                          = local.storage_name
  resource_group_name           = var.resource_group_name
  location                      = var.location
  account_tier                  = var.account_tier
  account_replication_type      = var.replication_type
  access_tier                   = var.access_tier
  enable_https_traffic_only     = true
  min_tls_version              = var.min_tls_version
  allow_nested_items_to_be_public = false
  shared_access_key_enabled     = true

  blob_properties {
    versioning_enabled    = true
    change_feed_enabled   = true
    
    delete_retention_policy {
      days = var.retention_days
    }
    
    container_delete_retention_policy {
      days = var.retention_days
    }
  }

  network_rules {
    default_action             = "Deny"
    ip_rules                   = []
    virtual_network_subnet_ids = []
  }

  identity {
    type = "SystemAssigned"
  }

  tags = merge(var.tags, {
    environment = var.environment
    purpose     = "meeting-documents"
  })
}

# Container for meeting transcripts
resource "azurerm_storage_container" "transcripts" {
  name                  = "transcripts"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
  
  metadata = {
    purpose         = "meeting-transcripts"
    security-level  = "confidential"
  }
}

# Container for generated meeting minutes
resource "azurerm_storage_container" "minutes" {
  name                  = "minutes"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
  
  metadata = {
    purpose         = "meeting-minutes"
    security-level  = "confidential"
  }
}

# Lifecycle management policy
resource "azurerm_storage_management_policy" "lifecycle" {
  storage_account_id = azurerm_storage_account.main.id

  rule {
    name    = "archive-old-documents"
    enabled = true
    filters {
      blob_types   = ["blockBlob"]
      prefix_match = ["transcripts/", "minutes/"]
    }
    actions {
      base_blob {
        tier_to_cool_after_days    = 90
        tier_to_archive_after_days = 180
        delete_after_days          = 365
      }
      snapshot {
        delete_after_days = 30
      }
      version {
        delete_after_days = 90
      }
    }
  }
}

# Diagnostic settings for monitoring
resource "azurerm_monitor_diagnostic_setting" "storage" {
  name                       = "${local.storage_name}-diagnostics"
  target_resource_id         = azurerm_storage_account.main.id
  storage_account_id         = azurerm_storage_account.main.id

  metric {
    category = "Transaction"
    enabled  = true

    retention_policy {
      enabled = true
      days    = var.retention_days
    }
  }

  metric {
    category = "Capacity"
    enabled  = true

    retention_policy {
      enabled = true
      days    = var.retention_days
    }
  }
}

# Validation rules
locals {
  # Validate storage account naming
  validate_storage_name = regex("^[a-z0-9]{3,24}$", local.storage_name)
  
  # Validate replication type for Premium tier
  validate_premium_replication = var.account_tier != "Premium" || var.replication_type == "LRS"
  
  # Validate minimum retention period
  validate_retention_days = var.retention_days >= 30
}