#Requires -Version 7.0
#Requires -Modules @{ModuleName='Az.KeyVault';ModuleVersion='4.0.0'},@{ModuleName='Az.Accounts';ModuleVersion='2.0.0'},@{ModuleName='Az.Monitor';ModuleVersion='3.0.0'}

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory = $true)]
    [string]$KeyVaultName,
    
    [Parameter(Mandatory = $true)]
    [string]$Location,
    
    [Parameter(Mandatory = $true)]
    [hashtable]$SecuritySettings,
    
    [Parameter(Mandatory = $true)]
    [hashtable]$ComplianceSettings
)

# Set strict error handling
$ErrorActionPreference = 'Stop'
$VerbosePreference = 'Continue'

# Define security constants
$SECURITY_LEVEL = 'High'
$COMPLIANCE_MODE = 'Strict'
$RETENTION_DAYS = 90
$AUDIT_RETENTION_DAYS = 365

function Connect-AzureServices {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$TenantId,
        
        [Parameter(Mandatory = $true)]
        [string]$SubscriptionId,
        
        [Parameter(Mandatory = $true)]
        [hashtable]$ConnectionOptions
    )
    
    try {
        Write-Verbose "Connecting to Azure with enhanced security validation..."
        
        # Validate required modules
        $requiredModules = @('Az.KeyVault', 'Az.Accounts', 'Az.Monitor')
        foreach ($module in $requiredModules) {
            if (-not (Get-Module -ListAvailable -Name $module)) {
                throw "Required module $module is not installed"
            }
        }
        
        # Connect with retry logic
        $maxRetries = 3
        $retryCount = 0
        $connected = $false
        
        do {
            try {
                Connect-AzAccount -TenantId $TenantId -SubscriptionId $SubscriptionId @ConnectionOptions
                $connected = $true
            }
            catch {
                $retryCount++
                if ($retryCount -eq $maxRetries) { throw }
                Start-Sleep -Seconds (2 * $retryCount)
            }
        } while (-not $connected -and $retryCount -lt $maxRetries)
        
        # Verify connection security
        $context = Get-AzContext
        if (-not $context) { throw "Failed to establish secure Azure connection" }
        
        Write-Verbose "Successfully connected to Azure subscription: $($context.Subscription.Name)"
        return $context
    }
    catch {
        Write-Error "Failed to connect to Azure: $_"
        throw
    }
}

function Initialize-KeyVault {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$ResourceGroupName,
        
        [Parameter(Mandatory = $true)]
        [string]$KeyVaultName,
        
        [Parameter(Mandatory = $true)]
        [string]$Location,
        
        [Parameter(Mandatory = $true)]
        [hashtable]$SecuritySettings,
        
        [Parameter(Mandatory = $true)]
        [hashtable]$ComplianceSettings
    )
    
    try {
        Write-Verbose "Initializing Key Vault with enhanced security features..."
        
        # Validate resource group
        $rg = Get-AzResourceGroup -Name $ResourceGroupName -ErrorAction SilentlyContinue
        if (-not $rg) {
            throw "Resource group $ResourceGroupName does not exist"
        }
        
        # Create Key Vault with advanced security settings
        $keyVaultParams = @{
            Name = $KeyVaultName
            ResourceGroupName = $ResourceGroupName
            Location = $Location
            Sku = 'Premium'
            EnablePurgeProtection = $true
            EnableRbacAuthorization = $true
            SoftDeleteRetentionInDays = $RETENTION_DAYS
            EnabledForDiskEncryption = $true
            EnabledForTemplateDeployment = $false
            EnabledForDeployment = $false
        }
        
        $keyVault = New-AzKeyVault @keyVaultParams
        
        # Configure network ACLs
        $networkAclParams = @{
            VaultName = $KeyVaultName
            ResourceGroupName = $ResourceGroupName
            DefaultAction = "Deny"
            Bypass = "AzureServices"
            IpAddressRange = $SecuritySettings.AllowedIpRanges
        }
        
        Update-AzKeyVaultNetworkRuleSet @networkAclParams
        
        # Configure diagnostic settings
        $diagSettings = @{
            Name = "$KeyVaultName-diag"
            ResourceId = $keyVault.ResourceId
            WorkspaceId = $ComplianceSettings.LogAnalyticsWorkspaceId
            Category = @("AuditEvent", "AzurePolicyEvaluationDetails")
            RetentionEnabled = $true
            RetentionInDays = $AUDIT_RETENTION_DAYS
        }
        
        Set-AzDiagnosticSetting @diagSettings
        
        # Configure backup and retention
        $backupParams = @{
            VaultName = $KeyVaultName
            ResourceGroupName = $ResourceGroupName
            EnableBackup = $true
            BackupRetentionDays = $ComplianceSettings.BackupRetentionDays
        }
        
        Set-AzKeyVaultBackupConfig @backupParams
        
        Write-Verbose "Key Vault initialization completed successfully"
        return $keyVault
    }
    catch {
        Write-Error "Failed to initialize Key Vault: $_"
        throw
    }
}

function Set-KeyVaultSecrets {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$KeyVaultName,
        
        [Parameter(Mandatory = $true)]
        [hashtable]$Secrets,
        
        [Parameter(Mandatory = true)]
        [hashtable]$RotationPolicy
    )
    
    try {
        Write-Verbose "Setting secrets in Key Vault with enhanced security..."
        
        foreach ($secret in $Secrets.GetEnumerator()) {
            # Validate secret name and value
            if (-not ($secret.Name -match '^[A-Za-z0-9-]{1,127}$')) {
                throw "Invalid secret name format: $($secret.Name)"
            }
            
            # Set secret with rotation policy
            $secretParams = @{
                VaultName = $KeyVaultName
                Name = $secret.Name
                SecretValue = (ConvertTo-SecureString -String $secret.Value -AsPlainText -Force)
                ContentType = "text/plain"
                NotBefore = (Get-Date)
                ExpiresOn = (Get-Date).AddDays($RotationPolicy.ExpiryDays)
                Tags = @{
                    Environment = $SecuritySettings.Environment
                    Application = "AutomatedMeetingMinutes"
                    SecurityLevel = $SECURITY_LEVEL
                }
            }
            
            $newSecret = Set-AzKeyVaultSecret @secretParams
            
            # Configure rotation schedule
            if ($RotationPolicy.EnableAutoRotation) {
                Add-AzKeyVaultSecretRotationPolicy -VaultName $KeyVaultName `
                    -SecretName $secret.Name `
                    -RotationDays $RotationPolicy.RotationDays
            }
        }
        
        Write-Verbose "Secrets configured successfully with rotation policies"
    }
    catch {
        Write-Error "Failed to set Key Vault secrets: $_"
        throw
    }
}

# Main execution block
try {
    # Connect to Azure
    $connectionParams = @{
        TenantId = $SecuritySettings.TenantId
        SubscriptionId = $SecuritySettings.SubscriptionId
        ConnectionOptions = @{
            UseDeviceAuthentication = $false
            ServicePrincipal = $true
            Credential = $SecuritySettings.ServicePrincipalCredential
        }
    }
    
    $azureContext = Connect-AzureServices @connectionParams
    
    # Initialize Key Vault
    $keyVault = Initialize-KeyVault -ResourceGroupName $ResourceGroupName `
        -KeyVaultName $KeyVaultName `
        -Location $Location `
        -SecuritySettings $SecuritySettings `
        -ComplianceSettings $ComplianceSettings
    
    # Configure secrets with rotation
    $rotationPolicy = @{
        EnableAutoRotation = $true
        RotationDays = 30
        ExpiryDays = 90
    }
    
    Set-KeyVaultSecrets -KeyVaultName $KeyVaultName `
        -Secrets $SecuritySettings.Secrets `
        -RotationPolicy $rotationPolicy
    
    Write-Verbose "Key Vault initialization and configuration completed successfully"
}
catch {
    Write-Error "Script execution failed: $_"
    throw
}