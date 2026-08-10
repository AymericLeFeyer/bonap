# SDLC — Software Development Life Cycle — Bonap

**Projet** : Bonap — front-end React pour Mealie (recipes, planning, shopping, suggestions IA)
**Mode d'exécution** : solo + Claude Code + sous-agents IA spécialisés créés via `skill-creator` en local. **Pas d'équipe humaine.**
**Disponibilité déclarée** : ~8h/sem (variable)
Dernière mise à jour : 2026-08-10.

---

## 1. Contexte et principes directeurs

Bonap v1.0 est **déjà livré en production** (self-hosted via addon Home Assistant + image Docker). Le SDLC gouverne à la fois :
- la **maintenance corrective et évolutive légère** de v1.0,
- la **construction de v1.1** (i18n, PWA offline, PDF export, accessibilité, perfs, E2E coverage),
- la **préparation de v2.0** (multi-households, planning auto IA, nutrition, cookbooks, share, preferences).

**Principes directeurs** :

1. **Solo + IA** : tout le flux de travail est exécuté par l'utilisateur et Claude Code. Les revues de code, la planification, les rétrospectives sont assistées par des sous-agents IA dédiés créés via `skill-creator`. Aucune synchronisation humaine n'est requise pour avancer.
2. **Flux continu, pas de deadline rigide** : avec ~8h/sem, le goulot n'est pas le planning mais la disponibilité. On optimise pour **maximiser la vélocité par heure travaillée**, pas pour livrer à une date fixe.
3. **Trunk-based + branches courtes** : aucune branche longue durée. Une feature v1.1 vit max 2-3 sessions sur sa propre branche avant merge ou abandon.
4. **Qualité non négociable** : TypeScript strict, ESLint 9, tests unitaires Vitest, tests E2E Playwright. Le gating CI bloque tout merge qui casse un de ces seuils.
5. **Optimistic updates et DDD** : toute nouvelle feature suit l'architecture DDD en 5 couches décrite dans le PDL (entity → repository → use case → hook → page). Le skill `scaffold-ddd-feature` est obligatoire pour tout nouveau domaine.
6. **Pas de régression v1.0** : les features v1.1/v2.0 sont feature-flaggées dès qu'elles touchent au code v1.0 en production.

---

## 2. Choix de méthodologie : Kanban-solo avec sprints courts optionnels

### Comparaison des options envisagées

| Méthodologie | Adéquation solo 8h/sem | Points forts | Points faibles |
|---|---|---|---|
| Scrum-solo strict | Faible | Sprints timeboxés, rituels cadrés | Pression de sprint, standup solo absurde, vélocité volatile avec 8h/sem |
| Kanban-solo | **Retenu** | Flux continu, WIP limit, pas de deadline, absorbe la variabilité | Manque de rythme, risque de dispersion si pas de jalons |
| Waterfall léger | Faible | Phase par phase, prédictible | Inadapté au dev incrémental d'une app React, pas de feedback boucle courte |
| Shape-up adapté | Moyen | Cycles 6 semaines, pitches, bets | Cycle trop long pour 8h/sem (~48h de travail par cycle), lourd pour 1 projet |
| Hybride Kanban + sprints courts | **Retenu comme variante** | Apporte du rythme sans la pression Scrum | Nécessite de la discipline pour stopper un sprint à temps |

### Choix retenu : Kanban-solo avec sprints courts optionnels

**Pourquoi Kanban-solo** :
- Avec ~8h/sem, un sprint Scrum de 2 semaines représente ~16h de travail — suffisant pour livrer une feature v1.1 petite à moyenne, mais le timeboxing rigide génère plus de stress que de valeur.
- Le flux Kanban absorbe la variabilité : une session de 2h un mardi soir, une session de 5h un samedi matin, une semaine à 0h à cause d'imprévus — Kanban continue là où Scrum devrait reporter.
- Le WIP limit force à terminer avant de commencer, ce qui évite l'éparpillement classique du solo.

**Sprints courts optionnels comme rythme, pas comme contrainte** :
- Quand une feature v1.1 est suffisamment circonscrite (ex : "i18n de la page Recipes"), l'utilisateur peut décider de la traiter en **sprint court de 1 à 2 sessions** avec un objectif clair et un critère d'acceptation.
- Le sprint est optionnel, déclenché au cas par cas, sans rituel imposé.
- Pas de "vélocité" suivie dans le temps — on mesure le throughput (tickets merged par semaine glissante sur 4 semaines).

### Outil de suivi

- **GitHub Issues + Projects** (board Kanban) — colonnes : `Backlog`, `Ready` (DoR rempli), `In progress` (WIP limit = 2), `In review` (sous-agent IA), `Done` (DoD rempli + merged).
- Les tickets sont créés depuis `MVP-EXEC` (étape 5 du pipeline) sprint par sprint, puis affinés au fil de l'eau.
- Les tickets v1.1/v2.0 sont labellisés `v1.1` / `v2.0` + domaine (`recipes`, `planning`, `shopping`, `i18n`, `pwa`, `a11y`, `perfs`, `infra`).
- WIP limit = 2 : pas plus de 2 tickets `In progress` simultanément, sinon on en termine un avant d'en entamer un nouveau.

---

## 3. Rituels solo assistés par IA

Pas de standup, pas de daily — mais des rituels légers exécutés **à un rythme fixe** par des sous-agents IA ou directement par Claude Code.

| Ritel | Fréquence | Qui | Durée | Output |
|---|---|---|---|---|
| **Planification glissante** | Début de chaque session de dev | L'utilisateur avec Claude Code | 5-10 min | Choix du ticket `Ready` à entamer, mise à jour WIP |
| **Revue de code** | Avant chaque merge | Sous-agent IA `code-reviewer` (à créer) | 2-5 min | Rapport structuré (qualité, sécu, a11y, perfs, conventions) — bloquant si critique |
| **Rétrospective légère** | Fin de chaque ticket `Done` | Claude Code (prompt dédié) | 5 min | 1 entrée dans `docs/retro-{YYYY-MM}.md` : ce qui a marché, ce qui a coincé, ajustement du SDLC si besoin |
| **Revue de roadmap** | Mensuelle | L'utilisateur + `roadmap-creator` si ajustement | 15-30 min | Mise à jour de `docs/ROADMAP.md` si dates cibles glissent |
| **Audit de dette technique** | Trimestriel | Sous-agent IA `tech-debt-audit` (à créer) ou Claude Code | 30 min | Liste des modules à refactor, ajout au backlog |
| **Dependency review** | Mensuelle (auto via Dependabot) | GitHub Dependabot | 0 min | PRs Dependabot à merger ou à ignorer |

### Planification glissante — protocole

En début de session, l'utilisateur ouvre Claude Code et lance :
> "Planification glissante — montre-moi les tickets `Ready` ordonnés par priorité, et l'état du WIP."

Claude Code interroge GitHub MCP (`list_issues` avec label `Ready`), affiche les 2 tickets `In progress` et propose le suivant. L'utilisateur choisit ou ajuste.

### Revue de code par sous-agent IA `code-reviewer`

Avant chaque merge de PR, l'utilisateur invoque le skill `code-review` (à créer, voir section 10) qui :
1. Lit le diff de la PR.
2. Vérifie la checklist (voir section 5).
3. Produit un rapport markdown structuré.
4. Bloque le merge si **critique** (sécu, regression v1.0, casse les tests).
5. Sinon, propose des améliorations mineures non bloquantes.

Le sous-agent ne modifie jamais le code lui-même — il produit un rapport. L'utilisateur (ou Claude Code en nouvelle session) applique les corrections.

### Rétrospective légère — template

```
## Rétro — {ticket} — {date}

- Ce qui a marché :
- Ce qui a coincé :
- Ajustement SDLC proposé :
- Ajustement à reporter au prochain ticket :
```

Le rapport s'accumule dans `docs/retro-{YYYY-MM}.md` (un fichier par mois). Les ajustements SDLC proposés sont triés à la fin du mois ; 1 ou 2 ajustements sont appliqués sur ce SDLC.

---

## 4. Definition of Ready (DoR)

Un ticket ne peut passer en `Ready` que s'il satisfait **tous** les critères suivants. Le contrôle est fait par Claude Code à la création du ticket (depuis `MVP-EXEC`) ou à l'explicit ask de l'utilisateur.

### Critères DoR

| # | Critère | Détail |
|---|---|---|
| 1 | **Énoncé clair** | User story ou job story au format "En tant que X, je veux Y, afin de Z" OU description technique précise |
| 2 | **Critères d'acceptation** | Liste de bullets vérifiables (pas "ça marche" mais "le bouton X affiche Y quand Z") |
| 3 | **Périmètre DDD identifié** | Domaine cible (`recipe`, `planning`, `shopping`, `organizer`, ou nouveau domaine) + liste des couches touchées (entity / repo / use case / hook / page) |
| 4 | **Dépendances identifiées** | Tickets bloquants listés, MCP/skills nécessaires listés, APIs Mealie requises listées |
| 5 | **Tests requis précisés** | Quels tests unitaires (use case, service domaine), quels tests E2E (parcours critique), quels tests d'intégration (repo) |
| 6 | **Risque de régression v1.0 évalué** | Si le ticket touche au code v1.0 : feature flag requis + test E2E couvrant le parcours existant |
| 7 | **Taille estimée** | S, M, L — avec correspondance : S = 1 session (~2-4h), M = 2-3 sessions, L = 4+ sessions. Tout ticket L doit être découpé |
| 8 | **Label(s) et milestone** | Label domaine + label version (`v1.1`, `v2.0`) + milestone si jalonné |

### Anti-patterns DoR

- "Refactor global du planning" → trop vague, à découper.
- "Améliorer les perfs" → pas de critère d'acceptation mesurable (LCP cible < 2.5s ? bundle < 250 KB gzip ?).
- "Migrer vers Zustand" → pas dans le périmètre (le PDL exclus Zustand/Redux).

---

## 5. Definition of Done (DoD)

Un ticket passe en `Done` seulement si **tous** les critères suivants sont remplis. Le contrôle est fait par le sous-agent `code-reviewer` puis par l'utilisateur avant merge.

### Critères DoD — qualité code

| # | Critère | Vérification |
|---|---|---|
| 1 | **TypeScript strict sans erreur** | `npm run typecheck` (tsc -b --noEmit) passe |
| 2 | **ESLint 9 sans warning** | `npm run lint` (eslint .) passe avec 0 warning |
| 3 | **Prettier appliqué** | `npx prettier --check 'src/**/*.{ts,tsx}'` passe (ou `--write` exécuté) |
| 4 | **Pas de `any`** | TS strict + règle `@typescript-eslint/no-explicit-any` error |
| 5 | **Pas de console.log oublié** | Recherche `console.log` dans le diff, sauf dans `infrastructure/llm/` (debug LLM explicite) |
| 6 | **Conventions DDD respectées** | Imports depuis `container.ts`, pas de `new Repository()` direct dans un hook |

### Critères DoD — tests

| # | Critère | Détail |
|---|---|---|
| 7 | **Tests unitaires ajoutés pour toute nouvelle logique domaine** | Vitest : service domaine (`PlanningStatsService`), use cases, repositories (mock MealieApiClient) |
| 8 | **Coverage minimal sur les chemins critiques** | Use cases + repositories : 80% branches minimum |
| 9 | **Tests E2E pour les parcours critiques** | Playwright spec pour toute feature modifiant un parcours listé dans `e2e-test-gen` skill (add-recipe-to-planning, shopping-add-from-recipe, suggestions-add-to-planning, settings-switch-provider, theme-switch) |
| 10 | **Tests E2E existants toujours verts** | `npm run test:e2e` passe en CI |
| 11 | **Snapshot Playwright mis à jour si UI change** | Si snapshot modifié, capture visuelle approuvée par l'utilisateur |

### Critères DoD — accessibilité & perfs

| # | Critère | Détail |
|---|---|---|
| 12 | **Pas de regression a11y** | Toute nouvelle page / modal passe `@axe-core/playwright` sans violation critique |
| 13 | **Pas de regression perfs détectable** | Pas d'ajout de dépendance > 50 KB gzip sans justification + pas d'augmentation du bundle > 10% sans notice |
| 14 | **Lighthouse cibles respectées sur pages critiques** | LCP < 2.5s, CLS < 0.1, INP < 200ms sur `/recipes`, `/planning`, `/shopping` |

### Critères DoD — documentation & convention

| # | Critère | Détail |
|---|---|---|
| 15 | **CLAUDE.md mis à jour si changement structurel** | Nouveau domaine, nouvelle API, nouveau pattern, nouvelle commande — sinon pas besoin |
| 16 | **Convention de commits respectée** | Conventional commits (voir section 9) |
| 17 | **PR liée au ticket** | `Closes #N` dans le corps de PR |
| 18 | **Feature flag si v1.1/v2.0 touche v1.0** | Flag dans `LLMConfigService` ou `ThemeService` selon périmètre, désactivé par défaut |

### DoD abrégée — checklist de PR

Le sous-agent `code-reviewer` exécute cette checklist systématiquement :
```
[ ] typecheck OK
[ ] lint OK
[ ] tests unitaires passent + coverage OK
[ ] tests E2E passent
[ ] a11y: pas de regression axe-core
[ ] perfs: pas d'augmentation bundle > 10%
[ ] pas de console.log oublié
[ ] conventions DDD respectées
[ ] conventional commit respecté
[ ] feature flag si nécessaire
[ ] CLAUDE.md mis à jour si structure change
[ ] PR liée au ticket
```

---

## 6. Environnements et gating

### 6.1 Environnements

| Environnement | Cible | Usage | Source de vérité | Accès |
|---|---|---|---|---|
| **Local** | `http://localhost:5173` | Dev quotidien | `VITE_MEALIE_URL` local (instance Mealie dev) | L'utilisateur seulement |
| **Preview** | `npm run preview` (vite preview sur port 4173) | Vérification du build de prod avant push | Build local sur branche | L'utilisateur seulement |
| **CI** | GitHub Actions (ubuntu-latest) | Validation automatique sur PR | `.env` avec `fake-token-ci` + dev server ephemeral | GitHub only |
| **Prod** | Self-hosted (addon Home Assistant + image Docker multi-arch) | Utilisateurs finaux | Image `ghcr.io/aymericlefeyer/bonap` | Public via HA / Docker |

**Proxy Vite en local** :
- `/api/*` → `VITE_MEALIE_URL` (API Mealie)
- `/anthropic`, `/openai`, `/google-ai`, `/api/opencode`, `/api/opencode-go` → APIs LLM (contournement CORS dev)
- Ollama : pas de proxy (localhost:11434 direct)

En production, pas de proxy Vite — `VITE_MEALIE_URL` doit être directement accessible depuis le navigateur de l'utilisateur. Nginx (ou l'addon HA) gère le reverse-proxy et les en-têtes CORS si nécessaire.

### 6.2 Stratégie de gating

```
Local (dev)  ──push branche──▶  CI (lint + typecheck + unit + e2e + docker build)
                                     │
                                     ├── ❌ échec → bloque PR
                                     └── ✅ succès → PR mergeable
                                                │
                                                ▼
                                       Review par sous-agent IA `code-reviewer`
                                                │
                                                ├── ❌ critique → bloque merge
                                                └── ✅ succès → merge sur main
                                                                │
                                                                ▼
                                                    Workflow `release.yml` (tag + image multi-arch)
                                                                │
                                                                ▼
                                                    Image poussée sur ghcr.io
                                                                │
                                                                ▼
                                                    Mise à jour addon HA / pull Docker par l'utilisateur
```

### 6.3 Critères de passage entre environnements

| Transition | Critère bloquant | Critère informatif |
|---|---|---|
| Local → Preview | `npm run build` passe | `npm run preview` smoke test manuel (1 min) |
| Preview → CI (PR) | Branche pushée + PR ouverte | Aucun |
| CI → Merge | Lint + typecheck + unit + e2e + docker build OK | Code-reviewer IA sans critique |
| Merge → Release | Tests CI verts sur `main` | Tag de version bumpé (voir `release.yml`) |
| Release → Prod | Image `ghcr.io/aymericlefeyer/bonap:X.Y.Z` buildée et poussée | Smoke test post-deploy (l'utilisateur ouvre l'app) |

Aucun staging intermédiaire — le projet est en self-hosted solo, le staging serait disproportionné. Le smoke test post-deploy est fait par l'utilisateur sur son instance prod.

---

## 7. CI/CD — pipeline détaillé

### 7.1 CI existante (`.github/workflows/ci.yml`)

Le job CI tourne sur **PR vers `main`** et sur `workflow_dispatch`. Il contient 4 jobs parallèles :

| Job | Rôle | Durée typique |
|---|---|---|
| `check` | Lint (ESLint 9) + Typecheck (tsc -b --noEmit) + Build (vite build) | ~2 min |
| `unit` | Vitest run + upload coverage artifact | ~1 min |
| `e2e` | Install Playwright Chromium + start dev server + `npm run test:e2e` | ~4-6 min |
| `docker` | Build Docker image (no push) pour valider le Dockerfile | ~2 min |

**Concurrence** : `cancel-in-progress: true` sur la même branche → évite d'épuiser le quota GitHub Actions si l'utilisateur pousse plusieurs commits de suite.

### 7.2 Jobs CI à ajouter en v1.1

| Job | Rôle | Quand l'ajouter |
|---|---|---|
| `a11y` | Lancer `@axe-core/playwright` sur les pages critiques via Playwright | Dès que le skill `accessibility-audit` est créé |
| `lighthouse` | Lighthouse CI sur `/recipes`, `/planning`, `/shopping` (mobile + desktop), seuils LCP<2.5s, CLS<0.1, INP<200ms | Dès que le skill `performance-audit` est créé |
| `bundle-size` | Commenter la PR avec la taille du bundle (gzipped) + delta vs main | Dès que `vite-bundle-visualizer` est installé |

### 7.3 CD existant (`.github/workflows/release.yml` + `docker.yml` + `ha-addon.yaml` + `bff.yml`)

| Workflow | Rôle | Déclencheur |
|---|---|---|
| `release.yml` | Tag de version, build image multi-arch (amd64, arm64, armv7), push sur `ghcr.io/aymericlefeyer/bonap`, GitHub Release avec notes | Tag `v*.*.*` poussé sur main |
| `docker.yml` | Build Docker de validation | Push sur main (paths: Dockerfile) |
| `ha-addon.yaml` | Met à jour le repo addon HA avec la nouvelle version | Après `release.yml` succès |
| `bff.yml` | Build + push image du BFF TRMNL (si pertinent) | Push sur `bff/**` |
| `website.yml` | Build du site doc | Push sur `website/**` |

### 7.4 Stratégie de versioning

- **SemVer** : `MAJOR.MINOR.PATCH`
- v1.0.x : patchs de maintenance
- v1.1.x : features v1.1 + patchs
- v2.0.x : features v2.0 + patchs
- **Pas de pre-release automatique** — l'utilisateur tag manuellement quand il considère la version prête.
- Dependabot gère les montées de version des deps (groupé par `npm_and_yarn`).

---

## 8. Stratégie de branches et conventions de commits

### 8.1 Trunk-based avec branches courtes

```
main (toujours déployable, tests verts)
 ├── feat/i18n-recipes-page        (vie max 2-3 sessions)
 ├── fix/shopping-delete-trailing  (vie max 1 session)
 ├── chore/deps-bump-october       (Dependabot auto)
 └── refactor/planning-cache        (vie max 2-3 sessions)
```

**Règles** :

1. **Pas de branche longue durée**. Si une branche dépasse 3 sessions, la découper ou la merger en l'état (avec feature flag) ou l'abandonner.
2. **Pas de branche `develop`** — on merge directement sur `main`.
3. **Pas de branche `release/*`** — on tag directement sur `main`.
4. **Rebase au lieu de merge** pour éviter les commits de merge inutiles (`git pull --rebase` configuré par défaut).
5. **Branches auto-supprimées** après merge (option GitHub activée).
6. **Dependabot** ouvre ses propres PRs sur des branches `dependabot/npm_and_yarn/...` — mergées sans review humaine si CI vert (sauf changement majeur).

### 8.2 Conventional commits

Format : `<type>(<scope>): <subject>`

**Types** :
- `feat` : nouvelle feature (v1.1 / v2.0)
- `fix` : correction de bug
- `refactor` : refactor sans changement de comportement
- `perf` : amélioration de perfs
- `test` : ajout/modif de tests
- `docs` : doc seule (CLAUDE.md, README, /docs)
- `chore` : tâches diverses (deps, configs, CI)
- `style` : formatage uniquement
- `build` : système de build, dépendances
- `ci` : pipelines CI
- `revert` : revert d'un commit précédent

**Scopes** (alignés sur les domaines DDD) :
`recipe`, `planning`, `shopping`, `organizer`, `llm`, `theme`, `i18n`, `pwa`, `a11y`, `perfs`, `infra`, `ci`, `deps`, `ui`, `docs`.

**Exemples** :
- `feat(i18n): extract RecipesPage strings to fr.json`
- `fix(shopping): handle trailing & in DELETE items query`
- `refactor(planning): extract cache logic into usePlanningCache hook`
- `perf(recipes): lazy-load RecipeDetailModal`
- `test(planning): add E2E for add-meal-to-planning`
- `docs: update CLAUDE.md with new cookbooks domain`
- `chore(deps): bump react-router-dom to 7.13.1`
- `ci: add Lighthouse job to ci.yml`

**Règles** :
- Subject en minuscules, impératif, max 72 caractères.
- Body optionnel (pour expliquer le pourquoi, pas le comment).
- Footer `Closes #N` pour lier le ticket.
- `BREAKING CHANGE:` en footer si rupture — bump MAJOR au prochain release.
- Pas d'emoji, pas de point final.

### 8.3 Workflow type pour une feature v1.1

```bash
# 1. Créer la branche depuis main à jour
git checkout main && git pull --rebase
git checkout -b feat/i18n-recipes-page

# 2. Dev avec Claude Code (sessions courtes)
# 3. Commit atomiques avec conventional commits
git add ... && git commit -m "feat(i18n): extract RecipesPage strings"

# 4. Push + ouvrir PR
git push -u origin feat/i18n-recipes-page
gh pr create --title "feat(i18n): extract RecipesPage strings" --body "Closes #42"

# 5. CI tourne + sous-agent code-reviewer invoqué
# 6. Corriger si critique
# 7. Squash-merge sur main + delete branche
```

---

## 9. Revue de code par sous-agent IA dédié (`code-reviewer`)

Le sous-agent `code-reviewer` est créé via `skill-creator` (voir section 10, skill `code-review`). Il n'est pas un humain — c'est un skill Claude Code exécuté par l'utilisateur avant chaque merge.

### 9.1 Protocole d'invocation

Avant chaque merge de PR, l'utilisateur lance dans Claude Code :
> "Code review de la PR #N."

Le skill `code-review` exécute alors :
1. Récupère le diff via `gh pr diff N` ou `git diff main...HEAD`.
2. Lit les fichiers modifiés dans leur contexte (pas seulement le diff).
3. Applique la checklist ci-dessous.
4. Produit un rapport markdown structuré.
5. Classification : **Critique** (bloque merge), **Majeur** (à corriger avant merge mais non bloquant si justifié), **Mineur** (à traiter plus tard ou à ignorer).

### 9.2 Checklist de revue

**Qualité code** :
- [ ] TypeScript strict, pas de `any`, pas de `@ts-ignore`
- [ ] Pas de console.log oublié
- [ ] DDD respecté : imports depuis `container.ts`, pas de `new Repository()` direct
- [ ] Pas de logique métier dans les composants React (uniquement dans hooks/use cases)
- [ ] Optimistic updates pour les mutations toggle/delete (suivre `useShopping`)
- [ ] Gestion d'erreur explicite (try/catch dans use cases, toast/feedback dans pages)

**Sécurité** :
- [ ] Pas de secret en dur (tokens, clés API) — `VITE_MEALIE_TOKEN` via env
- [ ] Pas de HTML injecté sans sanitization (`dangerouslySetInnerHTML` interdit)
- [ ] Requêtes LLM : pas de prompt utilisateur non échappé passé tel quel
- [ ] Validation des inputs utilisateur (formes, longueurs)

**Accessibilité** :
- [ ] Tout champ form a un `<Label>` associé
- [ ] Tout bouton icon-only a un `aria-label`
- [ ] Toute modal piège le focus et le restaure à la fermeture (Radix Dialog gère ça, mais vérifier)
- [ ] Contrastes OK (cible 4.5:1 sur texte normal)
- [ ] Navigation clavier possible sur les composants custom (Autocomplete, RecipePicker)

**Performances** :
- [ ] Pas d'import barrel lucide-react (`import { X } from 'lucide-react'` est OK si tree-shaking fonctionne, sinon `lucide-react/dist/esm/icons/x`)
- [ ] Pages non critiques en `React.lazy` + Suspense
- [ ] Composants lourds (RecipeDetailModal, RecipeFormDialog) en dynamic import
- [ ] Pas de re-render inutile (useCallback, useMemo sur les fonctions passées en props)
- [ ] Pas de nouvelle instance d'objet/array en render (créer hors composant ou useMemo)

**Conventions projet** :
- [ ] Named exports partout (pas de default sauf `App.tsx` et `main.tsx`)
- [ ] Fichiers PascalCase pour composants, camelCase pour hooks/utils
- [ ] Use cases suffixés `UseCase`, repositories préfixés `I` pour les interfaces
- [ ] Commit message au format conventional

**Tests** :
- [ ] Tests unitaires couvrent les nouveaux use cases / services domaine
- [ ] Tests E2E pour les parcours critiques modifiés
- [ ] Pas de test marqué `.skip` sans justification
- [ ] Mock Mealie dans les tests E2E (pas d'instance réelle)

### 9.3 Rapport type produit par le sous-agent

```markdown
# Code Review — PR #N — feat(i18n): extract RecipesPage strings

## Verdict : ✅ Mergeable avec mineurs / ❌ Critique à corriger

## Critique (bloquant)
- [src/presentation/pages/RecipesPage.tsx:42] ...

## Majeur (à corriger avant merge)
- ...

## Mineur (à traiter plus tard)
- ...

## Détail par axe
- Qualité code : ...
- Sécurité : ...
- Accessibilité : ...
- Performances : ...
- Conventions : ...
- Tests : ...

## Recommandation
- [ ] Merge as-is (mineurs only)
- [ ] Corriger majeurs puis merge
- [ ] Corriger critique avant tout merge
```

---

## 10. Skills spécialisés à créer via `skill-creator`

> Skills IA à créer en local via `skill-creator` pour outiller l'exécution du SDLC. Les 7 skills du PDL sont repris ici, plus 3 skills spécifiques au cycle de dev (code-review, commit-helper, branch-naming) qui ne figurent pas dans le PDL car ils sont transverses au cycle de vie.

### 10.1 Skills issus du PDL (reproduits pour cohérence SDLC)

| Skill | Rôle SDLC | Origine |
|---|---|---|
| `scaffold-ddd-feature` | Scaffolding nouveau domaine DDD — utilisé à chaque création de domaine v1.1/v2.0 | PDL §11 |
| `e2e-test-gen` | Génération de tests Playwright pour les parcours critiques — exécuté à la fin de chaque ticket qui touche à un parcours critique | PDL §11 |
| `i18n-extract` | Extraction des chaînes JSX vers fichiers de traduction — exécuté à l'initialisation i18n v1.1 puis incrémentalement | PDL §11 |
| `accessibility-audit` | Audit WCAG AA via axe-core — exécuté en fin de ticket v1.1 a11y + sur les nouvelles pages | PDL §11 |
| `performance-audit` | Audit Lighthouse + bundle analyzer — exécuté après features v1.1 perfs | PDL §11 |
| `pwa-offline-setup` | Configuration vite-plugin-pwa + Workbox — exécuté une fois en début v1.1 | PDL §11 (nouveau v1.1) |
| `pdf-export-builder` | Templates PDF menu + liste — exécuté en v1.1 après PWA | PDL §11 (nouveau v1.1) |

`recipe-migration` (PDL §11 optionnel) est hors SDLC fréquent — utilisé ponctuellement pour migrations externes, pas dans le flux de dev continu. Conservé dans le PDL.

### 10.2 Skills spécifiques au cycle de dev (nouveaux, à créer en v1.1)

#### Skill : `code-review`

**Prompt à fournir à `skill-creator`** :

```
Utilise le skill skill-creator pour créer un skill nommé "code-review".

Description : Revue de code automatisée d'une PR Bonap par un sous-agent IA. À invoquer avant chaque merge de PR. Produit un rapport structuré (critique / majeur / mineur) sur 6 axes : qualité code, sécurité, accessibilité, performances, conventions projet, tests. Déclenche quand l'utilisateur dit "code review de la PR #N", "revoyons ce diff", "vérifie ma PR avant merge".

Processus attendu :
1. Récupérer le diff via `gh pr diff N` ou `git diff main...HEAD` (si pas de PR ouverte).
2. Lire chaque fichier modifié dans son contexte (pas seulement le diff).
3. Appliquer la checklist SDLC §9.2 (qualité, sécu, a11y, perfs, conventions, tests).
4. Classifier chaque finding : Critique (bloque merge) / Majeur (à corriger avant merge, non bloquant si justifié) / Mineur (à traiter plus tard).
5. Produire un rapport markdown structuré (verdict, critique, majeur, mineur, détail par axe, recommandation).
6. Ne jamais modifier le code — uniquement rapport.

allowed-tools : Read, Bash, Grep, Glob

Le skill doit inclure :
- references/checklist.md (la checklist SDLC §9.2 complète, ~30 items)
- references/severity-rubric.md (définition critique vs majeur vs mineur avec exemples)
- references/bonap-conventions.md (rappel des conventions DDD, nommage, container pattern)

Règles :
- Pas de modification de code par le skill — uniquement rapport.
- Tout finding critique doit citer le fichier + ligne + problème + suggestion concrète.
- Les mineurs peuvent être ignorés sans justification.
- Si le diff touche au code v1.0 en production, vérifier la présence d'un feature flag.

Sortie : rapport markdown affiché dans Claude Code + copie dans docs/reviews/pr-{N}-{date}.md.
```

#### Skill : `commit-helper`

**Prompt à fournir à `skill-creator`** :

```
Utilise le skill skill-creator pour créer un skill nommé "commit-helper".

Description : Aide à formuler des commit messages au format conventional commits Bonap. Déclenche quand l'utilisateur dit "commit ça", "formule mon commit", "que mettre comme message de commit".

Processus attendu :
1. Analyser `git diff --staged` (ou `git status` + `git diff` si rien staged).
2. Identifier le type (feat / fix / refactor / perf / test / docs / chore / style / build / ci / revert) à partir des fichiers modifiés et de la nature du changement.
3. Identifier le scope parmi : recipe, planning, shopping, organizer, llm, theme, i18n, pwa, a11y, perfs, infra, ci, deps, ui, docs.
4. Formuler le subject en minuscules, impératif, max 72 caractères, sans point final.
5. Ajouter un body si le pourquoi n'est pas évident depuis le subject.
6. Ajouter `Closes #N` si une PR/ticket est liée.
7. Ajouter `BREAKING CHANGE:` en footer si rupture détectée (suppression d'API, renommage de colonne, etc.).
8. Produire le commit message final + exécuter `git commit -m "..."` (avec HEREDOC pour multi-lignes).

allowed-tools : Bash, Read, Grep

Le skill doit inclure :
- references/types-scopes.md (liste exhaustive types + scopes Bonap avec exemples)
- references/anti-patterns.md (messages trop vagues, scope mal choisi, subject trop long, emoji interdit)

Règles :
- Pas d'emoji.
- Pas de point final.
- Subject impératif ("add" pas "added").
- Un seul type + un seul scope par commit (si mix, découper en plusieurs commits).
- Vérifier que le scope est dans la liste autorisée.

Sortie : commit créé avec message conventional + affichage du message appliqué.
```

#### Skill : `branch-naming`

**Prompt à fournir à `skill-creator`** :

```
Utilise le skill skill-creator pour créer un skill nommé "branch-naming".

Description : Aide à nommer et créer une branche Bonap au format trunk-based. Déclenche quand l'utilisateur dit "crée une branche pour [ticket]", "comment nommer ma branche pour [feature]".

Processus attendu :
1. Identifier le type de branche : feat / fix / refactor / perf / test / docs / chore / ci.
2. Identifier le scope (recipe, planning, shopping, organizer, llm, theme, i18n, pwa, a11y, perfs, infra, ci, deps, ui, docs).
3. Formuler un descriptif court en kebab-case (max 4-5 mots).
4. Construire le nom : `<type>/<scope>-<descriptif>` (ex : `feat/i18n-recipes-page`).
5. Vérifier que la branche n'existe pas déjà (`git branch -a | grep`).
6. Créer la branche depuis main à jour : `git checkout main && git pull --rebase && git checkout -b <nom>`.
7. Push initial : `git push -u origin <nom>`.

allowed-tools : Bash, Read

Le skill doit inclure :
- references/naming-patterns.md (modèles de noms par type + scope, exemples valides/invalides)
- references/lifecycle.md (vie max 3 sessions, rebase au lieu de merge, suppression auto après merge)

Règles :
- Pas de branche longue durée (> 3 sessions).
- Pas de branche `develop`, `release/*`, `staging`.
- Nom entièrement en minuscules, kebab-case.
- Vérifier que main est à jour avant création.

Sortie : branche créée et poussée, message de confirmation avec le nom appliqué.
```

#### Skill : `tech-debt-audit` (optionnel, trimestriel)

**Prompt à fournir à `skill-creator`** :

```
Utilise le skill skill-creator pour créer un skill nommé "tech-debt-audit".

Description : Audite la dette technique Bonap trimestriellement. Identifie les modules à refactor, les patterns à homogénéiser, les tests manquants, les dépendances obsolètes. Déclenque quand l'utilisateur dit "audite la dette technique", "qu'est-ce qui mérite un refactor".

Processus attendu :
1. Lister les modules avec complexité cyclomatique élevée (eslint complexity rule).
2. Identifier les fichiers > 300 lignes (god objects).
3. Identifier les hooks sans tests unitaires.
4. Identifier les use cases sans tests.
5. Lister les dépendances avec moins de 1 release/an (stagnantes) ou > 50 open issues (risque).
6. Vérifier les TODO/FIXME dans le code (`grep -rn 'TODO\|FIXME' src/`).
7. Produire un rapport prioritisé : dette critique (sécurité/stabilité), dette majeure (maintenance), dette mineure (cosmétique).

allowed-tools : Bash, Read, Grep, Glob

Le skill doit inclure :
- references/audit-rubric.md (seuils : complexité > 10, fichier > 300 lignes, hook/use case sans test)
- references/prioritization.md (comment classer dette critique vs majeure vs mineure)

Règles :
- Ne jamais modifier le code — uniquement rapport.
- Tout finding inclut une proposition d'action (refactor, ajout test, suppression, montée de version).
- Le rapport se cumule dans docs/tech-debt-{YYYY-QN}.md.

Sortie : docs/tech-debt-{YYYY-QN}.md avec liste priorisée + tickets GitHub créés pour les critiques.
```

### 10.3 Récapitulatif des skills à créer

| Skill | Fréquence d'usage | Priorité création | Source |
|---|---|---|---|
| `scaffold-ddd-feature` | À chaque nouveau domaine v1.1/v2.0 | Haute (début v1.1) | PDL §11 |
| `e2e-test-gen` | À chaque ticket touchant un parcours critique | Haute (début v1.1) | PDL §11 |
| `code-review` | À chaque PR (avant merge) | **Haute (immédiate)** | SDLC §10.2 |
| `commit-helper` | À chaque commit | **Haute (immédiate)** | SDLC §10.2 |
| `branch-naming` | À chaque nouvelle branche | **Haute (immédiate)** | SDLC §10.2 |
| `i18n-extract` | Une fois en début v1.1 + incrémental | Moyenne (début v1.1) | PDL §11 |
| `accessibility-audit` | Fin de ticket a11y + nouvelles pages | Moyenne (v1.1) | PDL §11 |
| `performance-audit` | Après features v1.1 perfs | Moyenne (v1.1) | PDL §11 |
| `pwa-offline-setup` | Une fois en début v1.1 | Moyenne (v1.1) | PDL §11 |
| `pdf-export-builder` | En v1.1 après PWA | Basse (v1.1 tardif) | PDL §11 |
| `tech-debt-audit` | Trimestriel | Basse (v1.1 tardif) | SDLC §10.2 |

**Priorité immédiate** (dès le démarrage de l'exécution v1.1) : `code-review`, `commit-helper`, `branch-naming`, `scaffold-ddd-feature`, `e2e-test-gen`.

---

## 11. MCP spécialisés à créer / installer

> MCP custom à développer + MCP existants à installer pour outiller Claude Code sur ce SDLC. Identifiés dans le MVP-SCOPE §14 et le PDL §12 — rappel avec focus cycle de dev.

### 11.1 MCP custom à développer

| MCP custom | Usage SDLC | Origine |
|---|---|---|
| `mealie-api` | Debug + tests + analyse de données Mealie pendant le dev — expose l'API Mealie à Claude Code | MVP-SCOPE §14, PDL §12 |
| `bonap-pdf` | Debug des templates PDF pendant la v1.1 PDF export | PDL §12 (nouveau v1.1) |
| `bonap-nutrition` | Wrapper base nutrition (Open Food Facts) pour dev v2.0 | PDL §12 (nouveau v2.0) |

### 11.2 MCP existants à installer — focus SDLC

| MCP | Commande | Usage SDLC |
|---|---|---|
| **Playwright MCP** | `claude mcp add playwright -- npx -y @playwright/mcp-server` | Génération + exécution de tests E2E depuis Claude Code pendant le dev ; captures visuelles pour a11y |
| **Context7 MCP** | `claude mcp add context7 -- npx -y @upstash/context7-mcp` | Doc libs à jour (React 19, Radix, Vite 8, Tailwind v4, React Router v7, Workbox, i18next, pdf-lib, axe-core) pendant implémentation |
| **GitHub MCP** | `claude mcp add github -- npx -y @modelcontextprotocol/server-github` | Lecture/création de PRs, issues, reviews — utilisé par le skill `code-review` pour `gh pr diff` |
| **Filesystem MCP** | `claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem /home/zephus/Projets/bonap` | Accès fichiers étendu pour les skills de revue/audit |
| **Sentry MCP** (v1.1+) | `claude mcp add sentry -- npx -y @sentry/mcp-server` | Observabilité prod — détecte les regressions v1.0 post-deploy |
| **Sequential Thinking MCP** | `claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking` | Raisonnement structuré pour planification glissante, refactoring multi-households, planning auto IA v2.0 |

---

## 12. Stratégie de tests

### 12.1 Pyramide de tests

```
            ┌─────────┐
            │  E2E    │  Playwright — parcours critiques (~15-20 specs)
            │ (lent)  │  CI: ~4-6 min
            └─────────┘
       ┌──────────────────┐
       │  Intégration     │  Vitest — repositories avec mock MealieApiClient
       │  (moyen)         │  CI: ~30s
       └──────────────────┘
   ┌──────────────────────────┐
   │  Unit                    │  Vitest — use cases, services domaine, utils
   │  (rapide)                │  CI: ~10s
   └──────────────────────────┘
```

### 12.2 Coverage cibles

| Périmètre | Cible | Actuel |
|---|---|---|
| `src/shared/utils/` | 100% branches | Couvert (4 fichiers test) |
| `src/domain/*/services/` | 90% branches | `PlanningStatsService` testé |
| `src/application/*/usecases/` | 80% branches | `AddRecipesToListUseCase` testé, reste à couvrir |
| `src/infrastructure/mealie/repositories/` | 70% branches | `ShoppingRepository` + `RecipeRepository` testés |
| `src/presentation/hooks/` | 50% (via E2E principalement) | Non couvert directement |

### 12.3 Règles de test

- **Unit** : tout nouveau use case + tout nouveau service domaine a un test Vitest obligatoire.
- **Intégration** : tout nouveau repository a un test Vitest avec mock `MealieApiClient`.
- **E2E** : toute feature modifiant un parcours critique (listés dans `e2e-test-gen` skill) a un test Playwright généré par le skill.
- **Pas de test E2E sur instance Mealie réelle** — mocker via MSW ou `page.route`.
- **Snapshots visuels** : utilisés avec parcimonie (uniquement pour éviter les regressions UI critiques), validés par l'utilisateur avant update.
- **Pas de `test.skip` sans justification** — un test skip doit avoir un `// TODO: ...` ou être supprimé.

### 12.4 Commandes test

```bash
npm test                # Vitest run (unit + integration)
npm run test:watch      # Vitest watch pendant dev
npm run test:coverage   # Vitest + coverage report
npm run test:e2e        # Playwright run (toutes les specs)
npm run test:e2e:ui     # Playwright UI mode (debug interactif)
npm run test:e2e:report # Ouvrir le rapport HTML Playwright
```

---

## 13. Gestion des dépendances

### 13.1 Mises à jour Dependabot

- Configuré sur `npm_and_yarn` (groupé pour éviter 1 PR par dep).
- PRs Dependabot mergées si :
  - CI vert (lint + typecheck + tests),
  - Pas de changement majeur dans une dep critique (React, Radix, Vite, Tailwind) — auquel cas review manuelle + smoke test.
  - Pas de `BREAKING CHANGE` dans la release notes.
- Pas de review par sous-agent IA sur les Dependabot (trop de bruit) — uniquement vérification CI.

### 13.2 Ajout de nouvelle dépendance

Avant d'ajouter une dep npm, vérifier :
1. **Taille** : `npm pack <dep> --dry-run` pour estimer l'impact bundle. Si > 50 KB gzip, justifier dans le commit.
2. **Maintenance** : dernière release < 6 mois, > 100 stars GitHub, pas de dépendances à risque.
3. **Alternative** : pas de dep standard équivalente déjà dans `package.json` ?
4. **License** : MIT, Apache-2.0, BSD — éviter GPL pour une app self-hosted.

Le sous-agent `code-review` vérifie ces critères si le diff de PR contient une nouvelle dep dans `package.json`.

### 13.3 Dépendances à ajouter en v1.1 (issues du PDL)

- `i18next` + `react-i18next` — i18n
- `vite-plugin-pwa` + `workbox-*` — PWA offline
- `pdf-lib` ou `@react-pdf/renderer` — PDF export
- `@axe-core/playwright` — a11y tests
- `vite-bundle-visualizer` — analyse bundle
- `@lhci/cli` — Lighthouse CI

---

## 14. Gestion des risques et rollback

### 14.1 Risques identifiés

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Régression v1.0 en production | Moyenne | Élevé (utilisateurs bloqués) | Feature flags + tests E2E couvrent v1.0 + rollback Docker image en 1 commande |
| Dependabot casse le build | Faible | Faible | CI bloque, PR Dependabot non mergée si rouge |
| Bundle explose (deps lourdes) | Moyenne | Moyen (LCP dégradé) | Skill `performance-audit` + job Lighthouse CI + check bundle-size sur PR |
| Test E2E flaky | Élevée | Faible (CI rouge intermittent) | Retry policy Playwright + identifier + fix ou skip avec justification |
| Token Mealie leak dans git | Faible | Critique (sécurité) | Token en `.env` (gitignored), jamais en dur ; `git-secrets` ou `trufflehog` en pre-commit (à installer si besoin) |
| Branche longue durée génère des conflits | Moyenne | Faible (perte de temps) | Trunk-based + règle vie max 3 sessions + rebase systématique |

### 14.2 Rollback production

En cas de regression v1.0 détectée post-deploy :
1. Re-pull l'image précédente : `docker pull ghcr.io/aymericlefeyer/bonap:X.Y.Z-1` (ou HA addon manager).
2. Redémarrer le container / addon.
3. Ouvrir une PR `revert: ...` avec conventional commit.
4. Rétro-porter le fix en v1.0.x puis re-release.

Le rollback est rapide (< 5 min) car le déploiement est Docker-based, pas de migration DB à reverser (Mealie gère son propre schéma).

---

## 15. Métriques de santé projet

| Métrique | Outil | Fréquence | Cible |
|---|---|---|---|
| Throughput (tickets Done/sem glissante 4 sem) | GitHub Project | Hebdo | 1-3 tickets/sem |
| Cycle time (Ready → Done) | GitHub Project | Hebdo | < 7 jours pour S, < 14 pour M |
| % tests verts en CI | GitHub Actions | Quotidien | 100% sur main |
| Coverage branches | Vitest coverage | À chaque PR | > 70% sur use cases + services |
| Bundle size (gzip) | `vite-bundle-visualizer` | À chaque PR | < 250 KB (app) / alerte si > +10% |
| Lighthouse LCP/CLS/INP | Lighthouse CI | À chaque PR | LCP<2.5s, CLS<0.1, INP<200ms |
| Violations axe-core | `@axe-core/playwright` | À chaque PR | 0 critique, 0 majeur |
| PRs Dependabot ouvertes | GitHub | Hebdo | < 5 (merger ou fermer) |
| Dette technique (TODO/FIXME) | `grep -rn` | Trimestriel | Ne pas augmenter |

Ces métriques sont **consultatives** — pas d'alerte automatique, pas de SLA. Avec 8h/sem, l'objectif est la régularité (avancer chaque session) plutôt que la performance brute.

---

## 16. Écho de vérification

### Réponses aux questions clefs du SDLC

1. **Méthodologie choisie** : Kanban-solo avec sprints courts optionnels. Justification : ~8h/sem, variabilité haute, flux continu préférable à des timeboxes rigides.
2. **Rituels solo** : planification glissante (début session), code-review IA (avant merge), rétro légère (fin ticket), revue roadmap mensuelle, audit dette tech trimestriel.
3. **DoR** : 8 critères incluant énoncé clair, critères d'acceptation, périmètre DDD, dépendances, tests requis, risque régression, taille S/M/L, labels.
4. **DoD** : 18 critères répartis en qualité code (6), tests (5), a11y & perfs (3), doc & conventions (4). Checklist exécutée par le sous-agent `code-review` avant chaque merge.
5. **Environnements** : Local (dev Vite proxy), Preview (vite preview), CI (GitHub Actions ephemeral), Prod (self-hosted Docker multi-arch + addon HA).
6. **Gating** : Local → push branche → CI (lint+typecheck+unit+e2e+docker) → code-review IA → merge main → release.yml tag → image ghcr → pull par utilisateur.
7. **CI/CD** : 4 jobs CI existants (check, unit, e2e, docker). À ajouter en v1.1 : a11y, lighthouse, bundle-size. CD existant via release.yml + ha-addon.yaml.
8. **Branches** : trunk-based, branches courtes (< 3 sessions), pas de `develop` ni `release/*`, rebase au lieu de merge, suppression auto post-merge.
9. **Commits** : conventional commits avec scopes alignés sur domaines DDD (recipe, planning, shopping, organizer, llm, theme, i18n, pwa, a11y, perfs, infra, ci, deps, ui, docs).
10. **Code review** : par sous-agent IA dédié créé via `skill-creator` (skill `code-review`), 30 items de checklist sur 6 axes, classification critique/majeur/mineur, ne modifie jamais le code.
11. **Skills à créer** : 7 du PDL (scaffold-ddd-feature, e2e-test-gen, i18n-extract, accessibility-audit, performance-audit, pwa-offline-setup, pdf-export-builder) + 3 nouveaux SDLC (code-review, commit-helper, branch-naming) + 1 optionnel (tech-debt-audit) = 11 skills.
12. **MCP** : 3 custom à développer (mealie-api, bonap-pdf, bonap-nutrition) + 6 existants à installer (Playwright, Context7, GitHub, Filesystem, Sentry, Sequential Thinking).
13. **Tests** : Vitest (unit + integration), Playwright (E2E), axe-core (a11y), Lighthouse (perfs). Coverage cible 70-100% selon périmètre.
14. **Risques** : 6 risques identifiés avec mitigations (régression v1.0 via feature flags + rollback, token leak via .env gitignored, etc.).
15. **Rollback** : < 5 min via Docker image précédente, pas de migration DB à reverser.
16. **Métriques** : 9 métriques consultatives (throughput, cycle time, coverage, bundle size, Lighthouse, axe, Dependabot, dette tech).

### Cohérence avec les autres livrables

- **MVP-SCOPE** : le SDLC couvre le cycle de dev pour v1.1 et v2.0 (features déjà cadrées dans MVP-SCOPE §5). Les skills listés reprennent ceux du MVP-SCOPE §13 + 3 nouveaux.
- **PDL** : le SDLC respecte l'architecture DDD en 5 couches (PDL §2.3) via la règle "imports depuis `container.ts`". Les skills du PDL §11 sont repris ici avec leur rôle SDLC.
- **ROADMAP** (à produire) : la méthodologie Kanban-solo absorbe la variabilité de 8h/sem ; les jalons v1.1/v2.0 seront des cibles glissantes, pas des deadlines.
- **MVP-EXEC** (à produire) : les tickets seront créés avec DoR/DoD du SDLC §4-5, labellisés par domaine + version, et exécutés sprint par sprint (sprint court optionnel).

### Présupposition fondamentale respectée

**Exécution exclusivement solo + Claude Code + sous-agents IA spécialisés créés via skill-creator en local. Pas d'équipe humaine.** Tous les rituels (revue de code, rétrospective, planification, audit) sont exécutés par l'utilisateur avec l'assistance de Claude Code et des sous-agents IA. Aucune synchronisation humaine n'est requise pour avancer.