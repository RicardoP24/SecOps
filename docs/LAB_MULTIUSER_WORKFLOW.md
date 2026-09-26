# Laboratório Prático: Workflow Git Multi-Utilizador e Validação CI/CD

Este guia ensina passo a passo como utilizar este repositório para simular a colaboração de **2 utilizadores (Alice e Bob)** em branches diferentes, realizar `commit`, `push` e `pull request`, e observar os **Security Quality Gates** em ação no **GitHub Actions**.

---

## 🎭 Os Personagens do Laboratório

1. **Alice (`Alice Dev <alice@devsecops.org>`)**:
   - Desenvolvedora que segue boas práticas de **SSDLC**.
   - Trabalha na branch `feature/alice-secure-auth`.
   - **Resultado Esperado no CI/CD**: 🟢 **APROVADO** em todos os Security Gates.

2. **Bob (`Bob Dev <bob@devsecops.org>`)**:
   - Desenvolvedor que cometeu deslizes de segurança (credencial exposta + código inseguro com `eval()`).
   - Trabalha na branch `feature/bob-insecure-feature`.
   - **Resultado Esperado no CI/CD**: 🔴 **BLOQUEADO** pelo Gitleaks e Semgrep.

---

## 🚀 Passo 1: Executar o Script de Automação de Branches

Abra o PowerShell na pasta do projeto e execute o script:

```powershell
# Executar a criação das branches locais dos 2 utilizadores
.\scripts\setup-git-and-branches.ps1
```

O script irá criar as branches `feature/alice-secure-auth` e `feature/bob-insecure-feature` com commits atribuídos respetivamente à Alice e ao Bob.

---

## 🌐 Passo 2: Publicar no GitHub

1. Crie um novo repositório vazio no seu GitHub com o nome **`SecOps`**.
2. Adicione o repositório remoto e faça o push de todas as branches:

```bash
# Conectar ao seu repositório no GitHub
git remote add origin https://github.com/SEU-UTILIZADOR/SecOps.git

# Enviar a branch principal
git push -u origin main

# Enviar as branches da Alice e do Bob
git push -u origin feature/alice-secure-auth
git push -u origin feature/bob-insecure-feature
```

---

## 🔄 Passo 3: Abrir Pull Requests e Observar o CI/CD

### Teste 1: Pull Request da Alice (Código Seguro)
1. No GitHub, abra uma **Pull Request** de `feature/alice-secure-auth` para `main`.
2. Vá ao separador **Actions** ou observe as verificações na própria PR.
3. **Resultado**:
   - `1. Secret Scanning (Gitleaks)`: 🟢 Passed
   - `2. Unit Tests` e `3. SAST (Semgrep)`: 🟢 Passed
   - `5. SCA (Snyk / npm audit)`: 🟢 Passed
   - `6. Container Security (Trivy)` e `7. DAST (OWASP ZAP)`: 🟢 Passed
   - Resultado: 🟢 aprovado para fusão (merge).

---

### Teste 2: Pull Request do Bob (Código Vulnerável)
1. Abra uma **Pull Request** de `feature/bob-insecure-feature` para `main`.
2. Observe o GitHub Actions interromper a pipeline.
3. **Resultado**:
   - `1. Secret Scanning (Gitleaks)`: 🔴 **FALHOU** (detetou a chave em `AWS_SECRET_KEY` no ficheiro `src/legacy-processor.js`).
   - Os jobs seguintes não chegam a correr: com a proteção de branch abaixo, o botão de merge fica desativado.
   - Depois de remover a chave, o `3. SAST (Semgrep)` 🔴 **FALHA** com o uso inseguro de `eval()` no mesmo ficheiro.

---

## ⚙️ Configuração Recomendada de Proteção de Branch no GitHub

Para forçar que o código só possa ser fundido se passar na pipeline de segurança:
1. Vá a **Settings > Branches** no repositório GitHub.
2. Adicione uma regra de proteção para a branch `main`.
3. Ative a opção: **"Require status checks to pass before merging"**.
4. Selecione os estágios: `1. Secret Scanning (Gitleaks)`, `2. Unit Tests`, `3. SAST (Semgrep)`, `4. SAST & Quality Gate (SonarQube)`, `5. SCA Dependency Scanning (Snyk / npm audit)`, `6. Container Security (Trivy)` e `7. DAST (OWASP ZAP)`.
