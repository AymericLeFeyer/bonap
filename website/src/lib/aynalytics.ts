/**
 * Aynalytics (analytics auto-hébergé) : charge le SDK et expose `track`.
 *
 * - Pages vues, visites, visiteurs uniques : automatiques (un `screen` par route).
 * - Liens sortants : classés automatiquement par `classifyLink` (GitHub, Mealie, autres),
 *   avec la `section` de la page (attribut `data-ay-section` posé sur les blocs).
 * - Actions sans lien (copie d'une commande) : `track(...)` explicite.
 *
 * Sans `VITE_AYNALYTICS_SITE_KEY` (dev local), tout est inactif. `VITE_AYNALYTICS_URL`
 * est facultative : par défaut, le SDK passe par le proxy `/_ay` du nginx du site.
 */

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
export type Properties = Record<string, JsonValue>

interface LinkClick {
  url: URL
  element: HTMLAnchorElement
  text: string
  section: string | null
  external: boolean
}

type LinkClassification = { name: string; properties?: Properties } | false | null

interface AynalyticsApi {
  init(options: {
    siteKey: string
    endpoint: string
    persistence?: 'session' | 'local' | 'memory'
    autoClicks?: boolean
    outboundLinks?: boolean
    classifyLink?: (link: LinkClick) => LinkClassification
  }): unknown
  track(name: string, properties?: Properties): void
}

type QueuedCall = [string, unknown[]]

declare global {
  interface Window {
    aynalytics?: AynalyticsApi | { q: QueuedCall[] }
  }
}

/** Par défaut, le collector est relayé par le nginx du site sur /_ay (nginx.conf). */
const ENDPOINT = (import.meta.env.VITE_AYNALYTICS_URL || '/_ay').replace(/\/+$/, '')
const SITE_KEY = import.meta.env.VITE_AYNALYTICS_SITE_KEY

/**
 * Nom d'événement selon la destination du lien. Les propriétés par défaut du SDK
 * (`url`, `host`, `text`, `section`) sont conservées ; `null` = `outbound_click`.
 */
function classifyLink(link: LinkClick): LinkClassification {
  if (!link.external) return null
  const host = link.url.hostname.replace(/^www\./, '')
  if (host === 'github.com') {
    // /owner/repo/... -> "owner/repo"
    const repo = link.url.pathname.split('/').filter(Boolean).slice(0, 2).join('/')
    return { name: 'github_click', properties: { repo } }
  }
  if (host === 'mealie.io') return { name: 'mealie_click' }
  return null
}

let started = false

export function initAynalytics(): void {
  if (started || !SITE_KEY || typeof window === 'undefined') return
  started = true

  // File d'attente : les appels faits avant le chargement du script sont rejoués après l'init.
  window.aynalytics = { q: [] }

  const script = document.createElement('script')
  script.src = `${ENDPOINT}/sdk.js`
  script.async = true
  script.onload = () => {
    const api = window.aynalytics
    if (!api || !('init' in api)) return
    api.init({
      siteKey: SITE_KEY,
      endpoint: ENDPOINT,
      // Identifiant anonyme persistant (13 mois max) : visiteurs uniques sur plusieurs jours.
      persistence: 'local',
      // Pas de `data-ay-event` sur ce site : seuls les liens sont détectés.
      autoClicks: false,
      outboundLinks: true,
      classifyLink,
    })
  }
  document.head.appendChild(script)
}

/** Envoie un événement. Sans effet si Aynalytics n'est pas configuré. */
export function track(name: string, properties?: Properties): void {
  const api = typeof window === 'undefined' ? undefined : window.aynalytics
  if (!api) return
  if ('q' in api) api.q.push(['track', [name, properties]])
  else api.track(name, properties)
}
