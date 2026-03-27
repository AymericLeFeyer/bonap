#!/bin/sh
set -e

OPTIONS_FILE=/data/options.json

MEALIE_URL="$(jq -r '.mealie_url' "${OPTIONS_FILE}")"
MEALIE_TOKEN="$(jq -r '.mealie_token' "${OPTIONS_FILE}")"

echo "[Bonap] Starting..."
echo "[Bonap] Mealie URL: ${MEALIE_URL}"

cat > /usr/share/nginx/html/env-config.js <<EOF
window.__ENV__ = {
  VITE_MEALIE_URL: "${MEALIE_URL}",
  VITE_MEALIE_TOKEN: "${MEALIE_TOKEN}"
};
EOF

export MEALIE_INTERNAL_URL="${MEALIE_URL%/}"

envsubst '${MEALIE_INTERNAL_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/http.d/default.conf

echo "[Bonap] Available on port 3000."
exec nginx -g "daemon off;"
