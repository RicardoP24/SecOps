# ==========================================
# DevSecOps Hardened Dockerfile
# Baseado nas recomendações de Hardening Trivy / CIS Benchmark
# ==========================================

# Estágio 1: Build & Dependências (Builder)
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar apenas os manifestos de dependências para otimizar a cache de camadas
COPY package*.json ./

# Instalação estrita para produção
RUN npm ci --only=production

# Estágio 2: Imagem Final de Execução (Production Runner)
FROM node:20-alpine AS runner

# Atualizar pacotes do sistema operativo para corrigir vulnerabilidades conhecidas da imagem base (Trivy requirement)
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

WORKDIR /app

# Definir ambiente seguro
ENV NODE_ENV=production

# Copiar dependências e ficheiros da aplicação a partir do builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node index.html styles.css app.js ./

# Definir utilizador não-root para execução (Hardening Princípio de Menor Privilégio)
USER node

# Expor porta sem privilégios de root
EXPOSE 3000

# Healthcheck interno do container para monitorização
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

# Comando de arranque da aplicação
CMD ["node", "src/server.js"]
