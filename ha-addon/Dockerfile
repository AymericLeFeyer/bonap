ARG BUILD_FROM=alpine:3.20

# Stage 1 — Build Vite app
# Force amd64: Node 20 doesn't support armv7, and the output (static files) is arch-agnostic.
FROM --platform=linux/amd64 node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

# Stage 2 — Serve with HA base image
FROM ${BUILD_FROM}

RUN apk add --no-cache nginx gettext jq

COPY --from=builder /app/dist /usr/share/nginx/html

COPY ha-addon/nginx.conf /etc/nginx/templates/default.conf.template

COPY ha-addon/run.sh /run.sh
RUN chmod +x /run.sh

EXPOSE 3000

CMD ["/run.sh"]
