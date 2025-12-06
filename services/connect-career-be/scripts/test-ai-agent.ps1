# AI Agent API Test Script
# Usage: .\test-ai-agent.ps1 -JwtToken "your_jwt_token_here"

param(
    [Parameter(Mandatory=$true)]
    [string]$JwtToken,
    
    [string]$BaseUrl = "http://localhost:8080/api/v1/ai-agent"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "AI Agent API Test Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $JwtToken"
}

# ============================================
# 1. Create Chat Session
# ============================================
Write-Host "1. Creating chat session..." -ForegroundColor Yellow
try {
    $createResponse = Invoke-RestMethod -Uri "$BaseUrl/chats" `
        -Method Post `
        -Headers $headers
    
    $sessionId = $createResponse.sessionId
    Write-Host "[OK] Session created: $sessionId" -ForegroundColor Green
    Write-Host "Response: $($createResponse | ConvertTo-Json)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "[FAIL] Failed to create session: $_" -ForegroundColor Red
    exit 1
}

# ============================================
# 2. Send Chat Message
# ============================================
Write-Host "2. Sending chat message..." -ForegroundColor Yellow
try {
    $messageBody = @{
        message = "Hello, I am looking for a software engineer job in San Francisco"
        metadata = @{
            source = "web"
            device = "desktop"
        }
    } | ConvertTo-Json

    $messageResponse = Invoke-RestMethod -Uri "$BaseUrl/chats/$sessionId/messages" `
        -Method Post `
        -Headers $headers `
        -Body $messageBody
    
    Write-Host "[OK] Message sent successfully" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($messageResponse | ConvertTo-Json -Depth 5) -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "[FAIL] Failed to send message: $_" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# ============================================
# 3. Get Suggestions
# ============================================
Write-Host "3. Getting suggestions..." -ForegroundColor Yellow
try {
    $suggestions = Invoke-RestMethod -Uri "$BaseUrl/chats/$sessionId/suggestions" `
        -Method Get `
        -Headers $headers
    
    Write-Host "[OK] Suggestions retrieved" -ForegroundColor Green
    Write-Host "Suggestions:" -ForegroundColor Cyan
    Write-Host ($suggestions | ConvertTo-Json -Depth 3) -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "[FAIL] Failed to get suggestions: $_" -ForegroundColor Red
    Write-Host ""
}

# ============================================
# 4. Execute Job Discovery Agent
# ============================================
Write-Host "4. Executing JobDiscoveryAgent..." -ForegroundColor Yellow
try {
    $executeBody = @{
        agentName = "JobDiscoveryAgent"
        task = "Find software engineer jobs in San Francisco with salary above 100k"
        userId = "test-user-123"
        intent = "job_search"
        entities = @{
            jobTitle = "software engineer"
            location = "San Francisco"
            minSalary = 100000
        }
        metadata = @{
            priority = "high"
        }
    } | ConvertTo-Json

    $executeResponse = Invoke-RestMethod -Uri "$BaseUrl/chats/$sessionId/execute" `
        -Method Post `
        -Headers $headers `
        -Body $executeBody
    
    Write-Host "[OK] JobDiscoveryAgent executed" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($executeResponse | ConvertTo-Json -Depth 5) -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "[FAIL] Failed to execute JobDiscoveryAgent: $_" -ForegroundColor Red
    Write-Host ""
}

# ============================================
# 5. Execute FAQ Agent
# ============================================
Write-Host "5. Executing FaqAgent..." -ForegroundColor Yellow
try {
    $executeBody = @{
        agentName = "FaqAgent"
        task = "How do I update my profile?"
        userId = "test-user-123"
        intent = "faq"
    } | ConvertTo-Json

    $executeResponse = Invoke-RestMethod -Uri "$BaseUrl/chats/$sessionId/execute" `
        -Method Post `
        -Headers $headers `
        -Body $executeBody
    
    Write-Host "[OK] FaqAgent executed" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($executeResponse | ConvertTo-Json -Depth 5) -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "[FAIL] Failed to execute FaqAgent: $_" -ForegroundColor Red
    Write-Host ""
}

# ============================================
# 6. Execute Comparison Agent
# ============================================
Write-Host "6. Executing ComparisonAgent..." -ForegroundColor Yellow
try {
    $executeBody = @{
        agentName = "ComparisonAgent"
        task = "Compare job offers: Google vs Microsoft for software engineer position"
        userId = "test-user-123"
        intent = "comparison"
        entities = @{
            companies = @("Google", "Microsoft")
            position = "software engineer"
        }
    } | ConvertTo-Json

    $executeResponse = Invoke-RestMethod -Uri "$BaseUrl/chats/$sessionId/execute" `
        -Method Post `
        -Headers $headers `
        -Body $executeBody
    
    Write-Host "[OK] ComparisonAgent executed" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($executeResponse | ConvertTo-Json -Depth 5) -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "[FAIL] Failed to execute ComparisonAgent: $_" -ForegroundColor Red
    Write-Host ""
}

# ============================================
# 7. Execute Matching Agent
# ============================================
Write-Host "7. Executing MatchingAgent..." -ForegroundColor Yellow
try {
    $executeBody = @{
        agentName = "MatchingAgent"
        task = "Match my profile with available jobs"
        userId = "test-user-123"
        intent = "job_matching"
        entities = @{
            skills = @("JavaScript", "TypeScript", "React")
            experience = 5
            location = "San Francisco"
        }
    } | ConvertTo-Json

    $executeResponse = Invoke-RestMethod -Uri "$BaseUrl/chats/$sessionId/execute" `
        -Method Post `
        -Headers $headers `
        -Body $executeBody
    
    Write-Host "[OK] MatchingAgent executed" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($executeResponse | ConvertTo-Json -Depth 5) -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "[FAIL] Failed to execute MatchingAgent: $_" -ForegroundColor Red
    Write-Host ""
}

# ============================================
# 8. Execute Analysis Agent
# ============================================
Write-Host "8. Executing AnalysisAgent..." -ForegroundColor Yellow
try {
    $executeBody = @{
        agentName = "AnalysisAgent"
        task = "Analyze my CV and provide feedback"
        userId = "test-user-123"
        intent = "cv_analysis"
        entities = @{
            analysisType = "cv"
        }
    } | ConvertTo-Json

    $executeResponse = Invoke-RestMethod -Uri "$BaseUrl/chats/$sessionId/execute" `
        -Method Post `
        -Headers $headers `
        -Body $executeBody
    
    Write-Host "[OK] AnalysisAgent executed" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($executeResponse | ConvertTo-Json -Depth 5) -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "[FAIL] Failed to execute AnalysisAgent: $_" -ForegroundColor Red
    Write-Host ""
}

# ============================================
# 9. Upload Media (Image)
# ============================================
Write-Host "9. Uploading media (image)..." -ForegroundColor Yellow
try {
    $base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    
    $mediaBody = @{
        content = $base64Image
        type = "image"
        fileName = "test-image.png"
        metadata = @{
            purpose = "profile_picture"
        }
    } | ConvertTo-Json

    $mediaResponse = Invoke-RestMethod -Uri "$BaseUrl/chats/$sessionId/media" `
        -Method Post `
        -Headers $headers `
        -Body $mediaBody
    
    Write-Host "[OK] Media uploaded" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host ($mediaResponse | ConvertTo-Json -Depth 3) -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "[FAIL] Failed to upload media: $_" -ForegroundColor Red
    Write-Host ""
}

# ============================================
# Summary
# ============================================
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Session ID: $sessionId" -ForegroundColor Green
Write-Host "All tests completed!" -ForegroundColor Green
Write-Host ""