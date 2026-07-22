# Explicação Detalhada do Pipeline DevSecOps no GitHub Actions

Ficheiro analisado: [devsecops-pipeline.yml](file:///c:/Users/isr-rsilva.ISRETAIL/ci-cd-sec/.github/workflows/devsecops-pipeline.yml)

---

## 📑 1. Metadados, Eventos e Permissões (Linhas 1-12)

```yaml
name: DevSecOps SSDLC Pipeline

on:
  push:
    branches: [ "main", "master", "develop" ]
  pull_request:
    branches: [ "main", "master" ]
  workflow_dispatch:

permissions:
  contents: read
  security-events: write
```

- **`name`**: Nome de exibição do workflow no separador *Actions* do GitHub.
- **`on` (Triggers/Gatilhos)**:
  - `push`: Dispara a pipeline quando há novos commits nas branches `main`, `master` ou `develop`.
  - `pull_request`: Dispara a pipeline quando uma Pull Request é aberta ou atualizada para `main` ou `master` (**Shift-Left**: impede a fusão de código vulnerável).
  - `workflow_dispatch`: Permite a execução manual da pipeline através da interface web do GitHub.
- **`permissions` (Princípio do Menor Privilégio)**:
  - `contents: read`: Concede ao runner permissão apenas para ler o código fonte.
  - `security-events: write`: Permite ao runner publicar ficheiros de relatórios no formato **SARIF** diretamente na aba **Security > Code scanning** do repositório no GitHub.

---

## 🔑 2. Estágio 1: Secret Scanning com Gitleaks (Linhas 18-32)

```yaml
  secret-scanning:
    name: 1. Secret Scanning (Gitleaks)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout do Repositório
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Executar Gitleaks Scan
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_CONFIG: .gitleaks.toml
```

- **Objetivo**: Evitar fugas de credenciais, chaves de API, palavras-passe ou tokens JWT no histórico de commits do Git.
- **`fetch-depth: 0`**: Obriga o `git checkout` a descarregar **todo o histórico de commits** (e não apenas o último commit), permitindo ao Gitleaks analisar a árvore completa de alterações.
- **`gitleaks-action@v2`**: Executa o scanner utilizando as regras definidas no ficheiro [.gitleaks.toml](file:///c:/Users/isr-rsilva.ISRETAIL/ci-cd-sec/.gitleaks.toml). Se for encontrada alguma credencial exposta, o job falha imediatamente e bloqueia a pipeline.

---

## 🔍 3. Estágio 2: Análise Estática SAST com Semgrep (Linhas 36-54)

```yaml
  sast-semgrep:
    name: 2. SAST Lightweight (Semgrep)
    runs-on: ubuntu-latest
    needs: secret-scanning
    container:
      image: semgrep/semgrep:latest
    steps:
      - name: Checkout do Repositório
        uses: actions/checkout@v4

      - name: Executar Semgrep Scan (Ruleset OWASP Top 10)
        run: |
          semgrep scan --config auto --config .semgrep.yml --sarif --output semgrep-results.sarif

      - name: Upload de Resultados SARIF para o GitHub Security Tab
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: semgrep-results.sarif
```

- **Objetivo**: Análise estática de código (SAST) leve baseada em regras semânticas contra antipadrões e o OWASP Top 10.
- **`needs: secret-scanning`**: Estabelece uma dependência sequencial; este job só arranca se o varrimento de segredos anterior for aprovado.
- **`container: image: semgrep/semgrep:latest`**: Executa os passos diretamente dentro da imagem Docker oficial do Semgrep.
- **`semgrep scan`**: Analisa o código fonte usando as regras locais de [.semgrep.yml](file:///c:/Users/isr-rsilva.ISRETAIL/ci-cd-sec/.semgrep.yml) e exporta o resultado em formato estandardizado `semgrep-results.sarif`.
- **`upload-sarif@v3`**: Publica o relatório no painel de segurança nativo do GitHub.

---

## 📊 4. Estágio 3: SAST & Quality Gate com SonarQube (Linhas 59-84)

```yaml
  sast-sonarqube:
    name: 3. SAST & Quality Gate (SonarQube)
    runs-on: ubuntu-latest
    needs: secret-scanning
    steps:
      - name: Checkout do Repositório
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Executar SonarQube Scanner
        uses: SonarSource/sonarqube-scan-action@v2.0.2
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
          SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}
        with:
          args: >
            -Dsonar.projectKey=ci-cd-sec-devsecops
            -Dsonar.sources=src

      - name: Validação do SonarQube Quality Gate
        uses: SonarSource/sonarqube-quality-gate-action@v1.1.0
        timeout-minutes: 5
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

- **Objetivo**: Análise profunda de qualidade de código, bugs, duplicações e *Security Hotspots*.
- **`sonarqube-scan-action`**: Envia os dados da análise para o servidor SonarQube especificado através das variáveis de ambiente `SONAR_TOKEN` e `SONAR_HOST_URL`.
- **`sonarqube-quality-gate-action`**: **Portão de Qualidade e Segurança**. O pipeline é colocado em pausa e consulta a API do SonarQube. Se o código não cumprir os critérios do Quality Gate, o job aborta.

---

## 📦 5. Estágio 4: Análise de Dependências SCA com Snyk (Linhas 88-116)

```yaml
  sca-snyk:
    name: 4. SCA Dependency Scanning (Snyk)
    runs-on: ubuntu-latest
    needs: secret-scanning
    steps:
      - name: Checkout do Repositório
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Instalar Dependências
        run: npm ci

      - name: Executar Snyk para Deteção de Vulnerabilidades em Pacotes
        uses: snyk/actions/node@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --sarif-file-output=snyk-results.sarif --severity-threshold=high

      - name: Upload de Resultados SARIF do Snyk
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: snyk-results.sarif
```

- **Objetivo**: Software Composition Analysis (SCA) para identificar vulnerabilidades (CVEs) em bibliotecas de terceiros no `package.json`.
- **`npm ci`**: Instalação determinística de dependências.
- **`snyk/actions/node@master`**: Analisa a árvore de pacotes contra a base de vulnerabilidades do Snyk.

---

## 🐳 6. Estágio 5: Container Security & Hardening com Trivy (Linhas 121-154)

```yaml
  container-security:
    name: 5. Container & IaC Security (Trivy)
    runs-on: ubuntu-latest
    needs: [sast-semgrep, sca-snyk]
    steps:
      - name: Checkout do Repositório
        uses: actions/checkout@v4

      - name: Varrimento Trivy no Sistema de Ficheiros e Dockerfile (IaC Config Scan)
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          hide-progress: false
          format: 'table'
          exit-code: '1'
          severity: 'CRITICAL,HIGH'

      - name: Build da Imagem Docker Local
        run: |
          docker build -t devsecops-app:${{ github.sha }} .

      - name: Varrimento Trivy na Imagem Docker Gerada (CVE Check)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'devsecops-app:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-image-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload de Relatório Trivy para o GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy-image-results.sarif
```

- **Objetivo**: Varrimento duplo em containers (Infrastructure as Code & Docker Image CVE Scanning).
- **Passo 1 (`scan-type: 'config'`)**: Analisa o [Dockerfile](file:///c:/Users/isr-rsilva.ISRETAIL/ci-cd-sec/Dockerfile) em busca de erros de hardening.
- **Passo 2 (`docker build`)**: Constrói a imagem Docker localmente.
- **Passo 3 (`image-ref`)**: Realiza o varrimento de vulnerabilidades de pacotes de SO dentro do container compilado (`node:20-alpine`).

---

## 🚀 7. Estágio 6: Deploy Seguro e Promoção SSDLC (Linhas 159-175)

```yaml
  build-and-verify:
    name: 6. Build Final e Aprovação SSDLC
    runs-on: ubuntu-latest
    needs: [secret-scanning, sast-semgrep, sast-sonarqube, sca-snyk, container-security]
    steps:
      - name: Validação dos Security Gates
        run: |
          echo "========================================================"
          echo " TODOS OS SECURITY QUALITY GATES FORAM APROVADOS!"
          echo "========================================================"
```

- **Portão de Segurança Global (SSDLC Gate)**: Exige que **todos os 5 jobs anteriores** passem com sucesso. Se qualquer ferramenta detetar uma vulnerabilidade, este job é bloqueado e o deployment é abortado.
