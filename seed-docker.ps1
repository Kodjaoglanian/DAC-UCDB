# Script PowerShell para popular dados no MongoDB via Docker

Write-Host "Aguardando backend iniciar..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Populando dados no MongoDB..." -ForegroundColor Yellow
docker exec -it dac-backend python scripts/seed.py

Write-Host "Seed concluido!" -ForegroundColor Green
