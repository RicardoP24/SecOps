# Guia Completo de Troubleshooting DevSecOps & GitHub Actions

Este documento compila todos os problemas, erros reais de pipeline e soluções técnicas encontradas durante a construção e teste da pipeline **DevSecOps SSDLC**.

---

## 📋 Índice de Problemas e Soluções

1. [Gitleaks: Erro de Revisão Desconhecida no Commit Inicial](#1-gitleaks-erro-de-revisão-desconhecida-no-commit-inicial)
2. [GitHub Push Protection: Bloqueio do Git Push por Credencial Exposta](#2-github-push-protection-bloqueio-do-git-push-por-credencial-exposta)
3. [Imutabilidade do Git e Histórico Bloqueado após Alteração de Código](#3-imutabilidade-do-git-e-histórico-bloqueado-após-alteração-de-código)
4. [Gitleaks: Falsos Positivos em Ficheiros de Interface Web (UI Mocks)](#4-gitleaks-falsos-positivos-em-ficheiros-de-interface-web-ui-mocks)
5. [GitHub Actions: Erro de Sintaxe YAML `Unrecognized named-value: 'secrets'`](#5-github-actions-erro-de-sintaxe-yaml-unrecognized-named-value-secrets)
6. [Trivy: Erro `Path does not exist: trivy-image-results.sarif`](#6-trivy-erro-path-does-not-exist-trivy-image-results-sarif)
7. [Deprecation Warning: Upgrade do `codeql-action/upload-sarif` de `@v3` para `@v4`](#7-deprecation-warning-upgrade-do-codeql-actionupload-sarif-de-v3-para-v4)
8. [Git: Erro `(non-fast-forward)` no Push de Branch de Teste](#8-git-erro-non-fast-forward-no-push-de-branch-de-teste)

---

## 1. Gitleaks: Erro de Revisão Desconhecida no Commit Inicial

### 🔴 Sintoma / Log de Erro:
```text
6:04PM ERR [git] fatal: ambiguous argument '94c887...^..b32fdb...': unknown revision or path not in the working tree.
6:04PM ERR failed to scan Git repository error="stderr is not empty"
```

### 🔍 Causa Raiz:
A ação padrão `gitleaks-action@v2` executa por omissão `git log commit^..commit`. Num **commit inicial ou repositório recém-criado**, a referência `commit^` (commit anterior) **não existe**, o que faz o Git retornar um erro fatal.

### 🛠️ Solução Aplicada:
Substituição da action pelo download direto do binário oficial do Gitleaks e execução apontando para a árvore de ficheiros:
```bash
wget -q https://github.com/gitleaks/gitleaks/releases/download/v8.24.3/gitleaks_8.24.3_linux_x64.tar.gz
tar -xzf gitleaks_8.24.3_linux_x64.tar.gz
./gitleaks detect --source=. --config=.gitleaks.toml --verbose --redact --report-format=sarif --report-path=gitleaks-results.sarif
```

---

## 2. GitHub Push Protection: Bloqueio do Git Push por Credencial Exposta

### 🔴 Sintoma / Log de Erro:
```text
remote: error: GH013: Repository rule violations found for refs/heads/test.
remote: - GITHUB PUSH PROTECTION
remote:     - Push cannot contain secrets
remote:       —— Stripe API Key ————————————————————————————————————
```

### 🔍 Causa Raiz:
O **GitHub Push Protection** inspeciona todos os commits em tempo real antes de aceitar a atualização no repositório remoto. Ao detetar um padrão de chave real (ex: `sk_live_...` ou `AKIA...`), o GitHub recusa a operação antes do código chegar ao repositório.

### 🛠️ Solução Aplicada:
Substituir credenciais reais por chaves simuladas marcadas com o prefixo `MOCK_` (ex: `MOCK_SECRET_API_KEY_TOKEN_VAL_1234567890`) para testes de laboratório.

---

## 3. Imutabilidade do Git e Histórico Bloqueado após Alteração de Código

### 🔴 Sintoma:
Mesmo corrigindo o ficheiro `vulnerable.php` para um valor seguro, o `git push` continuava a ser rejeitado pelo GitHub.

### 🔍 Causa Raiz:
O Git funciona através de uma árvore de commits imutável. Criar um novo commit não apaga o commit anterior do histórico local, que continuava a conter a chave vulnerável.

### 🛠️ Solução Aplicada:
Reescrever o histórico local da branch movendo o ponteiro de volta para a `main` e criando um commit único limpo:
```powershell
git reset --soft main
git add src/vulnerable.php Dockerfile .semgrep.yml
git commit -m "test: adicionar codigo PHP vulneravel e Dockerfile inseguro"
git push -u origin test
```

---

## 4. Gitleaks: Falsos Positivos em Ficheiros de Interface Web (UI Mocks)

### 🔴 Sintoma / Log de Erro:
```text
Finding:     const AWS_REDACTED = "AKIAIOSFODNN7EXAMPLE"
RuleID:      generic-api-key-strict
File:        index.html
Line:        259
Error: Process completed with exit code 1.
```

### 🔍 Causa Raiz:
O Gitleaks varreu os ficheiros de demonstração da interface gráfica (`index.html`, `app.js`, `src/server.js`) que continham exemplos didáticos de chaves de demonstração.

### 🛠️ Solução Aplicada:
Atualização do ficheiro [.gitleaks.toml](file:///c:/Users/isr-rsilva.ISRETAIL/ci-cd-sec/.gitleaks.toml) incluindo ficheiros de UI na `paths` allowlist e adicionando padronizações de demonstração em `regexes`:
```toml
[allowlist]
paths = [
  '''gitleaks\.toml''',
  '''README\.md''',
  '''docs/.*''',
  '''scripts/.*''',
  '''app\.js''',
  '''index\.html''',
  '''src/server\.js'''
]
regexes = [
  '''AKIAIOSFODNN7EXAMPLE''',
  '''MOCK_.*'''
]
```

---

## 5. GitHub Actions: Erro de Sintaxe YAML `Unrecognized named-value: 'secrets'`

### 🔴 Sintoma / Log de Erro:
```text
Invalid workflow file: .github/workflows/devsecops-pipeline.yml#L1
(Line: 76, Col: 13): Unrecognized named-value: 'secrets'. Located at position 1 within expression: secrets.SONAR_TOKEN != ''
```

### 🔍 Causa Raiz:
O motor de validação de workflows do GitHub Actions proíbe o acesso direto ao contexto `secrets` nas condições `if:` dos passos individuais por razões de segurança.

### 🛠️ Solução Aplicada:
Mapeamento dos segredos para o contexto de variáveis de ambiente `env:` ao nível do **Job**, e avaliação da condição através do contexto `env`:
```yaml
jobs:
  sast-sonarqube:
    runs-on: ubuntu-latest
    env:
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    steps:
      - name: Executar SonarQube Scanner
        if: ${{ env.SONAR_TOKEN != '' }}
        uses: SonarSource/sonarqube-scan-action@v2.0.2
```

---

## 6. Trivy: Erro `Path does not exist: trivy-image-results.sarif`

### 🔴 Sintoma / Log de Erro:
```text
Run github/codeql-action/upload-sarif@v3
Error: Path does not exist: trivy-image-results.sarif
```

### 🔍 Causa Raiz:
No job `container-security`, o primeiro passo (`scan-type: 'config'`) estava configurado com `exit-code: '1'`. Ao encontrar falhas de hardening no `Dockerfile`, o passo abortou a execução do job **antes** do `docker build` e da geração do ficheiro `trivy-image-results.sarif`. O passo de upload com `if: always()` tentou enviar um ficheiro que nunca chegou a ser criado.

### 🛠️ Solução Aplicada:
1. Definir `exit-code: '0'` no scan de configuração (para exibir os avisos de IaC no log sem cancelar o job prematuramente).
2. Manter `exit-code: '1'` no passo de varrimento final da imagem Docker compilada.
3. Adicionar a verificação `hashFiles('trivy-image-results.sarif') != ''` na condição de upload:
```yaml
      - name: Varrimento Trivy no Sistema de Ficheiros e Dockerfile (IaC Config Scan)
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          exit-code: '0'

      - name: Build da Imagem Docker Local
        run: docker build -t devsecops-app:${{ github.sha }} .

      - name: Varrimento Trivy na Imagem Docker Gerada (CVE Check)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'devsecops-app:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-image-results.sarif'
          exit-code: '1'

      - name: Upload de Relatório Trivy para o GitHub Security
        uses: github/codeql-action/upload-sarif@v4
        if: always() && hashFiles('trivy-image-results.sarif') != ''
        with:
          sarif_file: trivy-image-results.sarif
```

---

## 7. Deprecation Warning: Upgrade do `codeql-action/upload-sarif` de `@v3` para `@v4`

### 🔴 Sintoma / Log de Aviso:
```text
Warning: CodeQL Action v3 will be deprecated in December 2026. Please update all occurrences of the CodeQL Action in your workflow files to v4.
```

### 🔍 Causa Raiz:
A v3 do CodeQL Action entrou em ciclo de descontinuação pelo GitHub.

### 🛠️ Solução Aplicada:
Atualização de todas as referências no workflow de `github/codeql-action/upload-sarif@v3` para `github/codeql-action/upload-sarif@v4`.

---

## 8. Git: Erro `(non-fast-forward)` no Push de Branch de Teste

### 🔴 Sintoma / Log de Erro:
```text
To https://github.com/RicardoP24/SecOps.git
 ! [rejected]        test -> test (non-fast-forward)
error: failed to push some refs to 'https://github.com/RicardoP24/SecOps.git'
hint: Updates were rejected because the tip of your current branch is behind its remote counterpart.
```

### 🔍 Causa Raiz:
Ocorreu após a execução de um `git reset --soft` local. Como o histórico da branch local foi reescrito, ele divergiu da branch remota existente no GitHub.

### 🛠️ Solução Aplicada:
Forçar a atualização da branch de testes remota com a flag `--force`:
```powershell
git push -u origin test --force
```
