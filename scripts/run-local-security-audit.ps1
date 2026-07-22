# ==============================================================================
# Script de Auditoria Local de Segurança (DevSecOps Local Audit)
# Executa verificações locais das ferramentas de segurança (SSDLC)
# ==============================================================================

Write-Host "================================================================" -ForegroundColor Cipher
Write-Host "      DevSecOps Local Audit Suite (Gitleaks, Semgrep, Trivy, Snyk)    " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cipher

$ProjectDir = Get-Location

# 1. VERIFICAÇÃO DE SECRET SCANNING (Gitleaks via Docker / npx)
Write-Host "`n[1/4] A executar Gitleaks (Deteção de Credenciais Expostas)..." -ForegroundColor Yellow
if (Get-Command "docker" -ErrorAction SilentlyContinue) {
    Write-Host "--> Executando Gitleaks via Docker..." -ForegroundColor Gray
    docker run --rm -v "${ProjectDir}:/path" zricethezav/gitleaks:latest detect --source="/path" --config="/path/.gitleaks.toml" --verbose
} else {
    Write-Host "--> Docker não detetado. Tentando via npx gitleaks..." -ForegroundColor Gray
    npx gitleaks detect --verbose
}

# 2. VERIFICAÇÃO SAST (Semgrep)
Write-Host "`n[2/4] A executar Semgrep (Análise Estática de Código SAST)..." -ForegroundColor Yellow
if (Get-Command "docker" -ErrorAction SilentlyContinue) {
    Write-Host "--> Executando Semgrep via Docker..." -ForegroundColor Gray
    docker run --rm -v "${ProjectDir}:/src" semgrep/semgrep semgrep scan --config auto --config /src/.semgrep.yml /src
} else {
    Write-Host "--> [INFO] Instale o Semgrep ou Docker para simulação local do SAST." -ForegroundColor Gray
}

# 3. VERIFICAÇÃO SCA (npm audit / Snyk)
Write-Host "`n[3/4] A executar Análise de Vulnerabilidades em Dependências (SCA)..." -ForegroundColor Yellow
Write-Host "--> Executando npm audit..." -ForegroundColor Gray
npm audit

if (Get-Command "npx" -ErrorAction SilentlyContinue) {
    Write-Host "--> Executando teste Snyk (SCA)..." -ForegroundColor Gray
    npx snyk test --severity-threshold=high
}

# 4. VARRIMENTO E HARDENING DE CONTAINER (Trivy)
Write-Host "`n[4/4] A executar Trivy Container & IaC Security..." -ForegroundColor Yellow
if (Get-Command "docker" -ErrorAction SilentlyContinue) {
    Write-Host "--> Construindo Imagem Docker Local 'devsecops-demo:local'..." -ForegroundColor Gray
    docker build -t devsecops-demo:local .

    Write-Host "--> Executando Varrimento de Imagem com Trivy..." -ForegroundColor Gray
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image --severity HIGH,CRITICAL devsecops-demo:local
} else {
    Write-Host "--> [INFO] Requer Docker para construir e verificar a imagem com Trivy." -ForegroundColor Gray
}

Write-Host "`n================================================================" -ForegroundColor Cipher
Write-Host "              Auditoria Local de Segurança Concluída!            " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cipher
