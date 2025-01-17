# Terraform variables definition file for Automated Meeting Minutes System
# Version: 1.0
# Provider: hashicorp/terraform ~> 1.0

# Project-level configuration
variable "project" {
  description = "Project name used for resource naming and tagging"
  type        = string
  default     = "meeting-minutes"

  validation {
    condition     = can(regex("^[a-z0-9-]{3,24}$", var.project))
    error_message = "Project name must be 3-24 characters, lowercase alphanumeric with hyphens"
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

variable "location" {
  description = "Azure region for resource deployment with failover support"
  type        = string
  default     = "eastus2"

  validation {
    condition     = contains(["eastus", "eastus2", "westus2", "northeurope", "westeurope"], var.location)
    error_message = "Location must be a supported Azure region with full service availability"
  }
}

# AKS cluster configuration
variable "aks_config" {
  description = "AKS cluster configuration for high availability and performance"
  type = object({
    node_count           = number
    vm_size             = string
    kubernetes_version  = string
    enable_auto_scaling = bool
    min_node_count      = number
    max_node_count      = number
    availability_zones  = list(number)
    network_plugin      = string
    network_policy      = string
    pod_cidr           = string
    service_cidr       = string
    dns_service_ip     = string
    docker_bridge_cidr = string
  })

  default = {
    node_count           = 3
    vm_size             = "Standard_D4s_v3"
    kubernetes_version  = "1.25"
    enable_auto_scaling = true
    min_node_count      = 3
    max_node_count      = 5
    availability_zones  = [1, 2, 3]
    network_plugin      = "azure"
    network_policy      = "calico"
    pod_cidr           = "10.244.0.0/16"
    service_cidr       = "10.0.0.0/16"
    dns_service_ip     = "10.0.0.10"
    docker_bridge_cidr = "172.17.0.1/16"
  }

  validation {
    condition     = var.aks_config.node_count >= 3 && var.aks_config.min_node_count >= 3 && length(var.aks_config.availability_zones) >= 3
    error_message = "AKS must have at least 3 nodes across 3 availability zones for high availability"
  }
}

# Azure SQL configuration
variable "sql_config" {
  description = "Azure SQL configuration for business-critical workloads"
  type = object({
    sku_name                    = string
    max_size_gb                 = number
    zone_redundant             = bool
    geo_backup_enabled         = bool
    backup_retention_days      = number
    geo_redundant_backup      = bool
    auto_pause_delay_minutes  = number
    min_capacity              = number
    read_scale               = bool
    read_replicas           = number
  })

  default = {
    sku_name                    = "BusinessCritical"
    max_size_gb                 = 256
    zone_redundant             = true
    geo_backup_enabled         = true
    backup_retention_days      = 35
    geo_redundant_backup      = true
    auto_pause_delay_minutes  = -1
    min_capacity              = 4
    read_scale               = true
    read_replicas           = 2
  }

  validation {
    condition     = var.sql_config.max_size_gb >= 128 && var.sql_config.max_size_gb <= 4096 && var.sql_config.backup_retention_days >= 35
    error_message = "SQL database must meet business-critical requirements for size and backup retention"
  }
}

# Azure Redis Cache configuration
variable "redis_config" {
  description = "Azure Redis Cache configuration for high performance"
  type = object({
    sku                                = string
    family                            = string
    capacity                          = number
    enable_non_ssl_port              = bool
    minimum_tls_version              = string
    shard_count                      = number
    zone_redundant                   = bool
    maxmemory_policy                = string
    maxfragmentationmemory_reserved = number
  })

  default = {
    sku                                = "Premium"
    family                            = "P"
    capacity                          = 2
    enable_non_ssl_port              = false
    minimum_tls_version              = "1.2"
    shard_count                      = 2
    zone_redundant                   = true
    maxmemory_policy                = "volatile-lru"
    maxfragmentationmemory_reserved = 50
  }
}

# Azure Storage configuration
variable "storage_config" {
  description = "Azure Storage configuration with redundancy"
  type = object({
    account_tier                      = string
    account_replication_type         = string
    enable_https_traffic_only       = bool
    min_tls_version                = string
    allow_blob_public_access       = bool
    is_hns_enabled                = bool
    network_rules                 = object({
      default_action = string
      bypass        = list(string)
    })
    blob_soft_delete_retention_days     = number
    container_soft_delete_retention_days = number
  })

  default = {
    account_tier                      = "Standard"
    account_replication_type         = "GRS"
    enable_https_traffic_only       = true
    min_tls_version                = "TLS1_2"
    allow_blob_public_access       = false
    is_hns_enabled                = false
    network_rules                 = {
      default_action = "Deny"
      bypass        = ["AzureServices"]
    }
    blob_soft_delete_retention_days     = 7
    container_soft_delete_retention_days = 7
  }
}

# Local value for consistent resource naming
locals {
  resource_prefix = "${var.project}-${var.environment}"
}