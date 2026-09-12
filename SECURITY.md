# Security Policy

## Versions supportées

| Version | Support |
|---------|---------|
| latest  | ✅ |
| < latest | ❌ |

## Signaler une vulnérabilité

**Ne pas ouvrir une issue publique** pour un problème de sécurité.

Ouvrez un [Security Advisory privé](https://github.com/AymericLeFeyer/bonap/security/advisories/new) sur GitHub, ou envoyez un e-mail à l'adresse indiquée dans le profil GitHub du mainteneur.

Incluez :
- Une description de la vulnérabilité
- Les étapes pour la reproduire
- L'impact potentiel

Vous recevrez une réponse sous 48h. Une fois le correctif déployé, la vulnérabilité sera divulguée publiquement via le Security Advisory.

## Modèle de sécurité — à lire avant d'exposer Bonap

**Bonap n'a pas d'authentification propre.** Toute personne qui peut atteindre l'URL de Bonap agit sur Mealie avec les droits du token configuré (lecture/écriture des recettes, du planning, des listes de courses…). Conséquences :

- **Ne jamais exposer Bonap sur Internet sans reverse-proxy authentifié** (Authelia, Authentik, oauth2-proxy, basic auth nginx/Caddy/Traefik, Cloudflare Access, Tailscale…). Sur un réseau local de confiance ou derrière l'ingress Home Assistant (qui exige une session HA), le risque est limité aux personnes qui ont déjà accès à ce réseau.
- Utilisez pour `VITE_MEALIE_TOKEN` un compte Mealie **dédié et non administrateur**.

### Ce qui est lisible par un visiteur

| Donnée | Exposée au navigateur ? | Détail |
|---|---|---|
| `VITE_MEALIE_TOKEN` (Docker / addon HA) | **Non** | nginx l'ajoute lui-même aux requêtes `/api` du front. Il n'est plus écrit dans `env-config.js`. Un visiteur peut *utiliser* Mealie via Bonap, mais ne peut pas *récupérer* le token. `BONAP_EXPOSE_MEALIE_TOKEN=true` rétablit l'ancien comportement (déconseillé). |
| `VITE_MEALIE_TOKEN` (build statique hors Docker) | **Oui** | Les appels partent directement du navigateur vers Mealie : le token est dans le bundle JS. |
| `LLM_API_KEY` (variable d'environnement / option addon) | **Oui** | Les appels IA partent du navigateur : la clé est servie en clair par `/env-config.js` à tout visiteur. Préférez la saisie dans **Paramètres → IA**, stockée dans le `localStorage` de chaque navigateur et jamais envoyée au serveur Bonap. |
| Clé API saisie dans Paramètres | Non (serveur) | Reste dans le `localStorage` du navigateur. Elle n'est **pas** synchronisée via `/api/bonap/settings` (le serveur la refuse et purge les fichiers existants). |

### Services côté serveur (BFF)

Le conteneur embarque un petit serveur Node (`ha-addon/bonap-bff.cjs`, exposé sous `/api/bonap/`) :

- **Import de recettes / proxy d'images** : ne joint que des adresses **publiques**. L'IP est vérifiée après résolution DNS, au moment de la connexion et à chaque redirection (protection SSRF / DNS rebinding). Seules des images raster sont relayées.
- **Proxy Ollama** : si `LLM_OLLAMA_URL` est défini, c'est la seule cible possible. Sinon, la cible choisie dans Paramètres doit être sur le réseau local (jamais link-local / métadonnées cloud), et seuls les endpoints Ollama (`/api/tags`, `/api/chat`…) sont relayés. `BONAP_DYNAMIC_OLLAMA_PROXY=false` désactive complètement la cible choisie par le navigateur.
- **Paramètres partagés** (`/data/bonap-settings.json`) : seules les clés de préférences connues sont acceptées (chaînes ≤ 16 Ko), jamais de secret.
