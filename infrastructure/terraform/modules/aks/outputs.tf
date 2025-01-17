# Output definitions for the Azure Kubernetes Service (AKS) module
# Version: ~> 1.0

output "cluster_id" {
  description = "The unique identifier of the AKS cluster for reference in other Azure resources and configurations"
  value       = azurerm_kubernetes_cluster.main.id
  sensitive   = false
}

output "cluster_name" {
  description = "The name of the AKS cluster for use in scripts and configurations"
  value       = azurerm_kubernetes_cluster.main.name
  sensitive   = false
}

output "cluster_fqdn" {
  description = "The fully qualified domain name of the AKS cluster for DNS and networking configurations"
  value       = azurerm_kubernetes_cluster.main.fqdn
  sensitive   = false
}

output "kube_config" {
  description = "Raw Kubernetes configuration for cluster access, marked sensitive to prevent exposure"
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}

output "cluster_identity" {
  description = "The principal ID of the system-assigned managed identity for RBAC assignments"
  value       = azurerm_kubernetes_cluster.main.identity[0].principal_id
  sensitive   = false
}

output "node_resource_group" {
  description = "The name of the auto-generated resource group containing the AKS cluster nodes"
  value       = azurerm_kubernetes_cluster.main.node_resource_group
  sensitive   = false
}