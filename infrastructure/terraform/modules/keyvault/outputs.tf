# Core Key Vault resource outputs
output "key_vault_id" {
  description = "The Azure resource ID of the Key Vault - Required for resource referencing and RBAC assignments"
  value       = azurerm_key_vault.main.id
  sensitive   = false
}

output "key_vault_name" {
  description = "The name of the Key Vault - Used for resource identification and integration with other services"
  value       = azurerm_key_vault.main.name
  sensitive   = false
}

output "key_vault_uri" {
  description = "The URI of the Key Vault - Required for service authentication and secure secret access"
  value       = azurerm_key_vault.main.vault_uri
  sensitive   = false
}

output "key_vault_tenant_id" {
  description = "The Azure AD tenant ID associated with the Key Vault - Used for authentication and access control"
  value       = azurerm_key_vault.main.tenant_id
  sensitive   = false
}

# Validation to ensure all required outputs are properly defined
locals {
  # Validate that all required outputs have non-null values
  validate_outputs = {
    validate_id = can(coalesce(azurerm_key_vault.main.id)) ? null : file("ERROR: Key Vault ID is undefined")
    validate_name = can(coalesce(azurerm_key_vault.main.name)) ? null : file("ERROR: Key Vault name is undefined")
    validate_uri = can(coalesce(azurerm_key_vault.main.vault_uri)) ? null : file("ERROR: Key Vault URI is undefined")
    validate_tenant = can(coalesce(azurerm_key_vault.main.tenant_id)) ? null : file("ERROR: Key Vault tenant ID is undefined")
  }
}