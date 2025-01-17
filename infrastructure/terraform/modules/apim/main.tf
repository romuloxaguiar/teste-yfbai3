# Azure API Management Terraform configuration for Automated Meeting Minutes System
# Provider: hashicorp/azurerm ~> 3.0

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

locals {
  apim_name = "${var.environment}-ams-apim"
  common_tags = {
    Service     = "API Management"
    Environment = var.environment
    ManagedBy   = "Terraform"
    Project     = "Automated Meeting Minutes System"
  }
}

# Azure API Management instance
resource "azurerm_api_management" "apim" {
  name                = local.apim_name
  location            = var.location
  resource_group_name = var.resource_group_name
  publisher_name      = var.publisher_name
  publisher_email     = var.publisher_email
  sku_name           = "${var.sku_name}_${var.sku_capacity}"

  identity {
    type = "SystemAssigned"
  }

  # Virtual network integration if specified
  dynamic "virtual_network_configuration" {
    for_each = var.virtual_network_type != "None" ? [1] : []
    content {
      subnet_id = var.subnet_id
    }
  }

  # Enhanced security settings
  security {
    enable_backend_ssl30          = false
    enable_backend_tls10          = false
    enable_backend_tls11          = false
    enable_frontend_ssl30         = false
    enable_frontend_tls10         = false
    enable_frontend_tls11         = false
    enable_http2                  = true
    triple_des_ciphers_enabled    = false
  }

  # Protocol settings
  protocols {
    enable_http2 = true
  }

  # Additional settings for production environments
  dynamic "additional_location" {
    for_each = var.environment == "prod" ? [1] : []
    content {
      location = var.location
      capacity = max(var.sku_capacity - 1, 1)
    }
  }

  # Policy configuration
  policy {
    xml_content = <<XML
    <policies>
      <inbound>
        <cors>
          <allowed-origins>
            <origin>https://*.microsoft.com</origin>
          </allowed-origins>
          <allowed-methods>
            <method>GET</method>
            <method>POST</method>
            <method>PUT</method>
            <method>DELETE</method>
            <method>OPTIONS</method>
          </allowed-methods>
          <allowed-headers>
            <header>*</header>
          </allowed-headers>
          <expose-headers>
            <header>*</header>
          </expose-headers>
        </cors>
        <rate-limit-by-key calls="1000" renewal-period="60" counter-key="@(context.Request.IpAddress)" />
        <validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized. Access token is missing or invalid.">
          <openid-config url="https://login.microsoftonline.com/common/.well-known/openid-configuration" />
          <required-claims>
            <claim name="aud" match="any">
              <value>api://ams-api</value>
            </claim>
          </required-claims>
        </validate-jwt>
      </inbound>
      <backend>
        <forward-request />
      </backend>
      <outbound>
        <set-header name="X-Content-Type-Options" exists-action="override">
          <value>nosniff</value>
        </set-header>
        <set-header name="X-Frame-Options" exists-action="override">
          <value>DENY</value>
        </set-header>
        <set-header name="Content-Security-Policy" exists-action="override">
          <value>default-src 'self'</value>
        </set-header>
      </outbound>
    </policies>
    XML
  }

  tags = merge(local.common_tags, var.tags)

  lifecycle {
    prevent_destroy = var.environment == "prod"
  }
}

# Application Insights Logger
resource "azurerm_api_management_logger" "apim" {
  name                = "${local.apim_name}-logger"
  api_management_name = azurerm_api_management.apim.name
  resource_group_name = var.resource_group_name

  application_insights {
    instrumentation_key = var.app_insights_key
  }
}

# Named Values for environment-specific configurations
resource "azurerm_api_management_named_value" "environment" {
  name                = "EnvironmentName"
  api_management_name = azurerm_api_management.apim.name
  resource_group_name = var.resource_group_name
  display_name        = "EnvironmentName"
  value              = var.environment
  secret             = false
}

# Diagnostic settings for monitoring
resource "azurerm_monitor_diagnostic_setting" "apim" {
  name                       = "${local.apim_name}-diagnostics"
  target_resource_id         = azurerm_api_management.apim.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  log {
    category = "GatewayLogs"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 30
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 30
    }
  }
}

# Outputs for use in other modules
output "apim_name" {
  value       = azurerm_api_management.apim.name
  description = "The name of the API Management service"
}

output "gateway_url" {
  value       = azurerm_api_management.apim.gateway_url
  description = "The gateway URL of the API Management service"
}

output "identity" {
  value       = azurerm_api_management.apim.identity
  description = "The managed identity of the API Management service"
  sensitive   = true
}

output "public_ip_addresses" {
  value       = azurerm_api_management.apim.public_ip_addresses
  description = "The public IP addresses of the API Management service"
}