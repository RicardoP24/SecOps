# Explicação Detalhada do Pipeline DevSecOps no GitHub Actions

Ficheiro analisado: [devsecops-pipeline.yml](file:///c:/Users/isr-rsilva.ISRETAIL/ci-cd-sec/.github/workflows/devsecops-pipeline.yml)

---

## 📑 Secções do Pipeline CI/CD

### 1. Metadados e Permissões
- Configura permissões estritas `contents: read`, `security-events: write` e `issues: write` para publicar relatórios SARIF na aba **Security** e criar alertas de DAST.

### 2. Estágio 1: Gitleaks (Secret Scanning)
- Baixa o binário oficial do Gitleaks e analisa todas as variáveis e ficheiros à procura de credenciais expostas.

### 3. Estágio 2: Semgrep (SAST)
- Utiliza a imagem Docker oficial do Semgrep para aplicar as regras de [.semgrep.yml](file:///c:/Users/isr-rsilva.ISRETAIL/ci-cd-sec/.semgrep.yml) e detetar antipadrões do OWASP Top 10.

### 4. Estágio 3: SonarQube (Quality Gate)
- Submete o projeto para o SonarQube caso o `SONAR_TOKEN` esteja configurado nos Secrets do GitHub.

### 5. Estágio 4: Snyk (SCA)
- Instala as dependências do `package.json` com `npm ci` e analisa vulnerabilidades em bibliotecas de terceiros (SCA). Executa o `npm audit` nativo caso o `SNYK_TOKEN` não esteja configurado.

### 6. Estágio 5: Trivy (Containers & Hardening)
- Analisa a estrutura do [Dockerfile](file:///c:/Users/isr-rsilva.ISRETAIL/ci-cd-sec/Dockerfile) (IaC Config Scan) e faz o varrimento da imagem Docker compilada (`node:20-alpine`) contra CVEs conhecidas.

### 7. Estágio 6: OWASP ZAP (DAST Dynamic Scan)
- Arranca a aplicação Node.js localmente (`node src/server.js`) na porta 3000.
- Executa a ferramenta **OWASP ZAP (`zaproxy/action-baseline@v0.14.0`)** para simular ataques HTTP dinâmicos contra os endpoints da API ativa (`http://localhost:3000`).

### 8. Estágio 7: Deploy Seguro e Promoção SSDLC
- Exige aprovação de **todos os 6 estágios anteriores** antes de autorizar a promoção do software para produção.
