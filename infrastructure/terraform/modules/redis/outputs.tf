# Output variable definitions for Azure Cache for Redis module
# Version: 1.0
# Provider Requirements:
# - hashicorp/terraform ~> 1.0

output "redis_id" {
  description = "The resource ID of the Azure Cache for Redis instance for resource referencing and management"
  value       = azurerm_redis_cache.main.id
  sensitive   = false
}

output "redis_name" {
  description = "The name of the Azure Cache for Redis instance for resource identification and client configuration"
  value       = azurerm_redis_cache.main.name
  sensitive   = false
}

output "redis_hostname" {
  description = "The hostname of the Azure Cache for Redis instance for client connection configuration"
  value       = azurerm_redis_cache.main.hostname
  sensitive   = false
}

output "redis_ssl_port" {
  description = "The SSL port of the Azure Cache for Redis instance for secure client connections"
  value       = azurerm_redis_cache.main.ssl_port
  sensitive   = false
}

output "redis_primary_access_key" {
  description = "The primary access key for authenticating connections to the Azure Cache for Redis instance"
  value       = azurerm_redis_cache.main.primary_access_key
  sensitive   = true
}

output "redis_connection_string" {
  description = "The fully formatted Redis connection string including authentication credentials for client configuration"
  value       = format("%s:%s@%s:%s", 
    azurerm_redis_cache.main.name,
    azurerm_redis_cache.main.primary_access_key,
    azurerm_redis_cache.main.hostname,
    azurerm_redis_cache.main.ssl_port
  )
  sensitive   = true
}