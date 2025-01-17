# Azure Kubernetes Service (AKS) Module
# Version: ~> 1.0
# Provider versions
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

# Data source for current Azure subscription details
data "azurerm_client_config" "current" {}

# Local variables for resource naming and configuration
locals {
  cluster_name_sanitized = lower(replace(var.cluster_name, "/[^a-zA-Z0-9-]/", "-"))
}

# Log Analytics Workspace for AKS monitoring
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.cluster_name}-logs"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                = "PerGB2018"
  retention_in_days   = 30
  tags               = var.tags
}

# Primary AKS Cluster Resource
resource "azurerm_kubernetes_cluster" "main" {
  name                = var.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = local.cluster_name_sanitized
  kubernetes_version  = var.kubernetes_version

  # Default node pool configuration
  default_node_pool {
    name                = "default"
    node_count          = var.node_count
    vm_size            = var.vm_size
    enable_auto_scaling = var.enable_auto_scaling
    min_count          = var.min_node_count
    max_count          = var.max_node_count
    availability_zones = ["1", "2", "3"]
    enable_node_public_ip = false
    type                = "VirtualMachineScaleSets"
    os_disk_size_gb     = 128
    os_disk_type        = "Managed"
    max_pods            = 110
    vnet_subnet_id      = var.subnet_id
  }

  # Managed Identity configuration
  identity {
    type = "SystemAssigned"
  }

  # Network profile configuration
  network_profile {
    network_plugin     = var.network_plugin
    network_policy     = var.network_policy
    service_cidr       = var.service_cidr
    dns_service_ip     = var.dns_service_ip
    docker_bridge_cidr = var.docker_bridge_cidr
    load_balancer_sku  = "standard"
    outbound_type      = "loadBalancer"
  }

  # Azure AD RBAC configuration
  azure_active_directory_role_based_access_control {
    managed                = true
    admin_group_object_ids = var.admin_group_object_ids
    azure_rbac_enabled     = true
    tenant_id             = data.azurerm_client_config.current.tenant_id
  }

  # Add-on profile configuration
  addon_profile {
    azure_policy {
      enabled = true
    }
    oms_agent {
      enabled                    = true
      log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
    }
    azure_keyvault_secrets_provider {
      enabled = true
    }
  }

  # Maintenance window configuration
  maintenance_window {
    allowed {
      day   = "Sunday"
      hours = [21, 22, 23]
    }
  }

  # Cluster autoscaler profile
  auto_scaler_profile {
    scale_down_delay_after_add      = "15m"
    scale_down_unneeded             = "15m"
    max_graceful_termination_sec    = "600"
    balance_similar_node_groups     = true
    expander                        = "random"
    max_node_provision_time         = "15m"
    scale_down_delay_after_delete   = "10s"
    scale_down_delay_after_failure  = "3m"
    scan_interval                   = "10s"
    skip_nodes_with_local_storage   = true
    skip_nodes_with_system_pods     = true
  }

  # Security profile configuration
  security_profile {
    defender_enabled           = true
    workload_identity_enabled  = true
    enable_host_encryption     = true
  }

  # Automatic upgrade configuration
  automatic_channel_upgrade = "stable"

  # Storage profile configuration
  storage_profile {
    blob_driver_enabled         = true
    disk_driver_enabled         = true
    file_driver_enabled        = true
    snapshot_controller_enabled = true
  }

  # API server access profile
  api_server_access_profile {
    authorized_ip_ranges = ["0.0.0.0/0"] # Should be restricted in production
    enable_private_cluster = false
  }

  tags = var.tags

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      kubernetes_version,
      default_node_pool[0].node_count
    ]
  }
}

# Outputs for use by other modules
output "cluster_id" {
  description = "The ID of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.id
}

output "cluster_name" {
  description = "The name of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.name
}

output "kube_config" {
  description = "Kubeconfig for cluster access"
  value       = azurerm_kubernetes_cluster.main.kube_config
  sensitive   = true
}

output "identity" {
  description = "The identity of the AKS cluster"
  value       = azurerm_kubernetes_cluster.main.identity
}

output "node_resource_group" {
  description = "The auto-generated resource group which contains the resources for this managed Kubernetes cluster"
  value       = azurerm_kubernetes_cluster.main.node_resource_group
}