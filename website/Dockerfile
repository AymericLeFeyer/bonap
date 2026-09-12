# =============================================================================
# Stage 1 — Build du site vitrine (Vite + React)
# =============================================================================
FROM node:26-alpine AS builder

WORKDIR /app

# Dépendances d'abord (meilleur cache Docker)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# =============================================================================
# Stage 2 — Serve (nginx statique + fallback SPA)
# =============================================================================
FROM nginx:1.31-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
