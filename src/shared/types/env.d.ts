/**
 * Variables d'environnement injectées au runtime via Docker (window.__ENV__).
 * Générées par docker-entrypoint.sh dans /usr/share/nginx/html/env-config.js.
 * En développement sans Docker, window.__ENV__ est undefined et l'app
 * retombe sur import.meta.env (variables Vite injectées au build).
 */
declare const __APP_VERSION__: string

interface Window {
  __ENV__?: {
    VITE_MEALIE_URL?: string
    VITE_MEALIE_TOKEN?: string
    VITE_THEME?: "light" | "dark" | "system"
    VITE_ACCENT_COLORS?: string
    LLM_PROVIDER?: string
    LLM_API_KEY?: string
    LLM_MODEL?: string
    LLM_OLLAMA_URL?: string
  }
}
