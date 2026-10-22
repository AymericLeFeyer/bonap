/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL du collector Aynalytics. Facultative : `/_ay` (proxy nginx du site) par défaut. */
  readonly VITE_AYNALYTICS_URL?: string
  /** Clé publique du site dans Aynalytics (ay_pk_...). Absente = Aynalytics inactif. */
  readonly VITE_AYNALYTICS_SITE_KEY?: string
}
