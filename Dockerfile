# ==============================================================================
# Dockerfile com Vulnerabilidades e Falhas de Hardening Propositadas (Para Testar Trivy)
# ==============================================================================

# 1. IMAGEM BASE DESATUALIZADA E VULNERÁVEL (Trivy irá detetar dezenas de CVEs Críticas!)
FROM php:7.4-apache

# 2. SEGREDO HARDCODED EM VARIÁVEL DE AMBIENTE (Trivy IaC & Gitleaks scan)
ENV DB_ROOT_PASSWORD="UnsecureRootPassword123!"
ENV AWS_ACCESS_KEY_ID="MOCK_AWS_ACCESS_KEY_SECRET_12345"

WORKDIR /var/www/html

# Copiar ficheiros PHP e Node.js
COPY src/ /var/www/html/

# 3. EXPOSIÇÃO DE PORTA INSEGURA (SSH Port Expose)
EXPOSE 22
EXPOSE 80

# 4. EXECUÇÃO COMO UTILIZADOR ROOT (Violador de Hardening CIS Benchmark / Trivy Exit Code 1)
# Repare que NÃO definimos "USER www-data", o container corre como root!
USER root

CMD ["apache2-foreground"]
