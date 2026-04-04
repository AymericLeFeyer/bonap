#!/bin/sh
set -e

OPTIONS_FILE=/data/options.json

MEALIE_URL="$(jq -r '.mealie_url' "${OPTIONS_FILE}")"
MEALIE_TOKEN="$(jq -r '.mealie_token' "${OPTIONS_FILE}")"
LLM_PROVIDER="$(jq -r '.llm_provider // empty' "${OPTIONS_FILE}")"
LLM_API_KEY="$(jq -r '.llm_api_key // empty' "${OPTIONS_FILE}")"
LLM_MODEL="$(jq -r '.llm_model // empty' "${OPTIONS_FILE}")"
LLM_OLLAMA_URL="$(jq -r '.llm_ollama_url // empty' "${OPTIONS_FILE}")"

echo "[Bonap] Starting..."
echo "[Bonap] Mealie URL: ${MEALIE_URL}"

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__ENV__ = {
  VITE_MEALIE_URL: "${MEALIE_URL}",
  VITE_MEALIE_TOKEN: "${MEALIE_TOKEN}",
  VITE_THEME: "${VITE_THEME:-}",
  VITE_ACCENT_COLORS: "${VITE_ACCENT_COLORS:-}",
  LLM_PROVIDER: "${LLM_PROVIDER}",
  LLM_API_KEY: "${LLM_API_KEY}",
  LLM_MODEL: "${LLM_MODEL}",
  LLM_OLLAMA_URL: "${LLM_OLLAMA_URL}"
};
EOF

export VITE_MEALIE_URL="${MEALIE_URL%/}"

envsubst '${VITE_MEALIE_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/http.d/default.conf

echo "[Bonap] Available on port 3000."
exec nginx -g "daemon off;"
