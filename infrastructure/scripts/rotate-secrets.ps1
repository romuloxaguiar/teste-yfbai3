#Requires -Version 7.0
#Requires -Modules @{ModuleName='Az.KeyVault';ModuleVersion='4.0.0'},@{ModuleName='Az.Accounts';ModuleVersion='2.0.0'}

# Dot-source the init-keyvault.ps1 script for shared functions
. (Join-Path $PSScriptRoot 'init-keyvault.ps1')

# Set strict error handling and preferences
$ErrorActionPreference = 'Stop'
$VerbosePreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

function Get-SecretsToRotate {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$keyVaultName,
        
        [Parameter(Mandatory = $true)]
        [int]$maxAgeInDays,
        
        [Parameter(Mandatory = $true)]
        [hashtable]$compliancePolicy
    )
    
    try {
        Write-Verbose "Retrieving secrets requiring rotation from $keyVaultName"
        
        # Get all secrets from Key Vault
        $secrets = Get-AzKeyVaultSecret -VaultName $keyVaultName
        $secretsToRotate = @()
        
        foreach ($secret in $secrets) {
            $metadata = Get-AzKeyVaultSecret -VaultName $keyVaultName -Name $secret.Name
            $age = (Get-Date) - $metadata.Created
            $isExpiring = $age.TotalDays -ge $maxAgeInDays
            
            # Check compliance requirements
            $requiresRotation = $false
            if ($isExpiring -or 
                $metadata.Tags.SecurityLevel -eq 'High' -or
                $metadata.Tags.ComplianceRequired -eq 'True') {
                $requiresRotation = $true
            }
            
            if ($requiresRotation) {
                $secretsToRotate += @{
                    Name = $secret.Name
                    Age = $age.TotalDays
                    ExpiryDate = $metadata.ExpiresOn
                    Tags = $metadata.Tags
                    Version = $metadata.Version
                }
            }
        }
        
        Write-Verbose "Found $($secretsToRotate.Count) secrets requiring rotation"
        return $secretsToRotate
    }
    catch {
        Write-Error "Failed to retrieve secrets for rotation: $_"
        throw
    }
}

function New-SecretValue {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$secretName,
        
        [Parameter(Mandatory = $true)]
        [string]$secretType,
        
        [Parameter(Mandatory = $true)]
        [hashtable]$complexityRequirements
    )
    
    try {
        Write-Verbose "Generating new value for secret: $secretName"
        
        # Define character sets
        $upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        $lowerChars = 'abcdefghijklmnopqrstuvwxyz'
        $numbers = '0123456789'
        $specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?'
        
        # Generate random value based on secret type
        switch ($secretType) {
            'Password' {
                $length = $complexityRequirements.MinLength
                $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
                $bytes = [byte[]]::new($length)
                $rng.GetBytes($bytes)
                
                $password = ''
                # Ensure minimum requirements
                $password += Get-Random -Count 2 -InputObject $upperChars.ToCharArray()
                $password += Get-Random -Count 2 -InputObject $lowerChars.ToCharArray()
                $password += Get-Random -Count 2 -InputObject $numbers.ToCharArray()
                $password += Get-Random -Count 2 -InputObject $specialChars.ToCharArray()
                
                # Fill remaining length with random chars
                $remainingLength = $length - $password.Length
                $allChars = $upperChars + $lowerChars + $numbers + $specialChars
                $password += Get-Random -Count $remainingLength -InputObject $allChars.ToCharArray()
                
                # Shuffle the password
                $password = -join ($password.ToCharArray() | Get-Random -Count $password.Length)
                
                return ConvertTo-SecureString $password -AsPlainText -Force
            }
            'ConnectionString' {
                # Generate connection string components
                $server = "server-$((New-Guid).ToString().Substring(0,8))"
                $database = "db-$((New-Guid).ToString().Substring(0,8))"
                $username = "user-$((New-Guid).ToString().Substring(0,8))"
                $password = New-SecretValue -secretName "$secretName-pwd" -secretType 'Password' -complexityRequirements $complexityRequirements
                
                $connString = "Server=$server;Database=$database;User Id=$username;Password=$password"
                return ConvertTo-SecureString $connString -AsPlainText -Force
            }
            default {
                throw "Unsupported secret type: $secretType"
            }
        }
    }
    catch {
        Write-Error "Failed to generate new secret value: $_"
        throw
    }
}

function Update-ServiceConfigurations {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$serviceName,
        
        [Parameter(Mandatory = $true)]
        [hashtable]$secretUpdates,
        
        [Parameter(Mandatory = $true)]
        [object]$rollbackPlan
    )
    
    try {
        Write-Verbose "Updating service configurations for $serviceName"
        
        # Create backup of current state
        $backup = @{
            Timestamp = Get-Date
            Service = $serviceName
            Configurations = @{}
        }
        
        # Update configurations with zero-downtime strategy
        foreach ($update in $secretUpdates.GetEnumerator()) {
            # Store current value for rollback
            $backup.Configurations[$update.Key] = Get-AzKeyVaultSecret -VaultName $update.Value.VaultName -Name $update.Key
            
            # Update Kubernetes secrets if applicable
            if ($update.Value.Type -eq 'K8s') {
                $secretData = @{
                    $update.Key = $update.Value.NewValue
                }
                kubectl create secret generic $update.Key --from-literal=$secretData --dry-run=client -o yaml | kubectl apply -f -
            }
            
            # Update connection strings in app configuration
            if ($update.Value.Type -eq 'ConnectionString') {
                Set-AzAppConfigurationKeyValue -Name $serviceName `
                    -Key $update.Key `
                    -Value $update.Value.NewValue `
                    -Label "updated-$(Get-Date -Format 'yyyyMMddHHmmss')"
            }
        }
        
        # Verify service health
        $healthCheck = Invoke-RestMethod -Uri "https://$serviceName.azurewebsites.net/health"
        if ($healthCheck.status -ne 'healthy') {
            throw "Service health check failed after configuration update"
        }
        
        Write-Verbose "Service configurations updated successfully"
        return $true
    }
    catch {
        Write-Error "Failed to update service configurations: $_"
        # Execute rollback
        foreach ($backup in $backup.Configurations.GetEnumerator()) {
            Set-AzKeyVaultSecret -VaultName $rollbackPlan.VaultName -Name $backup.Key -SecretValue $backup.Value.SecretValue
        }
        throw
    }
}

function Start-SecretRotation {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$keyVaultName,
        
        [Parameter(Mandatory = $true)]
        [int]$maxAgeInDays,
        
        [Parameter(Mandatory = $true)]
        [hashtable]$rotationConfig
    )
    
    try {
        Write-Verbose "Starting secret rotation process for $keyVaultName"
        
        # Initialize logging
        $logFile = Join-Path $env:TEMP "SecretRotation_$(Get-Date -Format 'yyyyMMddHHmmss').log"
        Start-Transcript -Path $logFile
        
        # Get secrets requiring rotation
        $secretsToRotate = Get-SecretsToRotate -keyVaultName $keyVaultName `
            -maxAgeInDays $maxAgeInDays `
            -compliancePolicy $rotationConfig.CompliancePolicy
        
        $results = @{
            StartTime = Get-Date
            RotatedSecrets = @()
            FailedSecrets = @()
            Errors = @()
        }
        
        foreach ($secret in $secretsToRotate) {
            try {
                # Generate new secret value
                $newValue = New-SecretValue -secretName $secret.Name `
                    -secretType $rotationConfig.SecretTypes[$secret.Name] `
                    -complexityRequirements $rotationConfig.ComplexityRequirements
                
                # Update secret in Key Vault
                $secretParams = @{
                    VaultName = $keyVaultName
                    Name = $secret.Name
                    SecretValue = $newValue
                    ContentType = $rotationConfig.SecretTypes[$secret.Name]
                    Tags = $secret.Tags
                }
                
                $updatedSecret = Set-AzKeyVaultSecret @secretParams
                
                # Update dependent services
                if ($rotationConfig.ServiceUpdates.ContainsKey($secret.Name)) {
                    $serviceUpdates = @{
                        $secret.Name = @{
                            VaultName = $keyVaultName
                            NewValue = $newValue
                            Type = $rotationConfig.SecretTypes[$secret.Name]
                        }
                    }
                    
                    $rollbackPlan = @{
                        VaultName = $keyVaultName
                        OriginalSecret = $secret
                    }
                    
                    Update-ServiceConfigurations -serviceName $rotationConfig.ServiceUpdates[$secret.Name] `
                        -secretUpdates $serviceUpdates `
                        -rollbackPlan $rollbackPlan
                }
                
                $results.RotatedSecrets += $secret.Name
            }
            catch {
                Write-Warning "Failed to rotate secret $($secret.Name): $_"
                $results.FailedSecrets += $secret.Name
                $results.Errors += $_
            }
        }
        
        $results.EndTime = Get-Date
        $results.Duration = $results.EndTime - $results.StartTime
        
        # Generate rotation report
        $reportPath = Join-Path $env:TEMP "RotationReport_$(Get-Date -Format 'yyyyMMddHHmmss').json"
        $results | ConvertTo-Json -Depth 10 | Out-File $reportPath
        
        Write-Verbose "Secret rotation completed. Rotated: $($results.RotatedSecrets.Count), Failed: $($results.FailedSecrets.Count)"
        return $results
    }
    catch {
        Write-Error "Secret rotation process failed: $_"
        throw
    }
    finally {
        Stop-Transcript
    }
}

# Export the main function
Export-ModuleMember -Function Start-SecretRotation