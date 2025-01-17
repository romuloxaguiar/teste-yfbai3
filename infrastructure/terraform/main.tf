# Main Terraform configuration for Automated Meeting Minutes System
# Provider: hashicorp/azurerm ~> 3.0
# Provider: hashicorp/random ~> 3.0

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
  backend "azurerm" {
    # Backend configuration should be provided via backend config file or CLI
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy               = false
      recover_soft_deleted_key_vaults            = true
      purge_soft_deleted_secrets_on_destroy      = false
      recover_soft_deleted_secrets               = true
    }
    resource_group {
      prevent_deletion_if_contains_resources     = true
    }
  }
}

# Local variables for resource naming and tagging
locals {
  resource_prefix = "${var.project}-${var.environment}"
  common_tags = {
    Project            = "Automated Meeting Minutes"
    Environment        = var.environment
    ManagedBy         = "Terraform"
    BusinessUnit      = "Enterprise Solutions"
    CostCenter        = "IT-${var.environment}"
    DataClassification = "Confidential"
    DisasterRecovery  = "Required"
  }
}

# Random suffix for globally unique names
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${local.resource_prefix}-rg"
  location = var.location
  tags     = local.common_tags

  lifecycle {
    prevent_destroy = true
  }
}

# Resource lock for production environment
resource "azurerm_management_lock" "resource_group" {
  count      = var.environment == "prod" ? 1 : 0
  name       = "${local.resource_prefix}-lock"
  scope      = azurerm_resource_group.main.id
  lock_level = "CanNotDelete"
  notes      = "Resource group locked for production environment"
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${local.resource_prefix}-law"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
  
  tags = local.common_tags
}

# AKS Module
module "aks" {
  source              = "./modules/aks"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  cluster_name        = "${local.resource_prefix}-aks"
  node_count          = var.aks_config.node_count
  vm_size            = var.aks_config.vm_size
  kubernetes_version = var.aks_config.kubernetes_version
  
  enable_auto_scaling = var.aks_config.enable_auto_scaling
  min_node_count     = var.aks_config.min_node_count
  max_node_count     = var.aks_config.max_node_count
  availability_zones = var.aks_config.availability_zones
  
  network_plugin     = var.aks_config.network_plugin
  network_policy     = var.aks_config.network_policy
  pod_cidr          = var.aks_config.pod_cidr
  service_cidr      = var.aks_config.service_cidr
  dns_service_ip    = var.aks_config.dns_service_ip
  
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  tags                      = local.common_tags
}

# SQL Module
module "sql" {
  source              = "./modules/sql"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  server_name         = "${local.resource_prefix}-sql"
  database_name       = "meetingminutes"
  
  sku_name               = var.sql_config.sku_name
  max_size_gb            = var.sql_config.max_size_gb
  zone_redundant         = var.sql_config.zone_redundant
  geo_backup_enabled     = var.sql_config.geo_backup_enabled
  backup_retention_days  = var.sql_config.backup_retention_days
  geo_redundant_backup   = var.sql_config.geo_redundant_backup
  
  tags = local.common_tags
}

# Redis Module
module "redis" {
  source              = "./modules/redis"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  redis_name          = "${local.resource_prefix}-redis"
  
  sku_name            = var.redis_config.sku
  family              = var.redis_config.family
  capacity            = var.redis_config.capacity
  shard_count         = var.redis_config.shard_count
  zone_redundant      = var.redis_config.zone_redundant
  
  enable_non_ssl_port = var.redis_config.enable_non_ssl_port
  minimum_tls_version = var.redis_config.minimum_tls_version
  
  tags = local.common_tags
}

# Storage Module
module "storage" {
  source              = "./modules/storage"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  storage_name        = "${local.resource_prefix}stor${random_string.suffix.result}"
  
  account_tier             = var.storage_config.account_tier
  account_replication_type = var.storage_config.account_replication_type
  enable_https_traffic_only = var.storage_config.enable_https_traffic_only
  min_tls_version          = var.storage_config.min_tls_version
  allow_blob_public_access = var.storage_config.allow_blob_public_access
  
  network_rules           = var.storage_config.network_rules
  soft_delete_retention   = var.storage_config.blob_soft_delete_retention_days
  
  tags = local.common_tags
}

# Key Vault Module
module "keyvault" {
  source              = "./modules/keyvault"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  keyvault_name       = "${local.resource_prefix}-kv-${random_string.suffix.result}"
  
  sku_name                 = "premium"
  enabled_for_deployment   = true
  purge_protection_enabled = true
  soft_delete_retention_days = 90
  
  network_acls = {
    default_action = "Deny"
    bypass         = "AzureServices"
    ip_rules       = []
    virtual_network_subnet_ids = []
  }
  
  tags = local.common_tags
}

# API Management Module
module "apim" {
  source              = "./modules/apim"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  apim_name           = "${local.resource_prefix}-apim"
  
  sku_name            = "Premium"
  sku_capacity        = 2
  publisher_name      = "Enterprise Solutions"
  publisher_email     = "admin@enterprise.com"
  
  virtual_network_type = "Internal"
  zones               = ["1", "2", "3"]
  
  tags = local.common_tags
}

# Outputs
output "resource_group_name" {
  value       = azurerm_resource_group.main.name
  description = "The name of the resource group"
}

output "log_analytics_workspace_id" {
  value       = azurerm_log_analytics_workspace.main.id
  description = "The ID of the Log Analytics workspace"
}

output "aks_cluster_name" {
  value       = module.aks.cluster_name
  description = "The name of the AKS cluster"
}

output "sql_server_fqdn" {
  value       = module.sql.server_fqdn
  description = "The fully qualified domain name of the SQL server"
  sensitive   = true
}

output "redis_hostname" {
  value       = module.redis.hostname
  description = "The hostname of the Redis instance"
  sensitive   = true
}

output "storage_account_name" {
  value       = module.storage.storage_account_name
  description = "The name of the storage account"
}

output "key_vault_uri" {
  value       = module.keyvault.vault_uri
  description = "The URI of the Key Vault"
  sensitive   = true
}

output "api_management_gateway_url" {
  value       = module.apim.gateway_url
  description = "The gateway URL of the API Management service"
}