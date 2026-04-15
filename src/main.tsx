import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import "./index.css"
import App from "./App.tsx"
import { themeService } from "./infrastructure/theme/ThemeService.ts"
import { syncSettingsFromServer } from "./infrastructure/settings/ServerSettingsService.ts"

// 1. Appliquer le thème immédiatement depuis localStorage (évite le flash initial)
themeService.apply()

// 2. Synchroniser les settings depuis le serveur AVANT le premier rendu React
//    (évite le flash thème clair→sombre : le DOM est déjà correct au moment du paint)
await syncSettingsFromServer()
themeService.apply() // re-appliquer avec les settings synchro depuis le serveur

// Détecte dynamiquement le basename pour supporter HA ingress
// (/api/hassio_ingress/<token>/) sans casser l'accès direct (basename = "/")
const ingressMatch = window.location.pathname.match(/^(\/api\/hassio_ingress\/[^/]+)/)
const basename = ingressMatch ? ingressMatch[1] : '/'

const root = createRoot(document.getElementById("root")!)

root.render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
