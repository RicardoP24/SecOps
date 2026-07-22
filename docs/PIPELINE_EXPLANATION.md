# Explicação Detalhada do Pipeline DevSecOps no GitHub Actions

Ficheiro analisado: [devsecops-pipeline.yml](file:///c:/Users/isr-rsilva.ISRETAIL/ci-cd-sec/.github/workflows/devsecops-pipeline.yml)

---

## 🔍 Causa do Erro do Gitleaks no Primeiro Push e Solução Aplicada

O erro reportado no registo do GitHub Actions:
```text
ERR [git] fatal: ambiguous argument '94c887...^..b32fdb...': unknown revision or path not in the working tree.
```
ocorreu porque a ação `gitleaks-action@v2` tenta executar `git log commit^..commit`. Num **repositório novo ou no commit inicial**, a referência `commit^` (commit anterior) **não existe**, fazendo com que o Git aborte a execução.

### 🛠️ Correção Implementada:
Substituímos o passo pelo download direto da versão estável do binário do **Gitleaks** e executámo-lo com o comando:
```bash
./gitleaks detect --source=. --config=.gitleaks.toml --verbose --redact --report-format=sarif --report-path=gitleaks-results.sarif
```
O parâmetro `--source=.` faz com que o Gitleaks analise a árvore de ficheiros da aplicação diretamente, eliminando o erro de revisão inexistente no Git e garantindo a deteção de segredos em qualquer tipo de commit (inicial, PR ou push regular).

---

## 📑 Estrutura das Secções do Pipeline

### 1. Metadados e Permissões
- Configura permissões estritas `contents: read` e `security-events: write` para publicar relatórios SARIF na aba **Security > Code scanning** do GitHub.

### 2. Estágio 1: Gitleaks (Secret Scanning)
- Baixa a versão estável do Gitleaks e analisa todas as variáveis e ficheiros à procura de credenciais expostas.

### 3. Estágio 2: Semgrep (SAST)
- Utiliza a imagem Docker oficial do Semgrep para aplicar as regras de [.semgrep.yml](file:///c:/Users/isr-rsilva.ISRETAIL/ci-cd-sec/.semgrep.yml) e detetar antipadrões do OWASP Top 10.

### 4. Estágio 3: SonarQube (Quality Gate)
- Submete o projeto para o SonarQube caso o `SONAR_TOKEN` esteja configurado nos Secrets do GitHub. Se o token não estiver presente, executa um fallback limpo sem bloquear o repositório.

### 5. Estágio 4: Snyk (SCA)
- Instala as dependências do `package.json` com `npm ci` e analisa vulnerabilidades em bibliotecas de terceiros (SCA). Executa o `npm audit` nativo caso o `SNYK_TOKEN` não esteja configurado.

### 6. Estágio 5: Trivy (Containers & Hardening)
- Analisa a estrutura do [Dockerfile](file:///c:/Users/isr-rsilva.ISRETAIL/ci-cd-sec/Dockerfile) (IaC Config Scan) e faz o varrimento da imagem Docker compilada (`node:20-alpine`) contra CVEs conhecidas.

### 7. Estágio 6: Deploy Final e Aprovação SSDLC
- Exige aprovação de todos os 5 estágios anteriores antes de autorizar a promoção do software.
