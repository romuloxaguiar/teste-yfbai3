# Root outputs file exposing essential infrastructure details from child modules
# for the Automated Meeting Minutes System deployment

# Redis Cache connection string for distributed caching and session management
output "redis_connection_string" {
  description = "Secure connection string for Azure Redis Cache instance used for distributed caching and session management"
  value       = module.redis.redis_cache_connection_string
  sensitive   = true
}

# AKS cluster endpoint for container orchestration and deployment
output "aks_cluster_endpoint" {
  description = "AKS cluster API server endpoint for container orchestration and deployment management"
  value       = module.aks.cluster_endpoint
  sensitive   = true
}

# Storage account connection string for document and transcript storage
output "storage_primary_connection_string" {
  description = "Primary connection string for Azure Storage account used for document and transcript storage"
  value       = module.storage.primary_connection_string
  sensitive   = true
}

# Resource group name containing all deployment resources
output "resource_group_name" {
  description = "Name of the Azure resource group containing all deployment resources"
  value       = module.core.resource_group_name
  sensitive   = false
}

# Additional outputs for service integration and monitoring
output "key_vault_uri" {
  description = "URI of the Azure Key Vault for secure secret management"
  value       = module.keyvault.vault_uri
  sensitive   = false
}

output "app_insights_instrumentation_key" {
  description = "Application Insights instrumentation key for telemetry and monitoring"
  value       = module.monitoring.instrumentation_key
  sensitive   = true
}

output "sql_server_fqdn" {
  description = "Fully qualified domain name of the Azure SQL Server"
  value       = module.database.server_fqdn
  sensitive   = false
}

output "api_management_gateway_url" {
  description = "URL of the API Management gateway endpoint"
  value       = module.apim.gateway_url
  sensitive   = false
}

# Networking outputs for service communication
output "vnet_name" {
  description = "Name of the virtual network hosting the infrastructure"
  value       = module.network.vnet_name
  sensitive   = false
}

output "subnet_ids" {
  description = "Map of subnet IDs for different service tiers"
  value       = module.network.subnet_ids
  sensitive   = false
}

# Container registry details for image management
output "acr_login_server" {
  description = "Login server URL for Azure Container Registry"
  value       = module.container_registry.login_server
  sensitive   = false
}

output "acr_admin_username" {
  description = "Admin username for Azure Container Registry"
  value       = module.container_registry.admin_username
  sensitive   = true
}

# Service principal credentials for automation
output "service_principal_client_id" {
  description = "Client ID of the service principal used for automation"
  value       = module.service_principal.client_id
  sensitive   = true
}

# Cosmos DB connection details for analytics
output "cosmos_db_endpoint" {
  description = "Endpoint URL for Azure Cosmos DB instance"
  value       = module.cosmos_db.endpoint
  sensitive   = false
}

output "cosmos_db_primary_key" {
  description = "Primary key for Azure Cosmos DB authentication"
  value       = module.cosmos_db.primary_key
  sensitive   = true
}

# Event Hub connection details for real-time processing
output "event_hub_connection_string" {
  description = "Connection string for Azure Event Hub namespace"
  value       = module.event_hub.connection_string
  sensitive   = true
}

# CDN endpoint for static content delivery
output "cdn_endpoint_hostname" {
  description = "Hostname of the CDN endpoint for static content delivery"
  value       = module.cdn.endpoint_hostname
  sensitive   = false
}