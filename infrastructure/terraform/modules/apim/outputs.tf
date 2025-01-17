# Output definitions for Azure API Management module
# Version: 1.0
# Provider: hashicorp/terraform ~> 1.0

output "apim_name" {
  description = "Name of the deployed APIM instance"
  value       = azurerm_api_management.apim.name
}

output "gateway_url" {
  description = "Gateway URL for the APIM instance"
  value       = azurerm_api_management.apim.gateway_url
}

output "identity_principal_id" {
  description = "Principal ID of the system-assigned managed identity"
  value       = azurerm_api_management.apim.identity[0].principal_id
}

output "identity_tenant_id" {
  description = "Tenant ID of the system-assigned managed identity"
  value       = azurerm_api_management.apim.identity[0].tenant_id
}