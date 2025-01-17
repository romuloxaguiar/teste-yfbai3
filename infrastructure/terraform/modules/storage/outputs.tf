# Output definitions for Azure Storage module
# Exposes storage account properties and endpoints for integration with other modules
# and the root configuration

output "storage_account_name" {
  description = "Name of the created storage account"
  value       = azurerm_storage_account.main.name
}

output "storage_account_id" {
  description = "Resource ID of the storage account"
  value       = azurerm_storage_account.main.id
}

output "primary_blob_endpoint" {
  description = "Primary blob service endpoint URL"
  value       = azurerm_storage_account.main.primary_blob_endpoint
}

output "primary_access_key" {
  description = "Primary access key for the storage account"
  value       = azurerm_storage_account.main.primary_access_key
  sensitive   = true
}

output "transcripts_container_name" {
  description = "Name of the container for storing meeting transcripts"
  value       = azurerm_storage_container.transcripts.name
}

output "minutes_container_name" {
  description = "Name of the container for storing generated meeting minutes"
  value       = azurerm_storage_container.minutes.name
}

output "storage_account_identity" {
  description = "System-assigned managed identity details of the storage account"
  value       = azurerm_storage_account.main.identity[0]
}

output "blob_service_url" {
  description = "URL to the blob service API endpoint"
  value       = "${azurerm_storage_account.main.primary_blob_endpoint}"
}

output "lifecycle_policy_id" {
  description = "Resource ID of the storage lifecycle management policy"
  value       = azurerm_storage_management_policy.lifecycle.id
}

output "diagnostic_settings_id" {
  description = "Resource ID of the diagnostic settings configuration"
  value       = azurerm_monitor_diagnostic_setting.storage.id
}