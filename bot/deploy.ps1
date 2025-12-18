# Deploy Script - Gurugammon Backend
# ====================================
# This script safely deploys the Gammon Backend to Fly.io

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GURUGAMMON BACKEND - Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Show current status
Write-Host "[1/4] Checking Fly.io status..." -ForegroundColor Yellow
flyctl status -a gurugammon-ai-bot

Write-Host ""
Write-Host "[2/4] Git status..." -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "  TARGET APP: gurugammon-ai-bot" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# 2. Confirm before deploying
$confirm = Read-Host "Deploy to gurugammon-ai-bot? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Deployment cancelled." -ForegroundColor Red
    exit
}

# 3. Git commit and push
Write-Host ""
Write-Host "[3/4] Pushing to Git..." -ForegroundColor Yellow
git add .
$commitMsg = Read-Host "Commit message"
git commit -m $commitMsg
git push

# 4. Deploy
Write-Host ""
Write-Host "[4/4] Deploying to Fly.io..." -ForegroundColor Green
flyctl deploy

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
