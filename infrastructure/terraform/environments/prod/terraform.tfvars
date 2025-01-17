# Production environment Terraform variable definitions
# Version: 1.0
# Provider: hashicorp/terraform ~> 1.0

# Project and environment identifiers
project     = "meeting-minutes"
environment = "prod"
location    = "eastus2"

# AKS cluster configuration for production
aks_config = {
  node_count           = 5
  vm_size             = "Standard_D4s_v3"
  kubernetes_version  = "1.25"
  enable_auto_scaling = true
  min_node_count      = 5
  max_node_count      = 10
  availability_zones  = [1, 2, 3]
  network_plugin      = "azure"
  network_policy      = "calico"
  pod_cidr           = "10.244.0.0/16"
  service_cidr       = "10.0.0.0/16"
  dns_service_ip     = "10.0.0.10"
  docker_bridge_cidr = "172.17.0.1/16"
}

# Azure SQL configuration for business-critical workloads
sql_config = {
  sku_name                    = "BusinessCritical"
  max_size_gb                 = 512
  zone_redundant             = true
  geo_backup_enabled         = true
  backup_retention_days      = 35
  geo_redundant_backup      = true
  auto_pause_delay_minutes  = -1  # Disabled for production
  min_capacity              = 8
  read_scale               = true
  read_replicas           = 3
}

# Azure Redis Cache configuration for high performance
redis_config = {
  sku                                = "Premium"
  family                            = "P"
  capacity                          = 4
  enable_non_ssl_port              = false
  minimum_tls_version              = "1.2"
  shard_count                      = 4
  zone_redundant                   = true
  maxmemory_policy                = "volatile-lru"
  maxfragmentationmemory_reserved = 50
}

# Azure Storage configuration with geo-redundancy
storage_config = {
  account_tier              = "Standard"
  account_replication_type = "RA-GRS"
  enable_https_traffic_only = true
  min_tls_version          = "TLS1_2"
  allow_blob_public_access = false
  is_hns_enabled          = false
  network_rules = {
    default_action = "Deny"
    bypass        = ["AzureServices"]
  }
  blob_soft_delete_retention_days     = 90
  container_soft_delete_retention_days = 90
}

# Key Vault configuration for secrets management
keyvault_config = {
  sku_name                    = "premium"
  enabled_for_disk_encryption = true
  soft_delete_retention_days  = 90
  purge_protection_enabled    = true
  network_acls = {
    default_action = "Deny"
    bypass        = "AzureServices"
  }
}

# API Management configuration for production
apim_config = {
  sku_name         = "Premium"
  sku_capacity     = 2
  publisher_email  = "operations@meeting-minutes.com"
  publisher_name   = "Meeting Minutes Operations"
  zone_redundant   = true
  network_type     = "Internal"
  min_api_version  = "2019-12-01"
  protocols        = ["https"]
  virtual_network_type = "Internal"
}