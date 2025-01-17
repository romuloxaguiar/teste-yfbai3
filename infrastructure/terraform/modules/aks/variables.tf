# Terraform variables for Azure Kubernetes Service (AKS) module
# Version: ~> 1.0

variable "cluster_name" {
  description = "Name of the AKS cluster - must be globally unique within resource group"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9-]{3,24}$", var.cluster_name))
    error_message = "Cluster name must be 3-24 characters, lowercase alphanumeric with hyphens"
  }
}

variable "resource_group_name" {
  description = "Name of the existing resource group for AKS deployment"
  type        = string
}

variable "location" {
  description = "Azure region for AKS cluster deployment - must be a supported region"
  type        = string
  validation {
    condition     = contains(["eastus", "eastus2", "westus2", "northeurope", "westeurope"], var.location)
    error_message = "Location must be a supported Azure region"
  }
}

variable "kubernetes_version" {
  description = "Kubernetes version for AKS cluster - must be 1.25 or higher for security compliance"
  type        = string
  validation {
    condition     = can(regex("^1\\.(2[5-9]|[3-9][0-9])\\.", var.kubernetes_version))
    error_message = "Kubernetes version must be 1.25 or higher"
  }
}

variable "node_count" {
  description = "Initial number of nodes in the default node pool - minimum 3 for high availability"
  type        = number
  default     = 3
  validation {
    condition     = var.node_count >= 3
    error_message = "Node count must be at least 3 for high availability"
  }
}

variable "vm_size" {
  description = "VM size for AKS nodes - must support premium storage"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "enable_auto_scaling" {
  description = "Enable cluster autoscaling for dynamic workload management"
  type        = bool
  default     = true
}

variable "min_node_count" {
  description = "Minimum number of nodes when autoscaling is enabled - ensures HA"
  type        = number
  default     = 3
  validation {
    condition     = var.min_node_count >= 3
    error_message = "Minimum node count must be at least 3 for high availability"
  }
}

variable "max_node_count" {
  description = "Maximum number of nodes when autoscaling is enabled - cost control"
  type        = number
  default     = 5
  validation {
    condition     = var.max_node_count >= var.min_node_count
    error_message = "Maximum node count must be greater than or equal to minimum node count"
  }
}

variable "network_plugin" {
  description = "Network plugin for AKS - azure CNI recommended for production"
  type        = string
  default     = "azure"
  validation {
    condition     = contains(["azure", "kubenet"], var.network_plugin)
    error_message = "Network plugin must be either azure or kubenet"
  }
}

variable "network_policy" {
  description = "Network policy plugin for pod network security"
  type        = string
  default     = "azure"
  validation {
    condition     = contains(["azure", "calico"], var.network_policy)
    error_message = "Network policy must be either azure or calico"
  }
}

variable "service_cidr" {
  description = "CIDR range for Kubernetes services - must not overlap with VNet"
  type        = string
  default     = "10.0.0.0/16"
}

variable "dns_service_ip" {
  description = "IP address for Kubernetes DNS service - must be within service_cidr"
  type        = string
  default     = "10.0.0.10"
}

variable "docker_bridge_cidr" {
  description = "CIDR for Docker bridge network - must not overlap with other networks"
  type        = string
  default     = "172.17.0.1/16"
}

variable "admin_group_object_ids" {
  description = "Azure AD group object IDs for cluster admin access - required for RBAC"
  type        = list(string)
}

variable "tags" {
  description = "Tags to apply to all AKS cluster resources for resource management"
  type        = map(string)
  default     = {}
}