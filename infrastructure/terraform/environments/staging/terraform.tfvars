# Terraform variable definitions for staging environment
# Version: 1.0.0
# Last Updated: 2024

# Project and environment identification
project     = "meeting-minutes"
environment = "staging"
location    = "eastus2"

# AKS cluster configuration optimized for staging workloads
aks_config = {
  node_count           = 3
  vm_size             = "Standard_D4s_v3"
  kubernetes_version   = "1.25"
  enable_auto_scaling = true
  min_node_count      = 3
  max_node_count      = 5
  availability_zones  = ["1", "2", "3"]
  network_plugin      = "azure"
  network_policy      = "calico"
  pod_cidr           = "10.244.0.0/16"
  service_cidr       = "10.0.0.0/16"
  dns_service_ip     = "10.0.0.10"
  docker_bridge_cidr = "172.17.0.1/16"
}

# Azure SQL configuration with business continuity features
sql_config = {
  sku_name               = "BusinessCritical"
  max_size_gb            = 256
  zone_redundant         = true
  geo_backup_enabled     = true
  backup_retention_days  = 35
  geo_redundant_backup   = true
  auto_pause_delay_minutes = -1
  min_capacity           = 4
  read_scale            = true
  read_replicas         = 2
}

# Azure Redis Cache configuration for optimal performance
redis_config = {
  sku                                = "Premium"
  family                            = "P"
  capacity                          = 2
  enable_non_ssl_port               = false
  minimum_tls_version               = "1.2"
  shard_count                       = 2
  zone_redundant                    = true
  maxmemory_policy                 = "volatile-lru"
  maxfragmentationmemory_reserved  = 50
}

# Azure Storage configuration with redundancy and security
storage_config = {
  account_tier              = "Standard"
  account_replication_type  = "GRS"
  enable_https_traffic_only = true
  min_tls_version          = "TLS1_2"
  allow_blob_public_access  = false
  is_hns_enabled           = false
  network_rules = {
    default_action = "Deny"
    bypass         = ["AzureServices"]
  }
  blob_soft_delete_retention_days     = 30
  container_soft_delete_retention_days = 30
}

# Azure Key Vault configuration for secrets management
keyvault_config = {
  sku_name                    = "standard"
  enabled_for_disk_encryption = true
  soft_delete_retention_days  = 90
  purge_protection_enabled    = true
  network_acls = {
    default_action = "Deny"
    bypass         = "AzureServices"
  }
  enable_rbac_authorization = true
}

# Azure API Management configuration
apim_config = {
  sku_name             = "Premium"
  sku_capacity         = 1
  publisher_email      = "admin@meeting-minutes.com"
  publisher_name       = "Meeting Minutes System"
  virtual_network_type = "Internal"
  min_api_version      = "2019-12-01"
  enable_http2         = true
  enable_backend_ssl30 = false
  enable_backend_tls10 = false
  enable_backend_tls11 = false
}