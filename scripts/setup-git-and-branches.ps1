# ==============================================================================
# Script de Configuração de Repositório Git & Workflow Multi-Utilizador (DevSecOps Lab)
# Simula a colaboração de 2 Desenvolvedores (Alice e Bob) com ramos e validação no CI/CD
# ==============================================================================

Write-Host "================================================================" -ForegroundColor Cipher
Write-Host "       DevSecOps Multi-User Branch & CI/CD Setup Script        " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cipher

$ProjectDir = Get-Location

# 1. Inicializar Repositório Git se não existir
if (-not (Test-Path ".git")) {
    Write-Host "`n[1/4] Inicializando repositório Git local..." -ForegroundColor Yellow
    git init
    git branch -M main
} else {
    Write-Host "`n[1/4] Repositório Git já existente." -ForegroundColor Green
}

# 2. Configurar Commit Inicial na branch main
Write-Host "`n[2/4] A criar commit inicial na branch main..." -ForegroundColor Yellow
git add .
git commit -m "feat: inicializacao do projecto DevSecOps SSDLC com GitHub Actions" --author="DevSecOps Lead <admin@devsecops.org>"

# 3. Simular Utilizador 1 (Alice - Desenvolvedora Segura)
Write-Host "`n[3/4] A criar branch de funcionalidade para Utilizador 1 (Alice)..." -ForegroundColor Yellow
git checkout -b feature/alice-secure-auth

# Criar ficheiro com código seguro feito pela Alice
$AliceCode = @"
/**
 * Módulo de Autenticação Seguro criado pela Alice
 */
function validateUserSession(token) {
    if (!token || typeof token !== 'string') {
        throw new Error('Token invalido');
    }
    return { valid: true, userId: 'usr_12345' };
}

module.exports = { validateUserSession };
"@

Set-Content -Path "src/auth.js" -Value $AliceCode -Encoding UTF8

git add src/auth.js
git commit -m "feat(auth): adicionar modulo seguro de validacao de sessao" --author="Alice Dev <alice@devsecops.org>"
Write-Host "--> Branch 'feature/alice-secure-auth' criada e commit feito pela Alice (Passa na Pipeline!)." -ForegroundColor Green

# Voltar para a branch main
git checkout main

# 4. Simular Utilizador 2 (Bob - Desenvolvedor com Código Vulnerável)
Write-Host "`n[4/4] A criar branch de funcionalidade para Utilizador 2 (Bob)..." -ForegroundColor Yellow
git checkout -b feature/bob-insecure-feature

# Criar ficheiro com código inseguro/credencial exposta feito pelo Bob para testar a pipeline
$BobCode = @"
/**
 * Módulo com Vulnerabilidade e Credencial Exposta feito pelo Bob
 */
const AWS_SECRET_KEY = "AKIAIOSFODNN7EXAMPLE_SECRET_KEY"; // Gitleaks irá detetar!

function processData(userInput) {
    // Semgrep irá detetar uso perigoso de eval!
    return eval(userInput); 
}

module.exports = { processData };
"@

Set-Content -Path "src/legacy-processor.js" -Value $BobCode -Encoding UTF8

git add src/legacy-processor.js
git commit -m "feat(legacy): adicionar processador legado com vulnerabilidade" --author="Bob Dev <bob@devsecops.org>"
Write-Host "--> Branch 'feature/bob-insecure-feature' criada e commit feito pelo Bob (Falha na Pipeline!)." -ForegroundColor Red

# Voltar para main
git checkout main

Write-Host "`n================================================================" -ForegroundColor Cipher
Write-Host "                   Configuração Concluída!                      " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cipher
Write-Host "`nResumo de Branches Locais Criadas:" -ForegroundColor Yellow
Write-Host " 1. main                      (Código Base Limpo)" -ForegroundColor White
Write-Host " 2. feature/alice-secure-auth (Passará nos Security Quality Gates)" -ForegroundColor Green
Write-Host " 3. feature/bob-insecure-feature (Falhará no Gitleaks e Semgrep)" -ForegroundColor Red
Write-Host "`nPróximo Passo: Conecte o repositório ao seu GitHub para ver a pipeline em ação!" -ForegroundColor Cyan
