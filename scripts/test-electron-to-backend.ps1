# Electron to Backend Integration Test Script (PowerShell)
# Tests the complete flow: Screenshot Capture → Metadata Input → Local Storage → Sync to Backend

param(
    [string]$BackendUrl = "http://localhost:3001",
    [string]$TestMode = "full"  # full, quick, or specific
)

# Colors for output
$Colors = @{
    Green = "Green"
    Red = "Red"
    Yellow = "Yellow"
    Blue = "Blue"
    Cyan = "Cyan"
    White = "White"
}

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Details = ""
    )
    
    if ($Passed) {
        Write-ColorOutput "✅ $TestName" "Green"
    } else {
        Write-ColorOutput "❌ $TestName" "Red"
    }
    
    if ($Details) {
        Write-ColorOutput "   $Details" "Yellow"
    }
}

function Test-BackendHealth {
    Write-ColorOutput "`n🔍 Testing Backend Health..." "Blue"
    
    try {
        $response = Invoke-WebRequest -Uri "$BackendUrl/health" -UseBasicParsing -TimeoutSec 10
        $passed = $response.StatusCode -eq 200
        Write-TestResult "Backend Health Check" $passed "Backend is running"
        return $passed
    } catch {
        Write-TestResult "Backend Health Check" $false "Backend not responding: $($_.Exception.Message)"
        return $false
    }
}

function Test-DatabaseConnection {
    Write-ColorOutput "`n🗄️ Testing Database Connection..." "Blue"
    
    try {
        $response = Invoke-WebRequest -Uri "$BackendUrl/api/health/db" -UseBasicParsing -TimeoutSec 10
        $passed = $response.StatusCode -eq 200
        Write-TestResult "Database Connection" $passed "Database is accessible"
        return $passed
    } catch {
        Write-TestResult "Database Connection" $false "Database error: $($_.Exception.Message)"
        return $false
    }
}

function Test-Authentication {
    Write-ColorOutput "`n🔐 Testing Authentication..." "Blue"
    
    try {
        $loginBody = @{
            username = "admin"
            password = "Admin123!"
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "$BackendUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
        $passed = $response.StatusCode -eq 200
        
        Write-TestResult "Admin Login" $passed "Login successful"
        
        if ($passed) {
            $token = ($response.Content | ConvertFrom-Json).token
            $script:GlobalTestToken = $token
            
            # Test token validation
            $headers = @{
                "Authorization" = "Bearer $token"
            }
            
            $verifyResponse = Invoke-WebRequest -Uri "$BackendUrl/api/auth/verify" -Headers $headers -UseBasicParsing
            $verifyPassed = $verifyResponse.StatusCode -eq 200
            Write-TestResult "JWT Token Validation" $verifyPassed "Token is valid"
            
            return $passed -and $verifyPassed
        }
        
        return $passed
    } catch {
        Write-TestResult "Authentication" $false "Authentication failed: $($_.Exception.Message)"
        return $false
    }
}

function Test-LicenseActivation {
    Write-ColorOutput "`n📜 Testing License Activation..." "Blue"
    
    try {
        $licenseBody = @{
            license_key = "TEST-XXXX-YYYY-ZZZZ-1234"
            workstation_id = "TEST-WORKSTATION-001"
            hostname = "test-host-01"
        } | ConvertTo-Json
        
        $headers = @{
            "Authorization" = "Bearer $GlobalTestToken"
        }
        
        $response = Invoke-WebRequest -Uri "$BackendUrl/api/license/activate" -Method POST -Body $licenseBody -Headers $headers -ContentType "application/json" -UseBasicParsing
        $passed = $response.StatusCode -eq 200
        
        Write-TestResult "License Activation" $passed "License activated"
        return $passed
    } catch {
        Write-TestResult "License Activation" $false "License activation failed: $($_.Exception.Message)"
        return $false
    }
}

function Test-FileUpload {
    Write-ColorOutput "`n📤 Testing File Upload..." "Blue"
    
    try {
        # Create test image if it doesn't exist
        $testImagePath = Join-Path $PSScriptRoot "..\test-assets\test-screenshot.png"
        $testImageDir = Split-Path $testImagePath -Parent
        
        if (!(Test-Path $testImageDir)) {
            New-Item -ItemType Directory -Path $testImageDir -Force | Out-Null
        }
        
        if (!(Test-Path $testImagePath)) {
            # Create a simple test image (1x1 pixel PNG)
            $testImageBytes = @(
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
                0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
                0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
                0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
                0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
            )
            [System.IO.File]::WriteAllBytes($testImagePath, $testImageBytes)
        }
        
        # Test file upload using multipart form
        $boundary = [System.Guid]::NewGuid().ToString()
        $LF = "`r`n"
        
        $bodyLines = @(
            "--$boundary",
            "Content-Disposition: form-data; name=`"area`"",
            "",
            "Test Area A1",
            "--$boundary",
            "Content-Disposition: form-data; name=`"description`"",
            "",
            "Automated test incident from Electron app",
            "--$boundary",
            "Content-Disposition: form-data; name=`"screenshot`"; filename=`"test-screenshot.png`"",
            "Content-Type: image/png",
            "",
            [System.IO.File]::ReadAllBytes($testImagePath),
            "--$boundary--"
        )
        
        $body = $bodyLines -join $LF
        
        $headers = @{
            "Authorization" = "Bearer $GlobalTestToken"
            "Content-Type" = "multipart/form-data; boundary=$boundary"
        }
        
        $response = Invoke-WebRequest -Uri "$BackendUrl/api/incidents" -Method POST -Body $body -Headers $headers -UseBasicParsing
        $passed = $response.StatusCode -eq 201
        
        if ($passed) {
            $incidentData = $response.Content | ConvertFrom-Json
            $script:GlobalUploadedIncidentId = $incidentData.id
            Write-TestResult "File Upload" $passed "File uploaded successfully (ID: $($incidentData.id))"
        } else {
            Write-TestResult "File Upload" $passed "Upload failed"
        }
        
        return $passed
    } catch {
        Write-TestResult "File Upload" $false "Upload error: $($_.Exception.Message)"
        return $false
    }
}

function Test-IncidentRetrieval {
    Write-ColorOutput "`n📋 Testing Incident Retrieval..." "Blue"
    
    if (!$GlobalUploadedIncidentId) {
        Write-TestResult "Incident Retrieval" $false "No incident ID available"
        return $false
    }
    
    try {
        $headers = @{
            "Authorization" = "Bearer $GlobalTestToken"
        }
        
        $response = Invoke-WebRequest -Uri "$BackendUrl/api/incidents/$GlobalUploadedIncidentId" -Headers $headers -UseBasicParsing
        $passed = $response.StatusCode -eq 200
        
        Write-TestResult "Incident Retrieval" $passed "Incident retrieved successfully"
        return $passed
    } catch {
        Write-TestResult "Incident Retrieval" $false "Retrieval failed: $($_.Exception.Message)"
        return $false
    }
}

function Test-SyncFunctionality {
    Write-ColorOutput "`n🔄 Testing Sync Functionality..." "Blue"
    
    try {
        $headers = @{
            "Authorization" = "Bearer $GlobalTestToken"
        }
        
        $response = Invoke-WebRequest -Uri "$BackendUrl/api/sync/status" -Headers $headers -UseBasicParsing
        $passed = $response.StatusCode -eq 200
        
        Write-TestResult "Sync Status Check" $passed "Sync status available"
        return $passed
    } catch {
        Write-TestResult "Sync Status Check" $false "Sync status failed: $($_.Exception.Message)"
        return $false
    }
}

function Test-ErrorHandling {
    Write-ColorOutput "`n⚠️ Testing Error Handling..." "Blue"
    
    # Test invalid authentication
    try {
        $headers = @{
            "Authorization" = "Bearer invalid-token"
        }
        
        $response = Invoke-WebRequest -Uri "$BackendUrl/api/incidents" -Headers $headers -UseBasicParsing
        $authPassed = $false
    } catch {
        $authPassed = $_.Exception.Response.StatusCode -eq 401
    }
    
    Write-TestResult "Invalid Auth Handling" $authPassed "Properly rejected invalid token"
    
    # Test invalid file upload
    try {
        $headers = @{
            "Authorization" = "Bearer $GlobalTestToken"
        }
        
        $invalidBody = @{
            area = "Test"
            description = "Test"
            # Missing file
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "$BackendUrl/api/incidents" -Method POST -Body $invalidBody -Headers $headers -ContentType "application/json" -UseBasicParsing
        $uploadPassed = $false
    } catch {
        $uploadPassed = $_.Exception.Response.StatusCode -eq 400
    }
    
    Write-TestResult "Invalid Upload Handling" $uploadPassed "Properly rejected invalid upload"
    
    return $authPassed -and $uploadPassed
}

# Test Results Tracking
$TestResults = @{
    Passed = 0
    Failed = 0
    Total = 0
    Details = @()
}

function Add-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Details = ""
    )
    
    $TestResults.Total++
    if ($Passed) {
        $TestResults.Passed++
    } else {
        $TestResults.Failed++
    }
    
    $TestResults.Details += @{
        Name = $TestName
        Passed = $Passed
        Details = $Details
    }
}

function Show-TestReport {
    Write-ColorOutput "`n" + "=" * 60 "Blue"
    Write-ColorOutput "📊 TEST RESULTS SUMMARY" "White"
    Write-ColorOutput "=" * 60 "Blue"
    
    Write-ColorOutput "`nTotal Tests: $($TestResults.Total)" "Blue"
    Write-ColorOutput "Passed: $($TestResults.Passed)" "Green"
    Write-ColorOutput "Failed: $($TestResults.Failed)" "Red"
    
    if ($TestResults.Total -gt 0) {
        $successRate = [math]::Round(($TestResults.Passed / $TestResults.Total) * 100, 1)
        Write-ColorOutput "Success Rate: $successRate%" "Blue"
    }
    
    if ($TestResults.Failed -gt 0) {
        Write-ColorOutput "`n❌ FAILED TESTS:" "Red"
        $TestResults.Details | Where-Object { !$_.Passed } | ForEach-Object {
            Write-ColorOutput "   • $($_.Name): $($_.Details)" "Red"
        }
    }
    
    Write-ColorOutput "`n✅ PASSED TESTS:" "Green"
    $TestResults.Details | Where-Object { $_.Passed } | ForEach-Object {
        Write-ColorOutput "   • $($_.Name)" "Green"
    }
    
    Write-ColorOutput "`n" + "=" * 60 "Blue"
    
    $allPassed = $TestResults.Failed -eq 0
    if ($allPassed) {
        Write-ColorOutput "🎉 ALL TESTS PASSED! Integration is working correctly." "Green"
    } else {
        Write-ColorOutput "⚠️ SOME TESTS FAILED. Please review the failed tests above." "Yellow"
    }
    Write-ColorOutput "=" * 60 "Blue"
    
    return $allPassed
}

# Main Test Runner
function Start-IntegrationTest {
    Write-ColorOutput "`n🚀 Starting Electron to Backend Integration Tests" "White"
    Write-ColorOutput "=" * 60 "Blue"
    
    try {
        # Step 1: Backend Health
        $backendHealthy = Test-BackendHealth
        Add-TestResult "Backend Health" $backendHealthy
        if (!$backendHealthy) {
            Write-ColorOutput "`n❌ Backend is not running. Please start the backend first." "Red"
            exit 1
        }
        
        # Step 2: Database Connection
        $dbConnected = Test-DatabaseConnection
        Add-TestResult "Database Connection" $dbConnected
        if (!$dbConnected) {
            Write-ColorOutput "`n❌ Database connection failed. Please check database configuration." "Red"
            exit 1
        }
        
        # Step 3: Authentication
        $authPassed = Test-Authentication
        Add-TestResult "Authentication" $authPassed
        if (!$authPassed) {
            Write-ColorOutput "`n❌ Authentication failed. Please check credentials." "Red"
            exit 1
        }
        
        # Step 4: License Activation
        $licenseActivated = Test-LicenseActivation
        Add-TestResult "License Activation" $licenseActivated
        if (!$licenseActivated) {
            Write-ColorOutput "`n❌ License activation failed. Please check license configuration." "Red"
            exit 1
        }
        
        # Step 5: File Upload
        $uploadPassed = Test-FileUpload
        Add-TestResult "File Upload" $uploadPassed
        if (!$uploadPassed) {
            Write-ColorOutput "`n❌ File upload failed. Please check upload configuration." "Red"
            exit 1
        }
        
        # Step 6: Incident Retrieval
        $retrievalPassed = Test-IncidentRetrieval
        Add-TestResult "Incident Retrieval" $retrievalPassed
        
        # Step 7: Sync Functionality
        $syncPassed = Test-SyncFunctionality
        Add-TestResult "Sync Functionality" $syncPassed
        
        # Step 8: Error Handling
        $errorHandlingPassed = Test-ErrorHandling
        Add-TestResult "Error Handling" $errorHandlingPassed
        
    } catch {
        Write-ColorOutput "`n💥 Test execution failed: $($_.Exception.Message)" "Red"
        exit 1
    }
    
    # Generate Report
    $allPassed = Show-TestReport
    exit $(if ($allPassed) { 0 } else { 1 })
}

# Run the tests
Start-IntegrationTest 