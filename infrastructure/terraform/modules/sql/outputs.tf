# Output variable definitions for Azure SQL Database module
# Version: 1.0
# Provider: hashicorp/terraform ~> 1.0

output "server_name" {
  description = "The name of the Azure SQL Server for secure configuration and integration"
  value       = azurerm_mssql_server.sql_server.name
  sensitive   = false
}

output "database_name" {
  description = "The name of the Azure SQL Database for secure configuration and integration"
  value       = azurerm_mssql_database.database.name
  sensitive   = false
}

output "server_id" {
  description = "The resource ID of the Azure SQL Server with security considerations"
  value       = azurerm_mssql_server.sql_server.id
  sensitive   = true
}

output "database_id" {
  description = "The resource ID of the Azure SQL Database with security considerations"
  value       = azurerm_mssql_database.database.id
  sensitive   = true
}

output "connection_string" {
  description = "The connection string for the Azure SQL Database with masked sensitive information"
  value       = "Server=tcp:${azurerm_mssql_server.sql_server.fully_qualified_domain_name},1433;Initial Catalog=${azurerm_mssql_database.database.name};Persist Security Info=False;MultipleActiveResultSets=True;Encrypt=True;TrustServerCertificate=False;Authentication=Active Directory Default;"
  sensitive   = true
}

output "formatted_connection_string" {
  description = "Fully formatted connection string with all required parameters for application use"
  value       = format(
    "Server=tcp:%s,1433;Initial Catalog=%s;Persist Security Info=False;MultipleActiveResultSets=True;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;Authentication=Active Directory Default;",
    azurerm_mssql_server.sql_server.fully_qualified_domain_name,
    azurerm_mssql_database.database.name
  )
  sensitive = true
}

output "administrator_login" {
  description = "The administrator username for the SQL Server with enhanced security"
  value       = azurerm_mssql_server.sql_server.administrator_login
  sensitive   = true
}