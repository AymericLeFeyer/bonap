#!/bin/sh
set -e

# Génère /usr/share/nginx/html/env-config.js avec les variables d'environnement runtime.
# Ce fichier expose window.__ENV__ et permet de reconfigurer l'app sans rebuild de l'image.
#
# ⚠️ env-config.js est PUBLIC : tout visiteur qui atteint Bonap peut le lire.
# N'y mettre que ce que le navigateur doit connaître.
#
# Variables supportées :
#   VITE_MEALIE_URL    — URL Mealie accessible depuis le conteneur (ex: http://mealie:9000)
#   VITE_MEALIE_TOKEN  — Token Bearer Mealie. Reste côté serveur : nginx l'injecte
#                        sur /api (il n'est plus écrit dans env-config.js).
#   BONAP_EXPOSE_MEALIE_TOKEN — "true" pour revenir à l'ancien comportement
#                        (token écrit dans env-config.js). Déconseillé.
#   LLM_PROVIDER       — Fournisseur IA (anthropic, openai, google, ollama)
#   LLM_API_KEY        — Clé API du fournisseur IA. ⚠️ Écrite dans env-config.js
#                        (les appels IA partent du navigateur) : lisible par tout visiteur.
#   LLM_MODEL          — Modèle IA (ex: claude-sonnet-4-5)
#   LLM_OLLAMA_URL     — URL de l'instance Ollama (si provider=ollama)
#   BONAP_DYNAMIC_OLLAMA_PROXY — "false" pour interdire au BFF de joindre une
#                        instance Ollama choisie depuis le navigateur (Settings).

# Échappe une valeur pour l'insérer dans une chaîne JS entre guillemets doubles.
js_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's#</#<\\/#g' | tr -d '\n\r'
}

EXPOSED_MEALIE_TOKEN=""
BONAP_MEALIE_AUTH=""
if [ -n "${VITE_MEALIE_TOKEN:-}" ]; then
  if [ "${BONAP_EXPOSE_MEALIE_TOKEN:-}" = "true" ]; then
    echo "[Bonap] ⚠️  BONAP_EXPOSE_MEALIE_TOKEN=true : le token Mealie est lisible par tout visiteur (env-config.js)."
    EXPOSED_MEALIE_TOKEN="${VITE_MEALIE_TOKEN}"
  elif printf '%s' "${VITE_MEALIE_TOKEN}" | grep -Eq '^[A-Za-z0-9._~+/=-]+$'; then
    BONAP_MEALIE_AUTH="Bearer ${VITE_MEALIE_TOKEN}"
  else
    echo "[Bonap] ⚠️  VITE_MEALIE_TOKEN contient des caractères inattendus : token ignoré."
  fi
fi

if [ -n "${LLM_API_KEY:-}" ]; then
  echo "[Bonap] ⚠️  LLM_API_KEY est défini : la clé est servie à tout visiteur via env-config.js."
  echo "[Bonap]     N'exposez pas Bonap sans reverse-proxy authentifié, ou saisissez la clé dans Paramètres (stockée par navigateur)."
fi

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__ENV__ = {
  VITE_MEALIE_URL: "$(js_escape "${VITE_MEALIE_URL:-}")",
  VITE_MEALIE_TOKEN: "$(js_escape "${EXPOSED_MEALIE_TOKEN}")",
  VITE_THEME: "$(js_escape "${VITE_THEME:-}")",
  VITE_ACCENT_COLORS: "$(js_escape "${VITE_ACCENT_COLORS:-}")",
  LLM_PROVIDER: "$(js_escape "${LLM_PROVIDER:-}")",
  LLM_API_KEY: "$(js_escape "${LLM_API_KEY:-}")",
  LLM_MODEL: "$(js_escape "${LLM_MODEL:-}")",
  LLM_OLLAMA_URL: "$(js_escape "${LLM_OLLAMA_URL:-}")"
};
EOF

# Retirer les slash finaux si présents
VITE_MEALIE_URL="${VITE_MEALIE_URL%/}"
LLM_OLLAMA_URL="${LLM_OLLAMA_URL%/}"
export VITE_MEALIE_URL
export LLM_OLLAMA_URL
export BONAP_MEALIE_AUTH

# Substituer les variables dans la config nginx
envsubst '${VITE_MEALIE_URL} ${LLM_OLLAMA_URL} ${BONAP_MEALIE_AUTH}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Démarrer le proxy Marmiton en arrière-plan (hors addon HA)
if command -v node >/dev/null 2>&1 && [ -f /proxy/bonap-bff.cjs ]; then
  OLLAMA_URL="${LLM_OLLAMA_URL}" OLLAMA_MODEL="${LLM_MODEL:-}" BONAP_DYNAMIC_OLLAMA_PROXY="${BONAP_DYNAMIC_OLLAMA_PROXY:-}" node /proxy/bonap-bff.cjs &
fi

exec nginx -g "daemon off;"
