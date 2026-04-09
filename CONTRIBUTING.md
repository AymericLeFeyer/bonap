# Contributing to Bonap

Merci de vouloir contribuer à Bonap ! Ce document explique comment participer au projet.

## Prérequis

- Une instance [Mealie](https://mealie.io) fonctionnelle (v1.x+)
- Node.js 18+
- Git

## Mise en place de l'environnement de développement

```bash
git clone https://github.com/AymericLeFeyer/bonap.git
cd bonap
npm install
cp .env.example .env
# Remplir VITE_MEALIE_URL et VITE_MEALIE_TOKEN dans .env
npm run dev
```

## Workflow de contribution

1. **Fork** le dépôt
2. **Créer une branche** depuis `main` :
   - `feat/<sujet>` pour une nouvelle fonctionnalité
   - `fix/<sujet>` pour un correctif
   - `chore/<sujet>` pour de la maintenance (deps, config, CI...)
   - `docs/<sujet>` pour de la documentation
3. **Développer et tester** localement
4. **Ouvrir une Pull Request** vers `main` avec une description claire

> Ne jamais pusher directement sur `main`.

## Standards de code

- **TypeScript strict** — pas de `any`, pas de `// @ts-ignore`
- **Architecture DDD** — respecter la séparation domain / application / infrastructure / presentation (voir `CLAUDE.md` pour le détail)
- **Pas de store global** — useState + hooks custom uniquement
- **shadcn/ui + Tailwind** — pas d'autre design system, pas de CSS séparé
- **Linting** : `npm run lint` doit passer sans erreur avant chaque PR

## Tests

Des tests end-to-end Playwright couvrent les flux critiques (shopping, planning) :

```bash
# Démarrer le serveur de dev d'abord
npm run dev

# Puis dans un autre terminal
npx playwright test
```

## Proposer une fonctionnalité

Ouvrez d'abord une [Discussion](https://github.com/AymericLeFeyer/bonap/discussions) ou une [Issue](https://github.com/AymericLeFeyer/bonap/issues) avant de commencer à coder, pour valider l'idée avec les mainteneurs.

## Signaler un bug

Utilisez le template d'issue **Bug report**. Incluez :
- La version de Bonap (tag ou commit)
- La version de Mealie
- Les étapes pour reproduire
- Le comportement attendu vs observé

## Code de conduite

Ce projet suit le [Contributor Covenant](CODE_OF_CONDUCT.md). Soyez respectueux.
