# =============================================================================
# Stage 1 — Build du site vitrine (Vite + React)
# =============================================================================
FROM node:26-alpine AS builder

WORKDIR /app

# Dépendances d'abord (meilleur cache Docker)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Aynalytics : clé PUBLIQUE du site (jamais la clé secrète), inlinée par Vite au build.
# Vide = analytics désactivé. L'URL est facultative (/_ay, proxy nginx, par défaut).
ARG VITE_AYNALYTICS_URL=""
ARG VITE_AYNALYTICS_SITE_KEY=""
ENV VITE_AYNALYTICS_URL=$VITE_AYNALYTICS_URL
ENV VITE_AYNALYTICS_SITE_KEY=$VITE_AYNALYTICS_SITE_KEY

RUN npm run build

# =============================================================================
# Stage 2 — Serve (nginx statique + fallback SPA)
# =============================================================================
FROM nginx:1.31-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
