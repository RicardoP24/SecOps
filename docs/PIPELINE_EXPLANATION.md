# Explicação Detalhada do Pipeline DevSecOps no GitHub Actions

Ficheiro analisado: [`.github/workflows/devsecops-pipeline.yml`](../.github/workflows/devsecops-pipeline.yml)

---

## Princípios aplicados a todo o pipeline

- **Menor privilégio:** o workflow tem `contents: read` por omissão; cada job pede apenas as permissões de que precisa (`security-events: write` para SARIF, `packages: write` e `id-token: write` só na publicação).
- **Actions fixadas por SHA:** tags como `@v4` ou `@master` são mutáveis e já foram usadas em ataques de supply chain. Todas as actions usam o SHA completo do commit, com a versão em comentário.
- **Ferramentas com versão fixa:** Gitleaks (com verificação SHA-256), imagem do Semgrep por digest, Trivy e Snyk com versão explícita.
- **Gates reais:** cada stage de segurança falha o job quando encontra problemas; os jobs seguintes não correm.
- `persist-credentials: false` no checkout: o token do GitHub não fica gravado no `.git` do runner.

## Stages

| # | Job | O que faz | Bloqueia quando |
|---|---|---|---|
| 1 | Secret Scanning (Gitleaks) | Analisa **todo o histórico git** com as regras por omissão do Gitleaks + regras do projeto ([`.gitleaks.toml`](../.gitleaks.toml)) | qualquer segredo |
| 2 | Unit Tests | `npm test` (node:test): API, cabeçalhos do Helmet, CORS, rate limiting, ficheiros não expostos | teste falhado |
| 3 | SAST (Semgrep) | Regras JavaScript, Node.js, OWASP Top 10, Dockerfile e GitHub Actions + regras próprias ([`.semgrep.yml`](../.semgrep.yml)) | achados `ERROR`/`WARNING` (`INFO` só é reportado) |
| 4 | SAST & Quality Gate (SonarQube) | Corre se `SONAR_TOKEN` estiver configurado; `sonar.qualitygate.wait=true` faz o passo esperar pelo Quality Gate | Quality Gate falhado |
| 5 | SCA (Snyk / npm audit) | Snyk com `SNYK_TOKEN`; sem token, `npm audit` das dependências de produção | vulnerabilidade HIGH/CRITICAL |
| 6 | Container Security (Trivy) | Scan de configuração do Dockerfile e scan da imagem construída | má configuração HIGH/CRITICAL; CVE HIGH/CRITICAL **com correção disponível** |
| 7 | DAST (OWASP ZAP) | Arranca **o container** (com `--read-only`) e corre o ZAP baseline contra ele | regras marcadas `FAIL` em [`.zap/rules.tsv`](../.zap/rules.tsv) |
| 8 | Publish Signed Image | Só em `main`: imagem no GHCR com SBOM e proveniência SLSA, assinada com **cosign keyless** (OIDC do GitHub) e verificada | falha na assinatura ou verificação |

Os resultados em SARIF (Gitleaks, Semgrep, Snyk, Trivy) ficam no separador **Security → Code scanning** do repositório.

## Verificar a imagem publicada

```bash
cosign verify ghcr.io/ricardop24/secops:latest \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity-regexp '^https://github.com/RicardoP24/SecOps/'
```
