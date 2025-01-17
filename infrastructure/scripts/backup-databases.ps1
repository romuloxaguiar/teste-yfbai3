#Requires -Version 7.0
#Requires -Modules @{ModuleName='Az.Accounts';ModuleVersion='2.12.1'},@{ModuleName='Az.Sql';ModuleVersion='3.12.1'},@{ModuleName='Az.Storage';ModuleVersion='5.4.0'},@{ModuleName='Az.Monitor';ModuleVersion='3.0.0'}

<#
.SYNOPSIS
    Automated Azure SQL database backup script with comprehensive backup strategy and monitoring.
.DESCRIPTION
    Implements a robust backup solution for Azure SQL databases with:
    - Full backups (daily)
    - Differential backups (6-hour intervals)
    - Transaction log backups (15-minute intervals)
    - Backup verification and monitoring
    - Retention management
#>

# Script constants
$script:BACKUP_CONTAINER = "database-backups"
$script:RETENTION_DAYS = 90
$script:LOG_FILE = "./backup-logs.txt"
$script:MAX_RETRY_ATTEMPTS = 3
$script:RETRY_DELAY_SECONDS = 30
$script:BACKUP_VERIFICATION_ENABLED = $true

# Initialize logging
function Write-BackupLog {
    param(
        [string]$Message,
        [ValidateSet('Information', 'Warning', 'Error')]
        [string]$LogLevel = 'Information',
        [bool]$SendToAzureMonitor = $true
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$LogLevel] $Message"
    
    # Write to local log file
    Add-Content -Path $script:LOG_FILE -Value $logMessage

    # Write to console with appropriate color
    switch ($LogLevel) {
        'Warning' { Write-Host $logMessage -ForegroundColor Yellow }
        'Error' { Write-Host $logMessage -ForegroundColor Red }
        default { Write-Host $logMessage }
    }

    # Send to Azure Monitor if enabled
    if ($SendToAzureMonitor) {
        $customMetric = @{
            TimeGenerated = $timestamp
            Level = $LogLevel
            Message = $Message
            Operation = "DatabaseBackup"
        }
        
        Write-AzMetric -ResourceId $env:BACKUP_RESOURCE_ID -MetricName "BackupOperation" -Value 1 -CustomProperties $customMetric
    }
}

function Start-FullBackup {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServerName,
        [Parameter(Mandatory=$true)]
        [string]$DatabaseName,
        [Parameter(Mandatory=$true)]
        [string]$StorageAccount,
        [bool]$VerifyBackup = $true
    )

    try {
        Write-BackupLog "Starting full backup for database: $DatabaseName"

        # Generate unique backup file name
        $timestamp = Get-Date -Format "yyyyMMddHHmmss"
        $backupFile = "FULL_${DatabaseName}_${timestamp}.bak"
        $backupUrl = "https://$StorageAccount.blob.core.windows.net/$script:BACKUP_CONTAINER/$backupFile"

        # Start backup operation with retry logic
        $attempt = 1
        $success = $false

        while (-not $success -and $attempt -le $script:MAX_RETRY_ATTEMPTS) {
            try {
                $backupOperation = Backup-AzSqlDatabase `
                    -ServerName $ServerName `
                    -DatabaseName $DatabaseName `
                    -StorageUri $backupUrl `
                    -StorageKeyType StorageAccessKey `
                    -StorageKey (Get-AzStorageAccountKey -ResourceGroupName $env:RESOURCE_GROUP -Name $StorageAccount).Value[0]

                # Monitor backup progress
                while ($backupOperation.Status -eq "InProgress") {
                    Write-BackupLog "Backup in progress... Current progress: $($backupOperation.PercentComplete)%"
                    Start-Sleep -Seconds 30
                    $backupOperation = Get-AzSqlDatabaseBackup -ServerName $ServerName -DatabaseName $DatabaseName -BackupName $backupOperation.BackupName
                }

                if ($backupOperation.Status -eq "Succeeded") {
                    $success = $true
                    Write-BackupLog "Full backup completed successfully"

                    # Verify backup if enabled
                    if ($VerifyBackup) {
                        Write-BackupLog "Starting backup verification"
                        $verificationResult = Test-AzSqlDatabaseBackup -ServerName $ServerName -DatabaseName $DatabaseName -BackupName $backupOperation.BackupName
                        
                        if ($verificationResult.IsValid) {
                            Write-BackupLog "Backup verification successful"
                        } else {
                            throw "Backup verification failed: $($verificationResult.ErrorMessage)"
                        }
                    }
                } else {
                    throw "Backup failed with status: $($backupOperation.Status)"
                }
            }
            catch {
                if ($attempt -lt $script:MAX_RETRY_ATTEMPTS) {
                    Write-BackupLog "Backup attempt $attempt failed. Retrying in $script:RETRY_DELAY_SECONDS seconds..." -LogLevel Warning
                    Start-Sleep -Seconds $script:RETRY_DELAY_SECONDS
                    $attempt++
                } else {
                    throw
                }
            }
        }

        return $success
    }
    catch {
        Write-BackupLog "Error during full backup: $_" -LogLevel Error
        throw
    }
}

function Start-DifferentialBackup {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServerName,
        [Parameter(Mandatory=$true)]
        [string]$DatabaseName,
        [Parameter(Mandatory=$true)]
        [string]$StorageAccount,
        [bool]$ValidateFullBackup = $true
    )

    try {
        Write-BackupLog "Starting differential backup for database: $DatabaseName"

        # Validate last full backup if required
        if ($ValidateFullBackup) {
            $lastFullBackup = Get-AzSqlDatabaseBackup -ServerName $ServerName -DatabaseName $DatabaseName -BackupType Full | 
                Sort-Object -Property StartTime -Descending | Select-Object -First 1

            if (-not $lastFullBackup -or $lastFullBackup.StartTime -lt (Get-Date).AddDays(-1)) {
                throw "No valid full backup found within last 24 hours"
            }
        }

        # Generate backup file name
        $timestamp = Get-Date -Format "yyyyMMddHHmmss"
        $backupFile = "DIFF_${DatabaseName}_${timestamp}.bak"
        $backupUrl = "https://$StorageAccount.blob.core.windows.net/$script:BACKUP_CONTAINER/$backupFile"

        # Execute differential backup
        $backupOperation = Backup-AzSqlDatabase `
            -ServerName $ServerName `
            -DatabaseName $DatabaseName `
            -StorageUri $backupUrl `
            -StorageKeyType StorageAccessKey `
            -StorageKey (Get-AzStorageAccountKey -ResourceGroupName $env:RESOURCE_GROUP -Name $StorageAccount).Value[0] `
            -BackupType Differential

        # Monitor backup progress
        while ($backupOperation.Status -eq "InProgress") {
            Write-BackupLog "Differential backup in progress... Current progress: $($backupOperation.PercentComplete)%"
            Start-Sleep -Seconds 15
            $backupOperation = Get-AzSqlDatabaseBackup -ServerName $ServerName -DatabaseName $DatabaseName -BackupName $backupOperation.BackupName
        }

        if ($backupOperation.Status -eq "Succeeded") {
            Write-BackupLog "Differential backup completed successfully"
            return $true
        } else {
            throw "Differential backup failed with status: $($backupOperation.Status)"
        }
    }
    catch {
        Write-BackupLog "Error during differential backup: $_" -LogLevel Error
        throw
    }
}

function Start-LogBackup {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServerName,
        [Parameter(Mandatory=$true)]
        [string]$DatabaseName,
        [Parameter(Mandatory=$true)]
        [string]$StorageAccount,
        [int]$BatchSize = 1000
    )

    try {
        Write-BackupLog "Starting transaction log backup for database: $DatabaseName"

        # Generate backup file name
        $timestamp = Get-Date -Format "yyyyMMddHHmmss"
        $backupFile = "LOG_${DatabaseName}_${timestamp}.trn"
        $backupUrl = "https://$StorageAccount.blob.core.windows.net/$script:BACKUP_CONTAINER/$backupFile"

        # Execute log backup
        $backupOperation = Backup-AzSqlDatabase `
            -ServerName $ServerName `
            -DatabaseName $DatabaseName `
            -StorageUri $backupUrl `
            -StorageKeyType StorageAccessKey `
            -StorageKey (Get-AzStorageAccountKey -ResourceGroupName $env:RESOURCE_GROUP -Name $StorageAccount).Value[0] `
            -BackupType Log

        # Monitor backup progress
        while ($backupOperation.Status -eq "InProgress") {
            Write-BackupLog "Log backup in progress... Current progress: $($backupOperation.PercentComplete)%"
            Start-Sleep -Seconds 5
            $backupOperation = Get-AzSqlDatabaseBackup -ServerName $ServerName -DatabaseName $DatabaseName -BackupName $backupOperation.BackupName
        }

        if ($backupOperation.Status -eq "Succeeded") {
            Write-BackupLog "Transaction log backup completed successfully"
            return $true
        } else {
            throw "Transaction log backup failed with status: $($backupOperation.Status)"
        }
    }
    catch {
        Write-BackupLog "Error during transaction log backup: $_" -LogLevel Error
        throw
    }
}

function Remove-OldBackups {
    param(
        [Parameter(Mandatory=$true)]
        [string]$StorageAccount,
        [int]$RetentionDays = $script:RETENTION_DAYS,
        [bool]$UseSoftDelete = $true
    )

    try {
        Write-BackupLog "Starting cleanup of old backups"

        # Calculate retention threshold
        $retentionThreshold = (Get-Date).AddDays(-$RetentionDays)

        # Get storage context
        $storageContext = New-AzStorageContext `
            -StorageAccountName $StorageAccount `
            -StorageAccountKey (Get-AzStorageAccountKey -ResourceGroupName $env:RESOURCE_GROUP -Name $StorageAccount).Value[0]

        # Get all blobs in backup container
        $blobs = Get-AzStorageBlob -Container $script:BACKUP_CONTAINER -Context $storageContext

        # Filter and delete old backups
        $deletedCount = 0
        foreach ($blob in $blobs) {
            if ($blob.LastModified -lt $retentionThreshold) {
                if ($UseSoftDelete) {
                    # Move to archive tier first
                    Set-AzStorageBlobTier -Container $script:BACKUP_CONTAINER -Blob $blob.Name -Tier Archive -Context $storageContext
                }
                
                Remove-AzStorageBlob -Container $script:BACKUP_CONTAINER -Blob $blob.Name -Context $storageContext -Force
                $deletedCount++
            }
        }

        Write-BackupLog "Cleanup completed. Removed $deletedCount old backup files"
    }
    catch {
        Write-BackupLog "Error during backup cleanup: $_" -LogLevel Error
        throw
    }
}

# Main backup orchestration
function Start-DatabaseBackup {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServerName,
        [Parameter(Mandatory=$true)]
        [string]$DatabaseName,
        [Parameter(Mandatory=$true)]
        [string]$StorageAccount,
        [ValidateSet('Full', 'Differential', 'Log')]
        [string]$BackupType = 'Full'
    )

    try {
        # Validate parameters
        if (-not $ServerName -or -not $DatabaseName -or -not $StorageAccount) {
            throw "Required parameters missing"
        }

        # Execute backup based on type
        switch ($BackupType) {
            'Full' {
                $result = Start-FullBackup -ServerName $ServerName -DatabaseName $DatabaseName -StorageAccount $StorageAccount -VerifyBackup $script:BACKUP_VERIFICATION_ENABLED
            }
            'Differential' {
                $result = Start-DifferentialBackup -ServerName $ServerName -DatabaseName $DatabaseName -StorageAccount $StorageAccount -ValidateFullBackup $true
            }
            'Log' {
                $result = Start-LogBackup -ServerName $ServerName -DatabaseName $DatabaseName -StorageAccount $StorageAccount
            }
        }

        # Cleanup old backups if this was a full backup
        if ($BackupType -eq 'Full') {
            Remove-OldBackups -StorageAccount $StorageAccount
        }

        return $result
    }
    catch {
        Write-BackupLog "Critical error in backup operation: $_" -LogLevel Error
        throw
    }
}

# Export functions
Export-ModuleMember -Function Start-DatabaseBackup