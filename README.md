# Bonap 🍽️

Front-end ergonomique pour [Mealie](https://mealie.io), gestionnaire de recettes self-hosted. Bonap se connecte à votre instance Mealie existante sans en modifier le backend.

## Prérequis

- Node.js 18+
- Une instance Mealie accessible sur le réseau
- Un token API Mealie (Mealie → Profil → API Tokens)

## Installation

```bash
git clone https://github.com/votre-user/bonap
cd bonap
npm install
```

## Configuration

Créez un fichier `.env` à la racine du projet :

```env
VITE_MEALIE_URL=http://192.168.1.21:9000
VITE_MEALIE_TOKEN=votre_token_api
```

> Le proxy Vite redirige automatiquement `/api/*` vers `VITE_MEALIE_URL` en développement, ce qui évite les problèmes CORS.

## Lancer en développement

```bash
npm run dev
```

L'application est disponible sur [http://localhost:5173](http://localhost:5173).

## Build de production

```bash
npm run build
npm run preview  # pour tester le build localement
```

Les fichiers de production sont générés dans `dist/`.

## Stack

| Outil | Rôle |
|---|---|
| React 18 + Vite | Framework & bundler |
| TypeScript (strict) | Typage statique |
| Tailwind CSS v4 | Styles utilitaires |
| shadcn/ui | Composants UI (Radix UI) |
| React Router v6 | Navigation |

## Fonctionnalités

- **Recettes** — liste avec recherche, filtres par catégorie / tag / temps, infinite scroll
- **Détail recette** — ingrédients, instructions, temps de préparation
- **Planning** — tableau semaine avec déjeuner et dîner, navigation jour par jour
  - Drag & drop pour déplacer les repas
  - Bouton "Restes" pour copier le repas du créneau précédent
  - Préchargement intelligent pour une navigation fluide
