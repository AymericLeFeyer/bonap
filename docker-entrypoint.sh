#!/bin/sh
set -e

# Génère /usr/share/nginx/html/env-config.js avec les variables d'environnement runtime.
# Ce fichier expose window.__ENV__ et permet de reconfigurer l'app sans rebuild de l'image.
#
# Variables supportées :
#   VITE_MEALIE_URL    — URL Mealie accessible depuis le navigateur (ex: http://mealie:9000)
#   VITE_MEALIE_TOKEN  — Token Bearer Mealie
#   LLM_PROVIDER       — Fournisseur IA (anthropic, openai, google, ollama)
#   LLM_API_KEY        — Clé API du fournisseur IA
#   LLM_MODEL          — Modèle IA (ex: claude-sonnet-4-5)
#   LLM_OLLAMA_URL     — URL de l'instance Ollama (si provider=ollama)

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__ENV__ = {
  VITE_MEALIE_URL: "${VITE_MEALIE_URL:-}",
  VITE_MEALIE_TOKEN: "${VITE_MEALIE_TOKEN:-}",
  VITE_THEME: "${VITE_THEME:-}",
  VITE_ACCENT_COLORS: "${VITE_ACCENT_COLORS:-}",
  LLM_PROVIDER: "${LLM_PROVIDER:-}",
  LLM_API_KEY: "${LLM_API_KEY:-}",
  LLM_MODEL: "${LLM_MODEL:-}",
  LLM_OLLAMA_URL: "${LLM_OLLAMA_URL:-}"
};
EOF

# Retirer le slash final si présent
VITE_MEALIE_URL="${VITE_MEALIE_URL%/}"
export VITE_MEALIE_URL

# Substituer les variables dans la config nginx
envsubst '${VITE_MEALIE_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
