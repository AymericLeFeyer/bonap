#!/bin/sh
set -e

OPTIONS_FILE=/data/options.json

MEALIE_URL="$(jq -r '.mealie_url' "${OPTIONS_FILE}")"
MEALIE_TOKEN="$(jq -r '.mealie_token' "${OPTIONS_FILE}")"
LLM_PROVIDER="$(jq -r '.llm_provider // empty' "${OPTIONS_FILE}")"
LLM_API_KEY="$(jq -r '.llm_api_key // empty' "${OPTIONS_FILE}")"
LLM_MODEL="$(jq -r '.llm_model // empty' "${OPTIONS_FILE}")"
LLM_OLLAMA_URL="$(jq -r '.llm_ollama_url // empty' "${OPTIONS_FILE}")"

MEALIE_URL_CLEAN="${MEALIE_URL%/}"
OLLAMA_URL_CLEAN="${LLM_OLLAMA_URL%/}"

echo "[Bonap] Starting..."
echo "[Bonap] Mealie URL: ${MEALIE_URL_CLEAN}"

if [ -n "${OLLAMA_URL_CLEAN}" ]; then
  echo "[Bonap] Ollama URL (server-side): ${OLLAMA_URL_CLEAN}"
  OLLAMA_FRONTEND_URL="/api/ollama"
else
  OLLAMA_FRONTEND_URL=""
fi

cat > /usr/share/nginx/html/env-config.js <<ENVEOF
window.__ENV__ = {
  VITE_MEALIE_URL: "${MEALIE_URL_CLEAN}",
  VITE_MEALIE_TOKEN: "${MEALIE_TOKEN}",
  VITE_THEME: "",
  VITE_ACCENT_COLORS: "",
  LLM_PROVIDER: "${LLM_PROVIDER}",
  LLM_API_KEY: "${LLM_API_KEY}",
  LLM_MODEL: "${LLM_MODEL}",
  LLM_OLLAMA_URL: "${OLLAMA_FRONTEND_URL}"
};
ENVEOF

# Build Ollama block (proxy_pass uses shell value, nginx variables stay literal)
if [ -n "${OLLAMA_URL_CLEAN}" ]; then
  printf '    location ^~ /api/ollama/ {\n' > /tmp/ollama_block.conf
  printf '        rewrite ^/api/ollama/(.*) /$1 break;\n' >> /tmp/ollama_block.conf
  printf "        proxy_pass %s;\n" "${OLLAMA_URL_CLEAN}" >> /tmp/ollama_block.conf
  printf '        proxy_http_version 1.1;\n' >> /tmp/ollama_block.conf
  printf '        proxy_set_header Host $proxy_host;\n' >> /tmp/ollama_block.conf
  printf '        proxy_set_header Origin "";\n' >> /tmp/ollama_block.conf
  printf '        proxy_set_header X-Real-IP $remote_addr;\n' >> /tmp/ollama_block.conf
  printf '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n' >> /tmp/ollama_block.conf
  printf '        proxy_buffering off;\n' >> /tmp/ollama_block.conf
  printf '        proxy_cache off;\n' >> /tmp/ollama_block.conf
  printf '        proxy_read_timeout 300s;\n' >> /tmp/ollama_block.conf
  printf '    }\n' >> /tmp/ollama_block.conf
else
  printf '    location ^~ /api/ollama/ { return 503; }\n' > /tmp/ollama_block.conf
fi

# Build nginx config explicitly so HA ingress and Marmiton route stay consistent
cat > /tmp/nginx_header.conf << 'NGINXEOF'
server {
    listen 3000;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

NGINXEOF

cat /tmp/ollama_block.conf >> /tmp/nginx_header.conf

cat >> /tmp/nginx_header.conf << 'NGINXEOF'

    location ^~ /api/marmiton/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host localhost;
        proxy_set_header Origin "";
        proxy_buffering off;
      proxy_connect_timeout 10s;
      proxy_send_timeout 90s;
      proxy_read_timeout 90s;
    }

NGINXEOF

printf '\n    location ^~ /api/ {\n' >> /tmp/nginx_header.conf
printf "        proxy_pass %s;\n" "${MEALIE_URL_CLEAN}" >> /tmp/nginx_header.conf
cat >> /tmp/nginx_header.conf << 'NGINXEOF'
        proxy_http_version 1.1;
        proxy_ssl_server_name on;
        proxy_set_header Host $proxy_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location = /env-config.js {
        expires off;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXEOF

cp /tmp/nginx_header.conf /etc/nginx/http.d/default.conf

echo "[Bonap] nginx config:"
cat /etc/nginx/http.d/default.conf

nginx -t

# Start Marmiton proxy in background when available
if command -v node >/dev/null 2>&1 && [ -f /proxy/marmiton-proxy.cjs ]; then
  echo "[Bonap] Démarrage du proxy Marmiton..."
  OLLAMA_URL="${OLLAMA_URL_CLEAN}" OLLAMA_MODEL="${LLM_MODEL}" node /proxy/marmiton-proxy.cjs &
else
  echo "[Bonap] Proxy Marmiton non disponible (node absent ou fichier manquant)"
fi

echo "[Bonap] Available on port 3000."
exec nginx -g "daemon off;"
