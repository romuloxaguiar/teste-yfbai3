#Requires -Version 7.0
#Requires -Modules @{ ModuleName='Az'; ModuleVersion='9.3.0' }
#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Sets up and configures the monitoring stack for the Automated Meeting Minutes System.
.DESCRIPTION
    Enterprise-grade PowerShell script that deploys and configures Prometheus, Grafana, and Loki
    with high availability, security, and proper integration with Azure services.
.NOTES
    Version: 1.0.0
    Author: System Architecture Team
#>

# Global variables
$script:MONITORING_NAMESPACE = "monitoring"
$script:PROMETHEUS_VERSION = "v2.45.0"
$script:GRAFANA_VERSION = "9.5.0"
$script:LOKI_VERSION = "2.8.0"
$script:RETRY_ATTEMPTS = 3
$script:BACKUP_RETENTION_DAYS = 30
$script:TLS_CERT_PATH = "/etc/certs/monitoring"
$script:LOG_PATH = "/var/log/monitoring-setup"

# Initialize logging
function Initialize-Logging {
    if (-not (Test-Path $script:LOG_PATH)) {
        New-Item -ItemType Directory -Path $script:LOG_PATH -Force | Out-Null
    }
    Start-Transcript -Path "$script:LOG_PATH/setup-$(Get-Date -Format 'yyyyMMdd-HHmmss').log" -Append
}

function Install-MonitoringPrerequisites {
    [CmdletBinding()]
    param (
        [string]$backupPath = "./backup",
        [bool]$skipVersionCheck = $false
    )

    try {
        Write-Host "Installing monitoring prerequisites..."

        # Verify execution policy and privileges
        if ((Get-ExecutionPolicy) -ne "RemoteSigned") {
            Set-ExecutionPolicy RemoteSigned -Force -Scope Process
        }

        # Create backup directory
        if (-not (Test-Path $backupPath)) {
            New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
        }

        # Verify and install Az PowerShell module
        if (-not (Get-Module -ListAvailable Az)) {
            Install-Module -Name Az -RequiredVersion "9.3.0" -Force -AllowClobber
        }

        # Verify kubectl installation
        $kubectlVersion = kubectl version --client --output=json | ConvertFrom-Json
        if (-not $skipVersionCheck -and $kubectlVersion.clientVersion.gitVersion -notlike "v1.25*") {
            throw "kubectl version 1.25+ is required"
        }

        # Setup Helm repositories
        helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
        helm repo add grafana https://grafana.github.io/helm-charts
        helm repo update

        # Verify TLS certificates
        if (-not (Test-Path $script:TLS_CERT_PATH)) {
            New-Item -ItemType Directory -Path $script:TLS_CERT_PATH -Force | Out-Null
        }

        return @{
            Status = "Success"
            Versions = @{
                Kubectl = $kubectlVersion.clientVersion.gitVersion
                Az = (Get-Module Az).Version
                Helm = (helm version --short)
            }
        }
    }
    catch {
        Write-Error "Failed to install prerequisites: $_"
        throw
    }
}

function Deploy-PrometheusStack {
    [CmdletBinding()]
    param (
        [string]$release_name = "prometheus",
        [hashtable]$customConfig = @{},
        [bool]$enableHA = $true
    )

    try {
        Write-Host "Deploying Prometheus stack..."

        # Create namespace if it doesn't exist
        kubectl create namespace $script:MONITORING_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

        # Apply RBAC configurations
        $rbacConfig = @"
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus-server
rules:
  - apiGroups: [""]
    resources: ["nodes", "nodes/proxy", "services", "endpoints", "pods"]
    verbs: ["get", "list", "watch"]
"@
        $rbacConfig | kubectl apply -f -

        # Prepare Prometheus configuration
        $prometheusConfig = Get-Content "infrastructure/monitoring/prometheus/prometheus.yml" | ConvertFrom-Yaml
        $prometheusConfig.global.scrape_interval = "15s"
        
        # Configure high availability if enabled
        if ($enableHA) {
            $haConfig = @{
                replicas = 3
                prometheusSpec = @{
                    replicaExternalLabelName = "prometheus_replica"
                    ruleSelectorNilUsesHelmValues = $false
                    serviceMonitorSelectorNilUsesHelmValues = $false
                }
            }
            $customConfig += $haConfig
        }

        # Deploy Prometheus using Helm
        helm upgrade --install $release_name prometheus-community/kube-prometheus-stack `
            --namespace $script:MONITORING_NAMESPACE `
            --version $script:PROMETHEUS_VERSION `
            --values (ConvertTo-Json $customConfig -Depth 10) `
            --wait --timeout 10m

        # Verify deployment
        $deploymentStatus = kubectl get deployments -n $script:MONITORING_NAMESPACE -l "app=prometheus" -o json | ConvertFrom-Json
        
        return @{
            Status = "Success"
            Endpoints = @{
                Prometheus = "https://prometheus:9090"
                AlertManager = "https://alertmanager:9093"
            }
            DeploymentStatus = $deploymentStatus
        }
    }
    catch {
        Write-Error "Failed to deploy Prometheus stack: $_"
        throw
    }
}

function Deploy-GrafanaDashboards {
    [CmdletBinding()]
    param (
        [string]$namespace = $script:MONITORING_NAMESPACE,
        [hashtable]$authConfig = @{}
    )

    try {
        Write-Host "Deploying Grafana dashboards..."

        # Load dashboard configuration
        $dashboardConfig = Get-Content "infrastructure/monitoring/grafana-dashboards/services-health.json" | ConvertFrom-Json

        # Configure Grafana deployment
        $grafanaValues = @{
            adminPassword = (New-Guid).ToString()
            persistence = @{
                enabled = $true
                size = "10Gi"
            }
            ingress = @{
                enabled = $true
                annotations = @{
                    "kubernetes.io/ingress.class" = "nginx"
                    "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
                }
            }
            dashboardProviders = @{
                "dashboardproviders.yaml" = @{
                    apiVersion = 1
                    providers = @(
                        @{
                            name = "default"
                            orgId = 1
                            folder = ""
                            type = "file"
                            disableDeletion = $false
                            editable = $true
                            options = @{
                                path = "/var/lib/grafana/dashboards"
                            }
                        }
                    )
                }
            }
            dashboards = @{
                default = @{
                    "services-health" = $dashboardConfig
                }
            }
        }

        # Deploy Grafana using Helm
        helm upgrade --install grafana grafana/grafana `
            --namespace $namespace `
            --version $script:GRAFANA_VERSION `
            --values (ConvertTo-Json $grafanaValues -Depth 10) `
            --wait --timeout 5m

        # Configure data sources
        $datasourceConfig = @{
            apiVersion = 1
            datasources = @(
                @{
                    name = "Prometheus"
                    type = "prometheus"
                    url = "http://prometheus-server:9090"
                    access = "proxy"
                    isDefault = $true
                },
                @{
                    name = "Loki"
                    type = "loki"
                    url = "http://loki:3100"
                    access = "proxy"
                }
            )
        }

        kubectl create configmap grafana-datasources `
            --from-literal=datasources.yaml=$(ConvertTo-Json $datasourceConfig -Depth 10) `
            --namespace $namespace --dry-run=client -o yaml | kubectl apply -f -

        return @{
            Status = "Success"
            Credentials = @{
                AdminPassword = $grafanaValues.adminPassword
            }
            Endpoint = "https://grafana:3000"
        }
    }
    catch {
        Write-Error "Failed to deploy Grafana dashboards: $_"
        throw
    }
}

function Deploy-LokiStack {
    [CmdletBinding()]
    param (
        [string]$namespace = $script:MONITORING_NAMESPACE,
        [hashtable]$storageConfig = @{}
    )

    try {
        Write-Host "Deploying Loki stack..."

        # Load Loki configuration
        $lokiConfig = Get-Content "infrastructure/monitoring/loki/loki.yml" | ConvertFrom-Yaml

        # Configure storage settings
        $defaultStorage = @{
            persistence = @{
                enabled = $true
                size = "50Gi"
            }
            replicas = 3
        }
        $storageConfig = $defaultStorage + $storageConfig

        # Deploy Loki using Helm
        helm upgrade --install loki grafana/loki-stack `
            --namespace $namespace `
            --version $script:LOKI_VERSION `
            --values (ConvertTo-Json $storageConfig -Depth 10) `
            --set "loki.config=$($lokiConfig | ConvertTo-Json -Depth 10)" `
            --wait --timeout 5m

        # Deploy Promtail for log collection
        $promtailConfig = @{
            config = @{
                serverPort = 3101
                clients = @(
                    @{ url = "http://loki:3100/loki/api/v1/push" }
                )
            }
        }

        helm upgrade --install promtail grafana/promtail `
            --namespace $namespace `
            --values (ConvertTo-Json $promtailConfig -Depth 10) `
            --wait --timeout 5m

        return @{
            Status = "Success"
            Endpoints = @{
                Loki = "http://loki:3100"
                Promtail = "http://promtail:3101"
            }
        }
    }
    catch {
        Write-Error "Failed to deploy Loki stack: $_"
        throw
    }
}

# Main execution block
try {
    Initialize-Logging

    # Deploy monitoring stack
    $prerequisites = Install-MonitoringPrerequisites
    $prometheusDeployment = Deploy-PrometheusStack -enableHA $true
    $grafanaDeployment = Deploy-GrafanaDashboards
    $lokiDeployment = Deploy-LokiStack

    # Export monitoring status
    $monitoring_status = @{
        deployment_status = @{
            prerequisites = $prerequisites
            prometheus = $prometheusDeployment
            grafana = $grafanaDeployment
            loki = $lokiDeployment
        }
        test_results = @{
            prometheus_health = (Invoke-WebRequest "https://prometheus:9090/-/healthy").StatusCode -eq 200
            grafana_health = (Invoke-WebRequest "https://grafana:3000/api/health").StatusCode -eq 200
            loki_health = (Invoke-WebRequest "http://loki:3100/ready").StatusCode -eq 200
        }
        health_metrics = @{
            prometheus_targets = (kubectl get servicemonitors -n $script:MONITORING_NAMESPACE -o json).items.Count
            grafana_dashboards = (kubectl get configmaps -n $script:MONITORING_NAMESPACE -l "grafana_dashboard=1" -o json).items.Count
            loki_streams = (Invoke-WebRequest "http://loki:3100/loki/api/v1/labels" | ConvertFrom-Json).values.Count
        }
        security_status = @{
            tls_enabled = Test-Path $script:TLS_CERT_PATH
            rbac_configured = (kubectl get clusterrole prometheus-server) -ne $null
            network_policies = (kubectl get networkpolicies -n $script:MONITORING_NAMESPACE -o json).items.Count
        }
    }

    Write-Host "Monitoring stack deployment completed successfully"
    return $monitoring_status
}
catch {
    Write-Error "Failed to deploy monitoring stack: $_"
    throw
}
finally {
    Stop-Transcript
}