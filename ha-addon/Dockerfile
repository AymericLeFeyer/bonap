ARG BUILD_FROM=alpine:3.20

# Stage 1 — Build Vite app
# Force amd64: Node 20 doesn't support armv7, and the output (static files) is arch-agnostic.
FROM --platform=linux/amd64 node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

COPY . .

RUN npm run build

# Stage 2 — Build Marmiton proxy dependencies
FROM --platform=linux/amd64 node:20-alpine AS marmiton-builder

WORKDIR /proxy

COPY ha-addon/bff-package.json package.json
RUN npm install --production

# Stage 3 — Serve with HA base image
FROM ${BUILD_FROM}

RUN apk add --no-cache nginx gettext jq nodejs unzip

COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=marmiton-builder /proxy/node_modules /proxy/node_modules

COPY ha-addon/bonap-bff.cjs /proxy/bonap-bff.cjs

COPY ha-addon/nginx.conf /etc/nginx/templates/default.conf.template

COPY ha-addon/run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 3000

ENTRYPOINT ["/run.sh"]
