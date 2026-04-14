# =============================================================================
# Stage 1 — Build
# =============================================================================
FROM node:24-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances en premier (meilleur cache Docker)
COPY package.json package-lock.json ./
RUN npm ci

# Copier le reste du code source
COPY . .

# Build Vite
# Les VITE_* sont des placeholders — l'injection runtime via window.__ENV__ les remplace.
# On ne passe pas les vraies valeurs ici pour que l'image soit générique et réutilisable.
RUN npm run build

# =============================================================================
# Stage 2 — Build Marmiton proxy dependencies
# =============================================================================
FROM node:24-alpine AS marmiton-builder

WORKDIR /proxy

COPY ha-addon/marmiton-package.json package.json
RUN npm install --production

# =============================================================================
# Stage 3 — Serve
# =============================================================================
FROM nginx:1.27-alpine AS runner

# Installer gettext pour envsubst + nodejs pour le proxy Marmiton
RUN apk add --no-cache gettext nodejs

# Config nginx (template avec substitution de variables)
COPY nginx.conf /etc/nginx/templates/default.conf.template

# App statique issue du build
COPY --from=builder /app/dist /usr/share/nginx/html

# Proxy Marmiton (hors addon HA)
COPY --from=marmiton-builder /proxy/node_modules /proxy/node_modules
COPY ha-addon/marmiton-proxy.cjs /proxy/marmiton-proxy.cjs

# Script d'entrypoint : génère env-config.js et lance nginx
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
