# Project and Environment Configuration
project     = "meeting-minutes"
environment = "dev"
location    = "eastus2"

# AKS Cluster Configuration
aks_config = {
  node_count              = 3
  vm_size                = "Standard_D4s_v3"
  kubernetes_version     = "1.25"
  enable_auto_scaling    = true
  min_node_count         = 3
  max_node_count         = 5
  network_plugin         = "azure"
  network_policy         = "calico"
  load_balancer_sku      = "standard"
  os_disk_size_gb        = 128
  enable_node_public_ip  = false
  availability_zones     = ["1", "2", "3"]
  pod_cidr              = "10.244.0.0/16"
  service_cidr          = "10.0.0.0/16"
  dns_service_ip        = "10.0.0.10"
  docker_bridge_cidr    = "172.17.0.1/16"
}

# Azure SQL Configuration
sql_config = {
  sku_name                        = "BusinessCritical"
  max_size_gb                     = 256
  zone_redundant                  = true
  geo_backup_enabled              = true
  backup_retention_days           = 7
  geo_redundant_backup           = true
  auto_pause_delay_minutes       = 60
  min_capacity                   = 2
  read_scale                    = true
  read_replicas                = 1
  enable_threat_detection      = true
  enable_vulnerability_assessment = true
}

# Redis Cache Configuration
redis_config = {
  sku                                = "Premium"
  family                            = "P"
  capacity                          = 2
  enable_non_ssl_port               = false
  minimum_tls_version               = "1.2"
  public_network_access_enabled     = false
  redis_version                     = "6.0"
  enable_authentication             = true
  maxmemory_policy                 = "volatile-lru"
  maxfragmentationmemory_reserved = 50
  maxmemory_reserved              = 50
  shard_count                     = 2
  zone_redundant                  = true
}

# Storage Account Configuration
storage_config = {
  account_tier                = "Standard"
  account_replication_type    = "GRS"
  enable_https_traffic_only   = true
  min_tls_version            = "TLS1_2"
  allow_blob_public_access    = false
  enable_versioning          = true
  enable_hierarchical_namespace = true
  network_rules = {
    default_action = "Deny"
    bypass         = ["AzureServices"]
  }
  blob_soft_delete_retention_days     = 7
  container_soft_delete_retention_days = 7
  is_hns_enabled                      = true
}

# Key Vault Configuration
keyvault_config = {
  sku_name                    = "standard"
  enabled_for_disk_encryption = true
  soft_delete_retention_days  = 90
  purge_protection_enabled    = true
  enable_rbac_authorization   = true
  network_acls = {
    default_action = "Deny"
    bypass         = "AzureServices"
  }
}

# API Management Configuration
apim_config = {
  sku_name          = "Premium"
  sku_capacity      = 1
  publisher_email   = "admin@meeting-minutes.dev"
  publisher_name    = "Meeting Minutes Development Team"
  virtual_network_type = "Internal"
  protocols = {
    enable_http2         = true
    enable_backend_tls11 = false
  }
  security = {
    enable_backend_ssl30       = false
    enable_triple_des_ciphers = false
  }
}