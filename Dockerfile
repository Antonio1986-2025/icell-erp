# ---- BUILD ----
FROM node:20-alpine AS builder

WORKDIR /app

# Dependências primeiro (cache layer)
COPY package.json package-lock.json ./
RUN npm ci

# Prisma schema (precisa antes de gerar client)
COPY prisma/ ./prisma/
RUN npx prisma generate

# Código fonte
COPY . .

# Build Next.js
RUN npm run build

# ---- PRODUCTION ----
FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Copia node_modules completo (standalone já tem boa parte)
# Necessário para Prisma e todas as suas dependências (ex: effect)
COPY --from=builder /app/node_modules ./node_modules

# Entrypoint para rodar migrations + seed antes de iniciar
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
