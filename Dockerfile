FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node index.html styles.css app.js ./

USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
