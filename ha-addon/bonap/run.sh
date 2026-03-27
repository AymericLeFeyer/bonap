#!/usr/bin/with-contenv bashio
# =============================================================================
# Bonap — Home Assistant addon entrypoint
#
# Reads options set in the HA UI (via /data/options.json) using bashio,
# injects them as window.__ENV__ into the static HTML, and starts nginx.
# =============================================================================
set -e

# ---------------------------------------------------------------------------
# Read options from Home Assistant
# ---------------------------------------------------------------------------
MEALIE_URL="$(bashio::config 'mealie_url')"
MEALIE_TOKEN="$(bashio::config 'mealie_token')"

bashio::log.info "Starting Bonap..."
bashio::log.info "Mealie URL: ${MEALIE_URL}"

# ---------------------------------------------------------------------------
# Inject runtime configuration into the SPA via window.__ENV__
# This file is loaded by index.html before the Vite bundle.
# ---------------------------------------------------------------------------
cat > /usr/share/nginx/html/env-config.js <<EOF
window.__ENV__ = {
  VITE_MEALIE_URL: "${MEALIE_URL}",
  VITE_MEALIE_TOKEN: "${MEALIE_TOKEN}"
};
EOF

bashio::log.debug "env-config.js written."

# ---------------------------------------------------------------------------
# Configure the nginx /api proxy: use MEALIE_URL as the internal target.
# ---------------------------------------------------------------------------
export MEALIE_INTERNAL_URL="${MEALIE_URL%/}"

# Substitute the variable in the nginx config template
envsubst '${MEALIE_INTERNAL_URL}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/http.d/default.conf

# ---------------------------------------------------------------------------
# Start nginx in the foreground
# ---------------------------------------------------------------------------
bashio::log.info "Bonap available on port 3000."
exec nginx -g "daemon off;"
