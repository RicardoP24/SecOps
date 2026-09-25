# ==============================================================================
# Auditoria Local de Segurança: os mesmos gates do pipeline, antes do push.
# Requer Docker (Gitleaks, Semgrep e Trivy correm em containers com versão fixa) e Node.js.
# ==============================================================================

$ErrorActionPreference = "Stop"
$ProjectDir = (Get-Location).Path
$Failed = @()

function Invoke-Gate([string]$Name, [scriptblock]$Command) {
    Write-Host "`n>>> $Name" -ForegroundColor Yellow
    & $Command
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    FALHOU: $Name" -ForegroundColor Red
        $script:Failed += $Name
    } else {
        Write-Host "    OK: $Name" -ForegroundColor Green
    }
}

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   Auditoria DevSecOps local (Gitleaks, Semgrep, npm audit, Trivy)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker não encontrado: é necessário para Gitleaks, Semgrep e Trivy."
}

Invoke-Gate "1. Secret scanning (Gitleaks, histórico completo)" {
    docker run --rm -v "${ProjectDir}:/repo" ghcr.io/gitleaks/gitleaks:v8.30.1 `
        git --no-banner --redact --config /repo/.gitleaks.toml /repo
}

Invoke-Gate "2. Testes unitários" {
    npm ci --ignore-scripts --no-fund --no-audit
    npm test
}

Invoke-Gate "3. SAST (Semgrep)" {
    docker run --rm -v "${ProjectDir}:/src" -w /src semgrep/semgrep:1.178.0 `
        semgrep scan --metrics=off --error --severity ERROR --severity WARNING `
        --config p/javascript --config p/nodejsscan --config p/owasp-top-ten `
        --config p/dockerfile --config p/github-actions --config .semgrep.yml
}

Invoke-Gate "4. SCA (npm audit, HIGH/CRITICAL)" {
    npm audit --omit=dev --audit-level=high
}

Invoke-Gate "5. Dockerfile (Trivy config)" {
    docker run --rm -v "${ProjectDir}:/src" aquasec/trivy:0.74.0 `
        config --severity HIGH,CRITICAL --exit-code 1 /src
}

Invoke-Gate "6. Imagem (Trivy, CVEs HIGH/CRITICAL com correção)" {
    docker build -t secops-app:local .
    if ($LASTEXITCODE -ne 0) { return }
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.74.0 `
        image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 secops-app:local
}

Write-Host "`n================================================================" -ForegroundColor Cyan
if ($Failed.Count -eq 0) {
    Write-Host "  Todos os gates passaram." -ForegroundColor Green
} else {
    Write-Host "  Gates com falhas: $($Failed -join ', ')" -ForegroundColor Red
    exit 1
}
