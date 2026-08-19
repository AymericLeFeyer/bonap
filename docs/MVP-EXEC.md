# MVP-EXEC — Bonap

> Plan d'exécution généré le 2026-08-10 par croisement SDLC × Roadmap × PDL (étape 5/6 du pipeline orchestrateur-dev).
> Document de planification. Ne contient pas de code — pour l'exécution, voir les tickets ci-dessous.
> Présupposition d'exécution : solo + Claude Code + sous-agents IA spécialisés créés via `skill-creator` en local. Pas d'équipe humaine.
> Disponibilité déclarée : ~8h/sem, variable / irrégulier.

---

## 1. Référence des inputs

- **SDLC** : `/home/zephus/Projets/bonap/docs/SDLC.md` — méthodologie Kanban-solo + sprints courts optionnels, DoR §4, DoD §5, environnements §6, gating §6.2, CI/CD §7, branches/commits §8, skills §10, MCP §11.
- **Roadmap** : `/home/zephus/Projets/bonap/docs/ROADMAP.md` — 2 versions (v1.1 cible 2027-01-15, v2.0 cible 2027-06-30), releases intermédiaires alpha/beta/RC/prod, 9 dépendances inter-versions §4.
- **PDL** : `/home/zephus/Projets/bonap/docs/PDL.md` — architecture DDD 5 couches, modules par domaine, séquencement v1.1 §8.2, séquencement v2.0 §8.3, contrats d'interface repositories §7, dépendances techniques.
- **MVP-SCOPE** : `/home/zephus/Projets/bonap/docs/MVP-SCOPE.md` — contexte additionnel (fonctionnalités v1.0 livrées, hors périmètre H1-H12, jalons J7-J17, critères de succès §11).

---

## 2. Synthèse de la méthodologie (SDLC)

- **Type de cycle** : Kanban-solo avec sprints courts optionnels (1 à 2 sessions par sprint court, déclenchés au cas par cas pour les features suffisamment circonscrites).
- **Durée du sprint** : pas de sprint timebox rigide. Sprints courts optionnels = 1 à 2 sessions (~2 à 8h). WIP limit = 2 (pas plus de 2 tickets `In progress` simultanément).
- **Rituels** : planification glissante (début session, 5-10 min), revue de code par sous-agent `code-review` (avant merge, bloquant si critique), rétrospective légère (fin ticket, 5 min), revue roadmap mensuelle, audit dette tech trimestriel.
- **Definition of Ready (DoR)** — 8 critères :
  1. Énoncé clair (user story ou description technique précise)
  2. Critères d'acceptation vérifiables (bullets, pas "ça marche")
  3. Périmètre DDD identifié (domaine cible + couches touchées)
  4. Dépendances identifiées (tickets bloquants, MCP/skills, APIs Mealie)
  5. Tests requis précisés (unit, E2E, intégration)
  6. Risque de régression v1.0 évalué (feature flag si code v1.0 touché)
  7. Taille estimée S/M/L (S=1 session ~2-4h, M=2-3 sessions, L=4+ sessions, L doit être découpé)
  8. Labels et milestone (domaine + version `v1.1`/`v2.0`)
- **Definition of Done (DoD)** — 18 critères :
  - Qualité code (6) : typecheck, lint 0 warning, prettier, pas de `any`, pas de console.log oublié, conventions DDD (imports depuis `container.ts`)
  - Tests (5) : unitaires pour nouvelle logique domaine, coverage 80% branches use cases + repos, E2E pour parcours critiques, E2E existants verts, snapshots à jour
  - A11y & perfs (3) : pas de regression axe-core, pas d'augmentation bundle > 10%, Lighthouse LCP<2.5s / CLS<0.1 / INP<200ms sur `/recipes`, `/planning`, `/shopping`
  - Doc & conventions (4) : CLAUDE.md mis à jour si structure change, conventional commit, PR liée au ticket (`Closes #N`), feature flag si v1.1/v2.0 touche v1.0
- **Environnements** : Local (dev Vite proxy), Preview (`vite preview` port 4173), CI (GitHub Actions ephemeral), Prod (self-hosted Docker multi-arch + addon HA).
- **Gating** : Local → push branche → CI (lint + typecheck + unit + e2e + docker build) → code-review IA → merge main → release.yml (tag) → image ghcr → pull par utilisateur. Pas de staging.
- **Critères de qualité** : TypeScript strict, ESLint 9, Vitest (unit + intégration), Playwright (E2E), axe-core (a11y), Lighthouse (perfs). Coverage 70-100% selon périmètre.

---

## 3. Synthèse de la roadmap

| Version | Date cible (jalon indicatif) | Fonctionnalités attendues |
|---------|------------------------------|---------------------------|
| v1.0 | (livrée — patches v1.0.x en parallèle) | 12 must-have MVP-SCOPE §5 (recipes, planning, shopping, stats, suggestions IA, assistant IA, 9 providers LLM, thème, saisons) |
| v1.1 | prod 2027-01-15 (alpha 2026-11-15, beta 2026-12-15, RC 2027-01-05) | V11-1 Tests E2E, V11-2 A11y WCAG AA, V11-3 i18n FR+EN, V11-4 PWA offline, V11-5 Import URL, V11-6 Export PDF, V11-7 Perfs |
| v2.0 | prod 2027-06-30 (alpha 2027-03-15, beta 2027-04-30, RC 2027-06-15) | V20-1 Planning auto IA, V20-2 Nutrition, V20-3 Multi-households, V20-4 Partage public, V20-5 Cookbook |

**Dépendances inter-versions** (9 — cross-référence roadmap §4) :

1. v1.1 → v1.0 (v1.1 étend le code v1.0 — tests E2E protègent v1.0)
2. v2.0 → v1.1 (v2.0 dépend des fondations v1.1 : E2E, i18n, PWA, a11y, perfs)
3. V20-1 (planning IA) → V11-1 (tests E2E) — tests E2E doivent couvrir add-recipe-to-planning avant d'introduire la génération IA
4. V20-2 (nutrition) → V20-1 (planning IA) — agrégation nutrition semaine s'appuie sur le `PlannedWeek` généré
5. V20-3 (multi-households) → V11-3 (i18n) — labels households/invitations traduits
6. V20-3 (multi-households) → V11-1 (tests E2E) — tests protègent parcours single-household
7. V20-4 (partage) → V20-3 (multi-households) — partage respecte le scope household (optionnel — peut venir avant)
8. V20-5 (cookbook) → V11-6 (export PDF) — cookbook peut réutiliser la techno PDF
9. v2.0 → v1.1 (skills SDLC code-review/commit-helper/branch-naming opérationnels avant v2.0)
10. v2.0-alpha → v1.1-prod (v2.0 démarre après v1.1 stabilisée 2 sem)

**Releases intermédiaires** : chaque version a alpha → beta → RC → prod (4 jalons par version).

---

## 4. Synthèse du PDL

### Modules techniques

| Module | Responsabilités | Dépend vers | Intégrations externes |
|--------|-----------------|-------------|------------------------|
| `shared/types` | Types Mealie, LLM, errors | — | — |
| `shared/utils` | date, duration, food, season | — | — |
| `infrastructure/mealie/api` | MealieApiClient (HTTP, SSE) | shared/types | Mealie API (Bearer) |
| `domain/recipe` | IRecipeRepository | organizer (resolveIngredients) | — |
| `domain/planning` | IPlanningRepository, PlanningStatsService | recipe (stats) | — |
| `domain/shopping` | IShoppingRepository, ShoppingItem entité | recipe (AddRecipesToList), organizer (FoodLabelStore) | — |
| `domain/organizer` | IFood/IUnit/ICategory/ITagRepository | — | — |
| `infrastructure/llm` | AssistantService (streaming+tools), LLMService (single-turn), LLMConfigService | application/usecases (tool use) | 9 providers LLM (Anthropic, OpenAI, Google, Mistral, Perplexity, OpenRouter, OpenCode Zen, OpenCode Go, Ollama) |
| `infrastructure/theme` | ThemeService (light/dark/system + accent oklch) | — | localStorage |
| `infrastructure/shopping` | FoodLabelStore, RecipeSlugStore | shared/utils/food | localStorage |
| `presentation/components` | Layout, Sidebar, AssistantDrawer, modals | hooks, container | — |
| `presentation/hooks` | useRecipes, usePlanning, useShopping, useAssistant, useTheme… | application/usecases via container | — |
| `presentation/pages` | RecipesPage, PlanningPage, ShoppingPage, StatsPage, SuggestionsPage, SettingsPage | hooks | — |
| **v1.1 (nouveaux)** | | | |
| `infrastructure/i18n` | II18nService (i18next + react-i18next) | — | localStorage `bonap_locale` |
| `infrastructure/pwa` | vite-plugin-pwa, Workbox, IndexedDB queue | — | Service Worker, Cache API |
| `infrastructure/pdf` | IPdfExportService (pdf-lib ou @react-pdf/renderer) | i18n (labels traduits) | — |
| **v2.0 (nouveaux)** | | | |
| `domain/planning` (extension) | IPlanningGeneratorService, IPreferencesRepository, PlannedWeek | recipe, assistant (LLM) | LLM (Anthropic tool use + fallback) |
| `domain/nutrition` | INutritionService, NutritionInfo | recipe, planning | Open Food Facts API (ou base locale) |
| `domain/household` | IHouseholdRepository, Household | planning, shopping (householdContext mutable) | Mealie households |
| `domain/share` | IShareRepository, ShareLink | recipe | Mealie share endpoints |
| `domain/cookbook` | ICookbookRepository, Cookbook | recipe | Mealie cookbooks |

### Séquencement recommandé par le PDL

**v1.1** (PDL §8.2) :
1. Tests E2E Playwright — couvrent v1.0 avant features
2. Accessibilité WCAG AA — corrections transverses
3. i18n extraction + FR de base + EN placeholder — avant PWA pour chaînes offline traduites
4. PWA / offline — vite-plugin-pwa + Workbox + IndexedDB queue
5. Import URL — extension `IRecipeRepository.scrapeUrl`
6. Export PDF — `IPdfExportService` + pdf-lib
7. Audit perfs — Lighthouse + bundle analyzer + lazy load

**v2.0** (PDL §8.3) :
1. Planning auto IA — `IPlanningGeneratorService` + prompt structurant + validation user
2. Nutrition — `INutritionService` + Open Food Facts + agrégation semaine
3. Multi-households — `IHouseholdRepository` + householdContext mutable
4. Partage public — `IShareRepository` + page publique `/shared/:token`
5. Cookbook — `ICookbookRepository` + page `/cookbooks`

### Points d'intégration critiques

- **Joint `planning`↔`assistant` (v2.0 V20-1)** : `IPlanningGeneratorService` consomme `AssistantService` (tool use Anthropic) ou `LLMService` (single-turn fallback). Contrat : prompt structurant → JSON Schema → validation `recipeId` via `GetRecipesByIdsUseCase` → brouillon `PlannedWeek` validé par user avant POST.
- **Joint `household`↔`planning`+`shopping` (v2.0 V20-3)** : `householdContext` mutable dans `container.ts`, consulté par tous les repos à chaque appel. Feature flag `multiHouseholdsEnabled` désactivé par défaut. Valeur par défaut = household courant (comportement identique à v1.0).
- **Joint `share`↔`recipe` (v2.0 V20-4)** : Page publique `/shared/:token` non-authentifiée n'expose que les champs publics `MealieRecipe` (name, description, image, recipeIngredient, recipeInstructions, recipeCategory, tags, prepTime, performTime) — pas le token, pas les extras, pas les households. Revue `code-review` obligatoire.
- **Joint `i18n`↔`pwa`+`pdf` (v1.1)** : i18n en place avant PWA (chaînes offline traduites) et avant PDF (labels traduits dans les templates).

### Stack technique (extraite du PDL)

- Frontend : React 19.2 + TypeScript 6.0 strict + Vite 8 + Tailwind CSS v4 + React Router v7 + shadcn/ui (Radix UI) + lucide-react + react-markdown
- Backend : aucun (Mealie imposé, exposé via 19 endpoints API REST)
- Hébergement : self-hosted (addon Home Assistant + image Docker multi-arch `ghcr.io/aymericlefeyer/bonap`)
- Base de données : aucune côté Bonap (toutes les données dans Mealie) + localStorage (4 clés v1.0 + 2 clés v1.1/v2.0)
- State management : pas de Redux/Zustand/React Query — `useState`/`useCallback`/`useRef` dans hooks custom + container singleton
- Tests : Vitest (unit + intégration) + Playwright (E2E) + axe-core (a11y) + Lighthouse (perfs)

---

## 5. Croisement versions × modules

| Fonctionnalité (roadmap) | Version | Module(s) PDL concerné(s) | Remarque |
|--------------------------|---------|---------------------------|----------|
| V11-1 Tests E2E parcours critiques v1.0 | v1.1 | recipe + planning + shopping + assistant + theme | Setup Playwright + mock Mealie via `page.route` ou MSW ; 5 parcours prioritaires |
| V11-2 Audit + corrections a11y WCAG AA | v1.1 | presentation/components (transverse) | axe-core + patterns Radix (Dialog, Autocomplete, Tooltip) |
| V11-3 i18n FR+EN + switch Settings | v1.1 | infrastructure/i18n (nouveau) | i18next + react-i18next, extraction via skill `i18n-extract` |
| V11-4 PWA installable + offline | v1.1 | infrastructure/pwa (nouveau) + planning + shopping | vite-plugin-pwa + Workbox + IndexedDB queue pour mutations offline |
| V11-5 Import URL recette | v1.1 | recipe (extension `IRecipeRepository.scrapeUrl`) | Bridge POST `/api/recipes/scrape-url` Mealie |
| V11-6 Export PDF menu + liste | v1.1 | infrastructure/pdf (nouveau) + planning + shopping | `IPdfExportService` + pdf-lib, i18n-ready |
| V11-7 Audit perfs + lazy load | v1.1 | presentation/pages + presentation/components | Lighthouse + bundle visualizer + React.lazy + dynamic import |
| V20-1 Planning auto IA | v2.0 | planning (extension `IPlanningGeneratorService`, `IPreferencesRepository`) + assistant | LLM structurant + JSON Schema + validation user avant POST |
| V20-2 Nutrition recette + semaine | v2.0 | nutrition (nouveau domaine) + recipe + planning | Open Food Facts (gratuit) ou API tierce + agrégation semaine |
| V20-3 Multi-households | v2.0 | household (nouveau domaine) + planning + shopping | householdContext mutable dans container, feature flag |
| V20-4 Partage public recettes | v2.0 | share (nouveau domaine) + recipe + nouvelle route publique | Page `/shared/:token` non-authentifiée, champs publics uniquement |
| V20-5 Cookbook / collections | v2.0 | cookbook (nouveau domaine) + recipe | Page `/cookbooks` CRUD + ajout/retrait recettes |

**Fonctionnalités sans module PDL identifié** : aucune. Toutes les features V11-* et V20-* mappent sur des modules PDL existants ou nouveaux documentés en PDL §7.5 et §8.2-8.3.

---

## 6. Plan des sprints

> Kanban-solo avec sprints courts optionnels. Les sprints ci-dessous sont des **regroupements logiques** pour la planification, pas des timeboxes rigides. Dates indicatives, marges ±2-3 sem selon disponibilité réelle.
> WIP limit = 2 : pas plus de 2 tickets `In progress` simultanément par sprint.
> Tailles : S = 1 session (~2-4h), M = 2-3 sessions (~4-12h), L = 4+ sessions (à découper).

### Sprint S0 — Setup skills prioritaires (2026-08-10 → 2026-08-24, ~2 sem)

> Sprint court obligatoire — créer les 5 skills prioritaires avant tout ticket v1.1. Ces skills outillent l'exécution de tous les sprints suivants.

| Ticket | Titre | Module | User story / description | Critères d'acceptation | Dépend | Owner | Exécutant | Estimation |
|--------|-------|--------|---------------------------|------------------------|--------|-------|-----------|------------|
| T1 | Créer skill `code-review` | (méta) | En tant que solo-dev, je veux un skill `code-review` qui exécute la checklist SDLC §9.2 sur une PR et produit un rapport critique/majeur/mineur afin de bloquer les merges critiques | - Skill créé via skill-creator avec prompt SDLC §10.2 - references/checklist.md, severity-rubric.md, bonap-conventions.md inclus - Skill déclenche sur "code review de la PR #N" - Produit rapport markdown + copie dans docs/reviews/pr-{N}-{date}.md - Ne modifie jamais le code | — | solo-dev | claude-code (skill-creator) | S |
| T2 | Créer skill `commit-helper` | (méta) | En tant que solo-dev, je veux un skill `commit-helper` qui formule des commit messages au format conventional commits Bonap afin de normaliser l'historique | - Skill créé avec prompt SDLC §10.2 - references/types-scopes.md + anti-patterns.md inclus - Déclenche sur "commit ça" - Exécute `git commit -m` avec HEREDOC - Pas d'emoji, pas de point final, subject impératif max 72 chars | — | solo-dev | claude-code (skill-creator) | S |
| T3 | Créer skill `branch-naming` | (méta) | En tant que solo-dev, je veux un skill `branch-naming` qui nomme et crée les branches au format trunk-based afin de garantir des branches courtes et rebase-friendly | - Skill créé avec prompt SDLC §10.2 - references/naming-patterns.md + lifecycle.md inclus - Déclenche sur "crée une branche pour [ticket]" - Format `<type>/<scope>-<descriptif>` - Vérifie main à jour avant création | — | solo-dev | claude-code (skill-creator) | S |
| T4 | Créer skill `e2e-test-gen` | (méta) | En tant que solo-dev, je veux un skill `e2e-test-gen` qui génère des specs Playwright pour les parcours critiques Bonap avec mock Mealie afin d'accélérer la couverture E2E | - Skill créé avec prompt MVP-SCOPE §13 - references/bonap-e2e-conventions.md + critical-paths.md inclus - Génère e2e/{feature}.spec.ts - Mock Mealie via `page.route` ou MSW - Pas de `page.waitForTimeout` arbitraire | — | solo-dev | claude-code (skill-creator) | S |
| T5 | Créer skill `scaffold-ddd-feature` | (méta) | En tant que solo-dev, je veux un skill `scaffold-ddd-feature` qui scaffolde l'arborescence complète d'un nouveau domaine DDD afin d'accélérer la création des domaines v1.1/v2.0 | - Skill créé avec prompt MVP-SCOPE §13 - references/ddd-template.md + container-pattern.md inclus - Génère entity, repo interface, repo impl Mealie, use cases, container.ts, hooks, pages, route - TypeScript strict, pas de `any`, named exports | — | solo-dev | claude-code (skill-creator) | S |

**Objectif de sprint (sprint goal)** : les 5 skills prioritaires (code-review, commit-helper, branch-naming, e2e-test-gen, scaffold-ddd-feature) sont créés via skill-creator et opérationnels dans Claude Code.

**Sortie attendue** : 5 skills disponibles dans `~/.claude/skills/`, prêts à être invoqués pour tous les sprints suivants. MCP Playwright, Context7, GitHub, Filesystem, Sequential Thinking installés (T6 parallèle).

---

### Sprint S1 — V11-1 Tests E2E parcours critiques v1.0 (2026-08-24 → 2026-09-14, ~3 sem)

> Sprint court ciblé V11-1 (8h estimées). Premier sprint feature — couvrir v1.0 AVANT de toucher aux features v1.1 pour empêcher les régressions.

| Ticket | Titre | Module | User story / description | Critères d'acceptation | Dépend | Owner | Exécutant | Estimation |
|--------|-------|--------|---------------------------|------------------------|--------|-------|-----------|------------|
| T6 | Installer MCP Playwright, Context7, GitHub, Filesystem, Sequential Thinking | (infra) | En tant que solo-dev, je veux les 5 MCP existants installés afin que Claude Code accède à Playwright, la doc libs, GitHub, Filesystem et le raisonnement structuré | - `claude mcp add playwright ...` exécuté - `claude mcp add context7 ...` exécuté - `claude mcp add github ...` exécuté - `claude mcp add filesystem ...` exécuté - `claude mcp add sequential-thinking ...` exécuté - `claude mcp list` montre les 5 MCP actifs | T1 | solo-dev | claude-code | S |
| T7 | Setup Playwright + mock Mealie | (e2e) | En tant que solo-dev, je veux le setup Playwright opérationnel avec mock Mealie via `page.route` afin que les specs E2E ne dépendent pas d'une instance Mealie réelle | - playwright.config.ts configuré ( Chromium, baseURL localhost:5173) - Mock Mealie centralisé dans e2e/mocks/mealie.ts - `npm run test:e2e` passe sur 1 spec smoke - CI exécute le job e2e (déjà existant) | T6 | solo-dev | claude-code | M |
| T8 | E2E add-recipe-to-planning | recipe + planning | En tant que parent organisateur, je veux ajouter une recette au planning via le RecipePickerDialog afin de planifier ma semaine | - Spec e2e/planning.spec.ts - Navigue /planning, ouvre RecipePickerDialog, recherche recette, sélectionne, ajoute au créneau - Mock Mealie intercepte POST /api/households/mealplans - Assertion : repas affiché dans le calendrier - Généré via skill `e2e-test-gen` | T7 | solo-dev | claude-code (e2e-test-gen) | M |
| T9 | E2E shopping-add-from-recipe | shopping + recipe | En tant que parent organisateur, je veux ajouter les ingrédients d'une recette à la liste "Bonap" afin de générer ma liste de courses | - Spec e2e/shopping.spec.ts - Navigue /recipes, ouvre RecipeDetailModal, clique "Ajouter au panier" - Mock intercepte POST /api/households/shopping/items/create-bulk - Assertion : items ajoutés à /shopping | T7 | solo-dev | claude-code (e2e-test-gen) | M |
| T10 | E2E suggestions-add-to-planning | assistant | En tant que parent organisateur, je veux valider des suggestions IA et ajouter au planning afin de débloquer "qu'est-ce qu'on mange" | - Spec e2e/suggestions.spec.ts - Mock LLM (pas d'appel Anthropic réel en CI) - Navigue /suggestions, critères, génère, ajoute au planning - Assertion : repas ajouté | T7 | solo-dev | claude-code (e2e-test-gen) | M |
| T11 | E2E settings-switch-provider | assistant | En tant qu'admin, je veux basculer le provider LLM dans Settings afin de changer de fournisseur sans recompiler | - Spec e2e/settings.spec.ts - Navigue /settings, change provider + clé + modèle - Assertion : localStorage `bonap_llm_config` mis à jour | T7 | solo-dev | claude-code (e2e-test-gen) | S |
| T12 | E2E theme-switch | theme | En tant qu'utilisateur, je veux basculer le thème (light/dark/system) + couleur d'accent afin de personnaliser l'interface | - Spec e2e/theme.spec.ts - Navigue /settings, change thème + accent - Assertion : localStorage `bonap_theme` + `bonap_accent` mis à jour + DOM reflète le changement | T7 | solo-dev | claude-code (e2e-test-gen) | S |

**Objectif de sprint** : V11-1 terminée. 5 parcours critiques v1.0 couverts par des specs Playwright avec mock Mealie. Régressions v1.0 désormais détectables en CI.

**Sortie attendue** : couverture E2E ≥ 80% des parcours critiques v1.0 (cible roadmap §6). Release v1.1-alpha envisageable.

---

### Sprint S2 — V11-2 Audit + corrections accessibilité WCAG AA (2026-09-14 → 2026-10-05, ~3 sem)

> Sprint court ciblé V11-2 (8h estimées). Audit d'abord, puis corrections priorisées.

| Ticket | Titre | Module | User story / description | Critères d'acceptation | Dépend | Owner | Exécutant | Estimation |
|--------|-------|--------|---------------------------|------------------------|--------|-------|-----------|------------|
| T13 | Créer skill `accessibility-audit` | (méta) | En tant que solo-dev, je veux un skill `accessibility-audit` qui audite WCAG AA via axe-core + analyse patterns Radix afin de garantir l'a11y des pages Bonap | - Skill créé avec prompt MVP-SCOPE §13 - references/wcag-aa-checklist.md + radix-patterns.md + axe-cli.md inclus - Déclenche sur "audite l'accessibilité de [page]" - Produit docs/accessibility-audit-{date}.md | T1 | solo-dev | claude-code (skill-creator) | S |
| T14 | Installer `@axe-core/playwright` | (infra) | En tant que solo-dev, je veux `@axe-core/playwright` installé afin d'automatiser les audits a11y dans les specs E2E | - `npm install -D @axe-core/playwright` - Import dans e2e/smoke.spec.ts - Première assertion axe-core passe - Job CI `a11y` ajouté au workflow ci.yml (SDLC §7.2) | T7 | solo-dev | claude-code | S |
| T15 | Audit a11y pages critiques | presentation/components | En tant que solo-dev, je veux un audit WCAG AA sur /recipes, /planning, /shopping, /settings, RecipeDetailModal, RecipeFormDialog, AssistantDrawer afin d'identifier les violations | - Skill `accessibility-audit` invoqué sur chaque page - Rapport docs/accessibility-audit-{date}.md généré - Violations classées critique/majeur/mineur - Contrastes, focus, aria-labels, role, tab order, landmarks vérifiés | T13, T14 | solo-dev | claude-code (accessibility-audit) | M |
| T16 | Corrections a11y — focus + aria-labels | presentation/components | En tant que cuisinier, je veux naviguer au clavier et au lecteur d'écran afin de pouvoir utiliser Bonap sans souris | - Tout bouton icon-only a `aria-label` - Tout champ form a `<Label>` associé - Modals piègent le focus et le restaurent (Radix Dialog vérifié) - Autocomplete navigable clavier - 0 violation critique axe-core | T15 | solo-dev | claude-code | M |
| T17 | Corrections a11y — contrastes + patterns Radix | presentation/components | En tant qu'utilisateur, je veux des contrastes suffisants et des patterns Radix accessibles afin de lire confortablement | - Contrastes ≥ 4.5:1 sur texte normal, ≥ 3:1 sur gros texte - Tooltip, DropdownMenu, Dialog vérifiés (restore-focus, escape, outside-click) - 0 violation majeur axe-core | T15, T16 | solo-dev | claude-code | S |

**Objectif de sprint** : V11-2 terminée. 0 violation critique axe-core sur parcours critiques. WCAG AA atteinte sur `/recipes`, `/planning`, `/shopping`.

**Sortie attendue** : rapport d'audit + corrections appliquées. Job CI `a11y` actif.

---

### Sprint S3 — V11-3 i18n FR+EN + switch Settings (2026-10-05 → 2026-10-26, ~3 sem)

> Sprint court ciblé V11-3 (6h estimées). i18n avant PWA pour que les chaînes offline soient traduites.

| Ticket | Titre | Module | User story / description | Critères d'acceptation | Dépend | Owner | Exécutant | Estimation |
|--------|-------|--------|---------------------------|------------------------|--------|-------|-----------|------------|
| T18 | Créer skill `i18n-extract` | (méta) | En tant que solo-dev, je veux un skill `i18n-extract` qui extrait les chaînes JSX vers fr.json + en.json + config i18next afin d'accélérer l'internationalisation | - Skill créé avec prompt MVP-SCOPE §13 - references/i18n-conventions.md + extraction-rules.md inclus - Génère src/i18n/locales/fr.json + en.json + src/i18n/config.ts - Remplace chaînes par `t('namespace.key')` | T1 | solo-dev | claude-code (skill-creator) | S |
| T19 | Installer i18next + react-i18next + config | infrastructure/i18n | En tant que solo-dev, je veux i18next configuré avec FR par défaut + EN placeholder afin de préparer le switch de langue | - `npm install i18next react-i18next` - src/i18n/config.ts créé (init i18next + react-i18next) - `II18nService` interface dans domain - `I18nService` implémentation dans infrastructure/i18n - container.ts expose `i18nService` - main.tsx importe la config | T18 | solo-dev | claude-code | M |
| T20 | Extraction FR de base sur toutes les pages | presentation/pages + components | En tant que parent organisateur, je veux l'interface en français par défaut avec i18n afin de préparer la traduction EN | - Skill `i18n-extract` invoqué sur src/presentation/ - src/i18n/locales/fr.json rempli avec chaînes originales - Composants modifiés pour utiliser `t()` - Pas de régression visuelle (FR identique à avant) - typecheck + lint + tests E2E toujours verts | T19 | solo-dev | claude-code (i18n-extract) | M |
| T21 | Traduction EN placeholder + switch Settings | infrastructure/i18n + presentation/pages | En tant qu'utilisateur international, je veux basculer Bonap en EN via Settings afin de naviguer dans ma langue | - src/i18n/locales/en.json rempli (traduction EN) - Switch langue dans SettingsPage (FR/EN) - localStorage `bonap_locale` persisté - `II18nService.changeLanguage(lang)` opérationnel - Tests E2E settings-switch-provider étendus au switch langue | T20 | solo-dev | claude-code | M |

**Objectif de sprint** : V11-3 terminée. i18n FR+EN opérationnel, switch langue dans Settings.

**Sortie attendue** : `II18nService` exposé dans container.ts, toutes les pages utilisent `t()`, FR par défaut, EN switchable.

---

### Sprint S4 — V11-4 PWA installable + offline (2026-10-26 → 2026-11-23, ~4 sem)

> Sprint court ciblé V11-4 (12h estimées). Plus gros morceau v1.1 — découper en sous-tickets si nécessaire.

| Ticket | Titre | Module | User story / description | Critères d'acceptation | Dépend | Owner | Exécutant | Estimation |
|--------|-------|--------|---------------------------|------------------------|--------|-------|-----------|------------|
| T22 | Créer skill `pwa-offline-setup` | (méta) | En tant que solo-dev, je veux un skill `pwa-offline-setup` qui configure vite-plugin-pwa + Workbox + IndexedDB queue afin d'accélérer la mise en place PWA | - Skill créé avec prompt PDL §11 - references/cache-strategies.md + indexeddb-queue.md inclus - Génère vite.config.ts (plugin PWA), service worker, stratégies par catégorie | T1 | solo-dev | claude-code (skill-creator) | S |
| T23 | Installer vite-plugin-pwa + Workbox + manifest | infrastructure/pwa | En tant qu'utilisateur mobile, je veux installer Bonap comme PWA afin de l'épingler sur mon écran d'accueil | - `npm install -D vite-plugin-pwa workbox-window` - vite.config.ts configure le plugin PWA - manifest.webmanifest généré (name, icons, theme_color, display standalone) - `beforeinstallprompt` capturé - `npm run build` génère sw.js | T22 | solo-dev | claude-code (pwa-offline-setup) | M |
| T24 | Stratégies de cache (app shell, API GET, images) | infrastructure/pwa | En tant que cuisinier offline, je veux consulter mes recettes et planning sans réseau afin de cuisiner même sans connexion | - App shell : cache-first (mise à jour arrière-plan Workbox) - API Mealie GET : network-first, fallback cache (stale-while-revalidate) - Images recettes : cache-first (long TTL) - Tokens LLM NON mis en cache (sécurité) - Cache respecte i18n (chaînes traduites avec le bon locale) | T23, T21 | solo-dev | claude-code (pwa-offline-setup) | M |
| T25 | IndexedDB queue pour mutations offline | infrastructure/pwa + planning + shopping | En tant que cuisinier offline, je veux que mes ajouts/suppressions de repas et items shopping soient replayés au retour réseau afin de ne pas perdre mes mutations | - IndexedDB (via `idb`) pour queue mutations - IDs stables pour replay idempotent - Replay au retour réseau (online event) - Tests E2E offline via `context.setOffline(true)` - Pas de perte de données en cas de conflit | T24 | solo-dev | claude-code | L → découper si > 3 sessions |
| T26 | Tests E2E PWA offline | (e2e) | En tant que solo-dev, je veux des tests E2E couvrant le mode offline afin de garantir la robustesse PWA | - Spec e2e/pwa-offline.spec.ts - Scénario : online → ajout repas → offline → ajout item → online → replay - Assertions : queue IndexedDB remplie puis vidée au replay | T25 | solo-dev | claude-code (e2e-test-gen) | M |

**Objectif de sprint** : V11-4 terminée. PWA installable + offline (parcours critique consultable sans réseau, mutations replayées).

**Sortie attendue** : service worker actif, manifest OK, IndexedDB queue opérationnelle, tests E2E offline verts. Release v1.1-beta envisageable.

---

### Sprint S5 — V11-5 Import URL + V11-6 Export PDF (2026-11-23 → 2026-12-14, ~3 sem)

> Sprint court groupant V11-5 (4h) + V11-6 (6h) — deux features courtes indépendantes.

| Ticket | Titre | Module | User story / description | Critères d'acceptation | Dépend | Owner | Exécutant | Estimation |
|--------|-------|--------|---------------------------|------------------------|--------|-------|-----------|------------|
| T27 | Extension `IRecipeRepository.scrapeUrl` | recipe | En tant que parent organisateur, je veux importer une recette depuis une URL afin d'enrichir mon catalogue sans saisie manuelle | - `IRecipeRepository.scrapeUrl(url): Promise<MealieScrapeResult>` ajouté - `RecipeRepository.scrapeUrl` implémente POST `/api/recipes/scrape-url` - Use case `ScrapeUrlRecipeUseCase` créé - container.ts expose le use case - Tests unitaires (mock MealieApiClient) | T5 | solo-dev | claude-code (scaffold-ddd-feature) | M |
| T28 | UI bouton "Importer depuis URL" dans RecipesPage | presentation/pages | En tant que parent organisateur, je veux un bouton "Importer depuis URL" dans RecipesPage afin de déclencher l'import | - Bouton dans RecipesPage header - Dialog avec champ URL + bouton "Importer" - Affiche aperçu (nom, description, image) avant création - Bouton "Créer" → POST + redirect /recipes/:slug - Gestion erreur (URL invalide, scrape échoué) - Test E2E import-url.spec.ts | T27 | solo-dev | claude-code | M |
| T29 | Créer skill `pdf-export-builder` | (méta) | En tant que solo-dev, je veux un skill `pdf-export-builder` qui génère les templates PDF (menu hebdo + liste) avec pdf-lib afin d'accélérer l'export PDF | - Skill créé avec prompt PDL §11 - references/pdf-templates.md + i18n-labels.md inclus - Génère IPdfExportService impl + templates - Gère l'i18n dans le PDF | T1 | solo-dev | claude-code (skill-creator) | S |
| T30 | `IPdfExportService` + implémentation pdf-lib | infrastructure/pdf | En tant que parent organisateur, je veux un service `IPdfExportService` avec `exportWeekMenu` et `exportShoppingList` afin de générer des PDF | - `npm install pdf-lib` (ou `@react-pdf/renderer`) - `IPdfExportService` interface (domain) - `PdfExportService` impl (infrastructure/pdf) - `exportWeekMenu(plan, recipes, locale): Promise<Blob>` - `exportShoppingList(list, items, locale): Promise<Blob>` - Labels traduits via `II18nService` - container.ts expose `pdfExportService` - Bundle < 250 KB gzip (vérifier impact pdf-lib ~70 KB) | T29, T21 | solo-dev | claude-code (pdf-export-builder) | M |
| T31 | Boutons export PDF dans PlanningPage + ShoppingPage | presentation/pages | En tant que parent organisateur, je veux un bouton "Export PDF" dans PlanningPage (menu hebdo) et ShoppingPage (liste) afin d'imprimer pour la cuisine | - Bouton "Export PDF" dans PlanningPage header → déclenche `exportWeekMenu` - Bouton "Export PDF" dans ShoppingPage header → déclenche `exportShoppingList` - Download Blob en navigateur - Gestion erreur - Tests E2E pdf-export.spec.ts | T30 | solo-dev | claude-code | S |

**Objectif de sprint** : V11-5 + V11-6 terminées. Import URL de recette + export PDF menu/liste opérationnels.

**Sortie attendue** : 2 nouvelles features derrière feature flag (pour ne pas casser v1.0 si regression). MCP custom `bonap-pdf` envisageable pour debug templates (T30bis optionnel).

---

### Sprint S6 — V11-7 Audit perfs + release v1.1 (2026-12-14 → 2027-01-15, ~5 sem)

> Sprint court final v1.1 — audit perfs, corrections, puis release alpha → beta → RC → prod.

| Ticket | Titre | Module | User story / description | Critères d'acceptation | Dépend | Owner | Exécutant | Estimation |
|--------|-------|--------|---------------------------|------------------------|--------|-------|-----------|------------|
| T32 | Créer skill `performance-audit` | (méta) | En tant que solo-dev, je veux un skill `performance-audit` qui audite Lighthouse + bundle analyzer afin d'identifier les optimisations perfs | - Skill créé avec prompt MVP-SCOPE §13 - references/lighthouse-targets.md + optimization-patterns.md inclus - Produit docs/performance-audit-{date}.md | T1 | solo-dev | claude-code (skill-creator) | S |
| T33 | Installer `vite-bundle-visualizer` + `@lhci/cli` | (infra) | En tant que solo-dev, je veux `vite-bundle-visualizer` et Lighthouse CI installés afin d'automatiser l'audit perfs en CI | - `npm install -D vite-bundle-visualizer @lhci/cli` - Job CI `lighthouse` ajouté (ci.yml) - Job CI `bundle-size` ajouté (commente la PR avec delta bundle) - Seuils : LCP<2.5s, CLS<0.1, INP<200ms, bundle < 250 KB gzip | T32 | solo-dev | claude-code | S |
| T34 | Audit perfs pages critiques | presentation/pages + components | En tant qu'utilisateur mobile, je veux des perfs rapides (LCP<2.5s, CLS<0.1, INP<200ms) afin de naviguer confortablement | - Skill `performance-audit` invoqué sur /recipes, /planning, /shopping - Rapport docs/performance-audit-{date}.md - Bundle chunks lourds identifiés (react-markdown, lucide-react, pdf-lib) - Recommandations prioritisées (impact × effort) | T33 | solo-dev | claude-code (performance-audit) | M |
| T35 | Lazy load routes non-critiques + dynamic import composants lourds | presentation/pages + components | En tant qu'utilisateur, je veux des pages non-critiques chargées à la demande afin de réduire le bundle initial | - `React.lazy` + Suspense sur /stats, /suggestions, /settings - Dynamic import `RecipeDetailModal`, `RecipeFormDialog` - Vérifier tree-shaking lucide-react (sinon `lucide-react/dist/esm/icons/x`) - Bundle initial < 250 KB gzip - Lighthouse mobile ≥ 90 sur /recipes, /planning, /shopping | T34 | solo-dev | claude-code | M |
| T36 | Release v1.1-alpha | (release) | En tant que solo-dev, je veux tagger v1.1-alpha afin de marquer le jalon alpha (tests E2E + a11y + i18n initial en place) | - DoD §5 satisfaite sur V11-1, V11-2, V11-3 - Tag `v1.1.0-alpha.1` poussé - Image multi-arch buildée - Notes de release rédigées - Smoke test sur instance dev | T8-T12, T16, T17, T21 | solo-dev | claude-code | S |
| T37 | Release v1.1-beta | (release) | En tant que solo-dev, je veux tagger v1.1-beta afin de marquer le jalon beta (toutes features v1.1 implémentées) | - DoD §5 satisfaite sur V11-4, V11-5, V11-6 - Lighthouse mobile ≥ 90 - axe-core sans violation critique - Bundle < 250 KB gzip - Tag `v1.1.0-beta.1` - Smoke test utilisateur pilote | T26, T28, T31, T35 | solo-dev | claude-code | S |
| T38 | Release v1.1-RC + v1.1-prod | (release) | En tant que solo-dev, je veux tagger v1.1-RC puis v1.1-prod afin de livrer v1.1 en production | - DoD §5 satisfaite (18 critères) - Tests E2E + a11y + lighthouse verts en CI - Tag `v1.1.0-rc.1` puis `v1.1.0` - Image multi-arch poussée sur ghcr - Mise à jour addon HA - Smoke test post-deploy sur instance prod (2 semaines de stabilization avant v2.0) | T37 | solo-dev | claude-code | S |

**Objectif de sprint** : V11-7 terminée. v1.1 livrée en production (alpha → beta → RC → prod). Lighthouse mobile ≥ 90, axe-core sans violation critique, bundle < 250 KB gzip.

**Sortie attendue** : tag `v1.1.0` sur main, image multi-arch sur ghcr, addon HA mis à jour. 2 semaines de stabilization avant démarrage v2.0 (T39).

---

### Sprint S7 — V20-1 Planning auto IA (2027-01-26 → 2027-02-23, ~4 sem)

> Sprint court ciblé V20-1 (16h estimées). Feature différenciante v2.0 — démarrer en premier. Démarre 2 semaines après v1.1-prod.

| Ticket | Titre | Module | User story / description | Critères d'acceptation | Dépend | Owner | Exécutant | Estimation |
|--------|-------|--------|---------------------------|------------------------|--------|-------|-----------|------------|
| T39 | Scaffold domaine `planning/preferences` + `IPreferencesRepository` | planning | En tant que parent organisateur, je veux mes préférences (saisons, durée max, catégories préférées/à éviter) persistées afin de configurer le planning auto IA | - Skill `scaffold-ddd-feature` invoqué pour `preferences` - `IPreferencesRepository` interface (localStorage `bonap:preferences`) - `PreferencesRepository` impl - Use cases `GetPreferencesUseCase`, `UpdatePreferencesUseCase` - container.ts expose - Hook `usePreferences` - TypeScript strict, pas de `any` | T38, T5 | solo-dev | claude-code (scaffold-ddd-feature) | M |
| T40 | `IPlanningGeneratorService` interface + type `PlannedWeek` | planning | En tant que solo-dev, je veux l'interface `IPlanningGeneratorService` et le type `PlannedWeek` afin de définir le contrat du générateur IA | - `IPlanningGeneratorService.generateWeek(preferences, history): Promise<PlannedWeek>` - Type `PlannedWeek` : `{ week: Array<{ date, entryType, recipeId, recipeName, rationale }> }` - JSON Schema de validation - Pas d'implémentation (juste l'interface) | T39 | solo-dev | claude-code | S |
| T41 | Créer skill `planning-ia-gen` | (méta) | En tant que solo-dev, je veux un skill `planning-ia-gen` qui génère le prompt structurant et le service de planning auto IA afin d'accélérer l'implémentation V20-1 | - Skill créé avec prompt roadmap §9 - references/prompt-template.md + json-schema.md + fallback-strategy.md inclus - Génère `IPlanningGeneratorService` impl + hook + page | T1 | solo-dev | claude-code (skill-creator) | S |
| T42 | `PlanningGeneratorService` impl (Anthropic tool use + fallback) | infrastructure/llm + planning | En tant que parent organisateur, je veux générer une semaine de repas par IA à partir de mes préférences et historique afin de gagner du temps de planification | - Skill `planning-ia-gen` invoqué - `PlanningGeneratorService` implémente `IPlanningGeneratorService` - Anthropic : tool use + streaming - 8 autres providers : fallback single-turn + JSON parse robuste - Validation JSON Schema stricte - Retry avec prompt de correction (max 2) - Validation `recipeId` via `GetRecipesByIdsUseCase` - Sortie en brouillon (pas de POST direct) | T40, T41 | solo-dev | claude-code (planning-ia-gen) | L → découper si > 3 sessions |
| T43 | `PreferencesPage` UI | presentation/pages | En tant que parent organisateur, je veux une page `/preferences` afin de configurer mes préférences de planning auto IA | - Page `/preferences` créée - Formulaire : saisons préférées, durée max, catégories préférées/à éviter, nombre de repas (lunch/dinner sur 7 jours) - Save via `UpdatePreferencesUseCase` - Ajout dans Sidebar - Route dans App.tsx | T39 | solo-dev | claude-code | M |
| T44 | Bouton "Générer la semaine" dans PlanningPage + validation user | presentation/pages | En tant que parent organisateur, je veux un bouton "Générer la semaine" dans PlanningPage avec aperçu en brouillon afin de valider avant application | - Bouton "Générer la semaine" dans PlanningPage - Aperçu `PlannedWeek` affiché (modal ou panneau) - Boutons : "Valider" (POST via `AddMealUseCase`), "Regénérer" (retry), "Annuler" - Si validation : itérer sur chaque item et `AddMealUseCase.execute(date, entryType, recipeId)` - Feature flag `planningAutoIaEnabled` désactivé par défaut - Test E2E planning-auto-ia.spec.ts (mock LLM) | T42, T43 | solo-dev | claude-code | M |

**Objectif de sprint** : V20-1 terminée. Planning auto IA opérationnel en brouillon (sortie LLM validée par user avant POST).

**Sortie attendue** : `IPlanningGeneratorService` + `IPreferencesRepository` exposés dans container.ts. Page `/preferences` + bouton "Générer la semaine" dans PlanningPage. Feature flag désactivé par défaut. Release v2.0-alpha envisageable.

---

### Sprint S8 — V20-2 Nutrition recette + semaine (2027-02-23 → 2027-03-23, ~4 sem)

> Sprint court ciblé V20-2 (12h estimées). Dépend faiblement de V20-1 (agrégation semaine attend V20-1).

| Ticket | Titre | Module | User story / description | Critères d'acceptation | Dépend | Owner | Exécutant | Estimation |
|--------|-------|--------|---------------------------|------------------------|--------|-------|-----------|------------|
| T45 | Scaffold domaine `nutrition` + `INutritionService` | nutrition | En tant que solo-dev, je veux le nouveau domaine `nutrition` avec `INutritionService` et `NutritionInfo` afin d'organiser la nutrition dans l'architecture DDD | - Skill `scaffold-ddd-feature` invoqué pour `nutrition` - `NutritionInfo` entité (calories, proteines, glucides, lipides, fibres, portionEnGrammes) - `INutritionService` interface : `computeForRecipe(recipe)`, `aggregateForWeek(plan, recipes)` - Pas de repo Mealie (service pur) - container.ts expose | T39, T5 | solo-dev | claude-code (scaffold-ddd-feature) | S |
| T46 | Créer skill `nutrition-integration` | (méta) | En tant que solo-dev, je veux un skill `nutrition-integration` qui intègre Open Food Facts + cache + fallback afin d'accélérer l'implémentation V20-2 | - Skill créé avec prompt roadmap §9 - references/openfoodfacts-api.md + nutrition-schema.md + fallback-strategy.md inclus | T1 | solo-dev | claude-code (skill-creator) | S |
| T47 | `OpenFoodFactsNutritionService` impl + cache | infrastructure/nutrition | En tant que parent organisateur, je veux lookup la nutrition des foods via Open Food Facts afin de calculer les macros par recette | - Skill `nutrition-integration` invoqué - `OpenFoodFactsNutritionService` implémente `INutritionService` - Lookup par food name via `https://world.openfoodfacts.org/api/v2/product/{name}.json` - Cache localStorage `bonap:nutrition_cache` (TTL 30 jours, clé `extractFoodKey(foodName)`) - Fallback `LocalNutritionService` (base CSV) si OFP échoue - Lookup async (pas de blocage UI, skeleton) | T45, T46 | solo-dev | claude-code (nutrition-integration) | M |
| T48 | `computeForRecipe` + `aggregateForWeek` | application/nutrition | En tant que parent organisateur, je veux le calcul nutrition par recette (somme ingrédients × quantité) et par semaine (somme repas planifiés) afin de suivre mon équilibre | - `computeForRecipe(recipe)` : itère `recipeIngredient`, lookup nutrition food, multiplie par `quantity`, somme macros - `aggregateForWeek(plan, recipes)` : somme `computeForRecipe` sur tous les repas planifiés - Tests unitaires (mock OpenFoodFactsNutritionService) - `aggregateForWeek` utilise le `PlannedWeek` si V20-1 livré | T47, T40 | solo-dev | claude-code (nutrition-integration) | M |
| T49 | Affichage nutrition dans RecipeDetailModal + StatsPage | presentation/components + pages | En tant que parent organisateur, je veux la nutrition affichée par recette (RecipeDetailModal) et agrégée par semaine (StatsPage) afin de suivre mon équilibre | - Panneau repliable nutrition dans `RecipeDetailModal` (skeleton pendant lookup async) - Section nutrition agrégée dans `StatsPage` (par jour + total semaine) - Bouton "Saisir manuellement" si food non trouvé OFP - Feature flag `nutritionEnabled` désactivé par défaut - Tests E2E nutrition.spec.ts | T48 | solo-dev | claude-code | M |

**Objectif de sprint** : V20-2 terminée. Nutrition par recette + agrégation semaine opérationnelles.

**Sortie attendue** : `INutritionService` + `OpenFoodFactsNutritionService` + `LocalNutritionService` exposés dans container.ts. Affichage nutrition dans RecipeDetailModal + StatsPage. MCP custom `bonap-nutrition` installé pour debug.

---

### Sprint S9 — V20-3 Multi-households (2027-03-23 → 2027-04-20, ~4 sem)

> Sprint court ciblé V20-3 (10h estimées). Risque régression élevé — feature flag obligatoire.

| Ticket | Titre | Module | User story / description | Critères d'acceptation | Dépend | Owner | Exécutant | Estimation |
|--------|-------|--------|---------------------------|------------------------|--------|-------|-----------|------------|
| T50 | Scaffold domaine `household` + `IHouseholdRepository` | household | En tant que solo-dev, je veux le nouveau domaine `household` avec `IHouseholdRepository` afin d'organiser le multi-households dans l'architecture DDD | - Skill `scaffold-ddd-feature` invoqué pour `household` - `Household` entité (id, name, members) - `IHouseholdRepository` : `getCurrent()`, `switch(householdId)`, `listMembers()`, `invite(email)` - `HouseholdRepository` impl (Mealie `/api/households`) - container.ts expose | T38, T5 | solo-dev | claude-code (scaffold-ddd-feature) | M |
| T51 | `householdContext` mutable dans container.ts | infrastructure | En tant que solo-dev, je veux un `householdContext` mutable dans container.ts que les repos consultent à chaque appel afin d'isoler le filtrage par household | - `householdContext` mutable exposé par container.ts - Valeur par défaut = household courant (comportement identique à v1.0) - Repos planning + shopping consultent `householdContext` à chaque appel - `MealieApiClient` passe `householdId` en header/query selon endpoint - Persistance localStorage `bonap:current_household` - Feature flag `multiHouseholdsEnabled` désactivé par défaut | T50 | solo-dev | claude-code | M |
| T52 | Switch household dans Sidebar + gestion invitations | presentation/components | En tant que parent organisateur, je veux switcher de household dans la Sidebar et gérer les invitations afin de partager le planning familial | - Dropdown household dans Sidebar (si feature flag activé) - Affichage household courant - Switch via `IHouseholdRepository.switch(householdId)` - Page de gestion des invitations (email + bouton "Inviter") - Labels et messages traduits (i18n) | T51, T21 (i18n) | solo-dev | claude-code | M |
| T53 | Filtrage planning + shopping par household + tests E2E | planning + shopping | En tant que parent organisateur, je veux que le planning et la liste de courses soient filtrés par household afin de ne voir que mes données | - Planning : `GetWeekPlanningUseCase` filtre par `householdContext` - Shopping : `GetShoppingItemsUseCase` filtre par `householdContext` - Tests E2E multi-households.spec.ts : single-household toujours vert + multi-households activé - Feature flag `multiHouseholdsEnabled` désactivé par défaut - Pas de régression v1.0 single-household | T51, T8 (E2E v1.0) | solo-dev | claude-code (e2e-test-gen) | M |

**Objectif de sprint** : V20-3 terminée. Multi-households opérationnel derrière feature flag. Pas de régression single-household.

**Sortie attendue** : `IHouseholdRepository` + `householdContext` dans container.ts. Switch dans Sidebar. Tests E2E single + multi-households verts. Release v2.0-beta envisageable.

---

### Sprint S10 — V20-4 Partage public de recettes (2027-04-20 → 2027-05-11, ~3 sem)

> Sprint court ciblé V20-4 (6h estimées). Sécurité critique — revue `code-review` obligatoire.

| Ticket | Titre | Module | User story / description | Critères d'acceptation | Dépend | Owner | Exécutant | Estimation |
|--------|-------|--------|---------------------------|------------------------|--------|-------|-----------|------------|
| T54 | Scaffold domaine `share` + `IShareRepository` | share + recipe | En tant que solo-dev, je veux le nouveau domaine `share` avec `IShareRepository` afin d'organiser le partage public dans l'architecture DDD | - Skill `scaffold-ddd-feature` invoqué pour `share` - `ShareLink` entité (token, slug, expiresAt) - `IShareRepository` : `createShareLink(slug): Promise<ShareLink>`, `getSharedByToken(token): Promise<MealieRecipe>` - `ShareRepository` impl (Mealie `/api/recipes/:slug/share`) - container.ts expose | T38, T5 | solo-dev | claude-code (scaffold-ddd-feature) | M |
| T55 | Page publique `/shared/:token` non-authentifiée | presentation/pages | En tant que visiteur, je veux consulter une recette partagée par token sans authentification afin de la voir sans installer Bonap | - Nouvelle route `/shared/:token` (non-authentifiée) - Page `SharedRecipePage.tsx` - Charge via `getSharedByToken` - N'expose QUE les champs publics `MealieRecipe` (name, description, image, recipeIngredient, recipeInstructions, recipeCategory, tags, prepTime, performTime) - PAS le token, PAS les extras, PAS les households, PAS les clés LLM - Layout simplifié (sans Sidebar, sans AssistantDrawer) | T54 | solo-dev | claude-code | M |
| T56 | Bouton "Partager" dans RecipeDetailModal + revue sécurité | presentation/components | En tant que parent organisateur, je veux un bouton "Partager" dans RecipeDetailModal afin de générer un lien public de ma recette | - Bouton "Partager" dans RecipeDetailModal - `createShareLink(slug)` au clic - Affiche le lien `/shared/:token` avec bouton "Copier" - **Revue `code-review` obligatoire sur ce ticket** (sécurité) - Test E2E share-recipe.spec.ts | T55 | solo-dev | claude-code (code-review) | M |

**Objectif de sprint** : V20-4 terminée. Partage public de recettes par token opérationnel. Sécurité revue.

**Sortie attendue** : `IShareRepository` dans container.ts. Page `/shared/:token` publique. Rapport `code-review` sans critique.

---

### Sprint S11 — V20-5 Cookbook / collections (2027-05-11 → 2027-06-08, ~4 sem)

> Sprint court ciblé V20-5 (8h estimées). Dépend de V11-6 (export PDF) — peut réutiliser la techno PDF.

| Ticket | Titre | Module | User story / description | Critères d'acceptation | Dépend | Owner | Exécutant | Estimation |
|--------|-------|--------|---------------------------|------------------------|--------|-------|-----------|------------|
| T57 | Scaffold domaine `cookbook` + `ICookbookRepository` | cookbook + recipe | En tant que solo-dev, je veux le nouveau domaine `cookbook` avec `ICookbookRepository` afin d'organiser les collections dans l'architecture DDD | - Skill `scaffold-ddd-feature` invoqué pour `cookbook` - `Cookbook` entité (id, name, slug, recipeIds) - `ICookbookRepository` : `getAll()`, `create(name)`, `addRecipe(cookbookId, recipeId)`, `removeRecipe(cookbookId, recipeId)`, `delete(cookbookId)` - `CookbookRepository` impl (Mealie `/api/organizers/cookbooks`) - container.ts expose | T38, T5 | solo-dev | claude-code (scaffold-ddd-feature) | M |
| T58 | `CookbooksPage` CRUD + ajout/retrait recettes | presentation/pages | En tant que parent organisateur, je veux une page `/cookbooks` avec CRUD + ajout/retrait de recettes afin d'organiser mes collections | - Page `/cookbooks` créée - Liste cookbooks (cards) - Bouton "Nouveau cookbook" (dialog) - Détail cookbook (liste recettes + bouton "Ajouter recette" via RecipePickerDialog) - Bouton "Retirer" sur chaque recette - Bouton "Supprimer cookbook" - Route dans App.tsx + Sidebar - Feature flag `cookbooksEnabled` désactivé par défaut - Tests E2E cookbooks.spec.ts | T57 | solo-dev | claude-code | M |
| T59 | Export PDF cookbook (réutilise V11-6) | infrastructure/pdf + cookbook | En tant que parent organisateur, je veux exporter un cookbook en PDF afin de l'imprimer ou le partager | - `IPdfExportService.exportCookbook(cookbook, recipes, locale): Promise<Blob>` - Bouton "Export PDF" dans `CookbooksPage` (détail cookbook) - Réutilise pdf-lib + labels i18n | T58, T30 (V11-6) | solo-dev | claude-code (pdf-export-builder) | S |

**Objectif de sprint** : V20-5 terminée. Cookbook / collections opérationnel derrière feature flag. Export PDF cookbook réutilise V11-6.

**Sortie attendue** : `ICookbookRepository` dans container.ts. Page `/cookbooks`. Tests E2E verts. Release v2.0-RC envisageable.

---

### Sprint S12 — Release v2.0 (2027-06-08 → 2027-06-30, ~3 sem)

> Sprint court final v2.0 — activation feature flags + release alpha → beta → RC → prod.

| Ticket | Titre | Module | User story / description | Critères d'acceptation | Dépend | Owner | Exécutant | Estimation |
|--------|-------|--------|---------------------------|------------------------|--------|-------|-----------|------------|
| T60 | Audit perfs v2.0 (5 nouveaux domaines) | presentation/pages + components | En tant qu'utilisateur mobile, je veux que les 5 nouveaux domaines v2.0 ne dégradent pas LCP/CLS/INP afin de garder des perfs mobiles | - Skill `performance-audit` relancé sur /recipes, /planning, /shopping, /preferences, /cookbooks, /shared/:token - Lazy load des nouvelles pages - Dynamic import des composants nutrition, cookbook - Bundle < 250 KB gzip + 10% max (alerte si >) - Lighthouse mobile ≥ 90 sur toutes les pages | T59, T35 | solo-dev | claude-code (performance-audit) | M |
| T61 | Activation progressive feature flags v2.0 | (infra) | En tant que solo-dev, je veux activer progressivement les feature flags v2.0 (opt-in Settings) afin de laisser l'utilisateur découvrir les features | - Feature flags : `planningAutoIaEnabled`, `nutritionEnabled`, `multiHouseholdsEnabled`, `cookbooksEnabled` - Activation opt-in dans SettingsPage - Persistance localStorage - Feature flags désactivés par défaut (activation manuelle user) - Documenté dans README | T44, T49, T53, T58 | solo-dev | claude-code | S |
| T62 | Release v2.0-alpha | (release) | En tant que solo-dev, je veux tagger v2.0-alpha afin de marquer le jalon alpha (planning IA + nutrition opérationnels) | - DoD §5 satisfaite sur V20-1, V20-2 - Tag `v2.0.0-alpha.1` - Image multi-arch - Notes de release - Smoke test sur instance dev | T44, T49 | solo-dev | claude-code | S |
| T63 | Release v2.0-beta | (release) | En tant que solo-dev, je veux tagger v2.0-beta afin de marquer le jalon beta (multi-households + partage implémentés) | - DoD §5 satisfaite sur V20-3, V20-4 - Feature flag `multiHouseholdsEnabled` en place - Tests E2E couvrent les nouveaux parcours - Tag `v2.0.0-beta.1` - Smoke test utilisateur pilote | T53, T56 | solo-dev | claude-code | S |
| T64 | Release v2.0-RC + v2.0-prod | (release) | En tant que solo-dev, je veux tagger v2.0-RC puis v2.0-prod afin de livrer v2.0 en production | - DoD §5 satisfaite sur V20-5 - Tests E2E + a11y + lighthouse toujours verts - Pas de régression v1.0/v1.1 (vérifié par feature flags désactivés) - Tag `v2.0.0-rc.1` puis `v2.0.0` - Image multi-arch poussée sur ghcr - Mise à jour addon HA - Smoke test post-deploy sur instance prod - Feature flags activés progressivement (opt-in) | T59, T60, T61, T63 | solo-dev | claude-code | S |

**Objectif de sprint** : v2.0 livrée en production. 5 features v2.0 derrière feature flags opt-in.

**Sortie attendue** : tag `v2.0.0` sur main, image multi-arch sur ghcr, addon HA mis à jour. Feature flags activés opt-in.

---

## 7. Dépendances critiques entre tickets

Liste des dépendances qui peuvent bloquer le plan si elles sont mal gérées (cross-référence roadmap §4 — 9 dépendances inter-versions) :

- **T8-T12 (V11-1 E2E) → T7 (setup Playwright)** : T7 pose le mock Mealie que tous les specs E2E utilisent. Sans T7, pas de specs.
- **T16-T17 (a11y corrections) → T15 (audit a11y)** : l'audit identifie les violations à corriger.
- **T21 (i18n EN + switch) → T20 (extraction FR)** : l'extraction FR doit précéder la traduction EN.
- **T24 (cache PWA) → T21 (i18n)** : le cache PWA respecte i18n — i18n en place avant PWA (PDL §8.2).
- **T26 (E2E PWA offline) → T25 (IndexedDB queue)** : la queue offline doit être en place pour tester le mode offline.
- **T30 (IPdfExportService) → T21 (i18n)** : les labels PDF sont traduits — i18n en place avant PDF (PDL §8.2).
- **T38 (release v1.1-prod) → T39 (sprint v2.0)** : v2.0 démarre 2 semaines après v1.1-prod stabilisée (roadmap §4 dépendance 10).
- **T39 (scaffold preferences) → T38 (v1.1-prod) + T5 (scaffold-ddd-feature)** : le scaffold d'un nouveau domaine v2.0 nécessite le skill créé en S0.
- **T42 (PlanningGeneratorService) → T40 (interface) + T41 (skill planning-ia-gen)** : l'implémentation consomme l'interface et le skill.
- **T44 (bouton générer) → T42 (service) + T43 (PreferencesPage)** : l'intégration UI nécessite le service et la page de préférences.
- **T48 (aggregateForWeek nutrition) → T40 (PlannedWeek)** : l'agrégation nutrition semaine s'appuie sur `PlannedWeek` (roadmap §4 dépendance 4 — V20-2 dépend V20-1).
- **T52 (switch household Sidebar) → T21 (i18n)** : labels households + invitations traduits (roadmap §4 dépendance 5 — V20-3 dépend V11-3).
- **T53 (filtrage household + E2E) → T8 (E2E v1.0)** : tests E2E protègent parcours single-household (roadmap §4 dépendance 6 — V20-3 dépend V11-1).
- **T55 (page publique /shared/:token) → T54 (scaffold share)** : la page publique consomme `IShareRepository`.
- **T56 (bouton partager) → T55 (page publique) + code-review sécurité** : revue sécurité obligatoire (sécurité critique).
- **T59 (export PDF cookbook) → T30 (IPdfExportService V11-6)** : cookbook réutilise la techno PDF (roadmap §4 dépendance 8 — V20-5 dépend V11-6).
- **T64 (release v2.0-prod) → T59 (cookbook) + T60 (perfs v2.0) + T61 (feature flags) + T63 (v2.0-beta)** : toutes les features v2.0 + perfs + feature flags doivent être en place avant prod.

**Cycles détectés** : aucun. Le graphe de dépendances est un DAG (directed acyclic graph) — pas de dépendance circulaire.

---

## 8. Risques et points à clarifier

Risques détectés lors du croisement (cross-référence roadmap §7 + PDL §10) :

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Régression v1.0 pendant features v1.1 (T8-T37) | Élevé — utilisateurs bloqués | Tests E2E couvrent v1.0 d'abord (Sprint S1 V11-1 en premier) + feature flags pour tout ce qui touche au code v1.0 + rollback Docker < 5 min |
| PWA offline mal testée (T25-T26) — sync conflict, perte données | Moyen | IndexedDB queue avec IDs stables pour replay idempotent ; tests E2E offline via `context.setOffline(true)` ; retry policy |
| Bundle explose avec deps PWA/PDF/i18n (T19, T23, T30) | Moyen — LCP mobile dégradé | Skill `performance-audit` (T32) + job Lighthouse CI (T33) + check bundle-size sur PR + `pdf-lib` (~70 KB gzip) justifié |
| i18n extraction manquée (T20) — chaînes oubliées | Faible | Skill `i18n-extract` (regex + revue manuelle) + test visuel post-traduction ; relancer incrémentalement sur nouvelles pages |
| Planning auto IA génère JSON malformé (T42) — provider hors-Anthropic sans tool use | Moyen — UX dégradée | Validation JSON Schema stricte + retry avec prompt de correction (max 2) + fallback sur saisie manuelle |
| Nutrition : Open Food Facts insuffisant (T47) — base incomplète | Moyen — feature bloquée | Évaluer OFP en v2.0-alpha (T62) ; fallback `LocalNutritionService` (base CSV) + saisie manuelle ; MCP `bonap-nutrition` pour itérer |
| Multi-households casse planning/shopping existants (T51-T53) | Élevé — régression v1.0 | Feature flag `multiHouseholdsEnabled` désactivé par défaut ; `householdContext` mutable avec valeur par défaut = household courant ; tests E2E single-household restent verts |
| Partage public expose des champs privés (T55-T56) | Critique — sécurité | Page publique `/shared/:token` n'expose QUE les champs publics `MealieRecipe` ; pas le token, pas les extras, pas les households, pas les clés LLM ; **revue `code-review` obligatoire** sur T56 |
| Anthropic API change ou augmente pendant v2.0 (T42) | Moyen — feature différenciante impactée | MCP `mealie-api` pour itérer côté Mealie ; fallback single-turn pour les 8 autres providers ; prompt structurant + JSON parse robuste |
| Mealie API breaking change entre v1.1 et v2.0 | Élevé — casse plusieurs repos | Tests E2E couvrent endpoints critiques ; versionning `MealieApiClient` si divergence majeure ; `page.route` mocks dans tests E2E |
| Disponibilité utilisateur réduite sur v2.0 (vacances, autres projets) | Moyen — v2.0 glisse au-delà 2027-06 | Marges ±3 sem incluses dans jalons v2.0 ; si variance > 4 sem, réviser roadmap et pousser V20-4 + V20-5 en v2.1 (Q10) |
| Test E2E flaky en CI pendant v2.0 (nouvelles pages, async IA) | Faible — CI rouge intermittent | Retry policy Playwright (2 retries sur CI) ; identifier les flaky et fix ou skip avec justification ; tests E2E IA avec mock LLM (pas d'appel réel Anthropic) |

Questions ouvertes à trancher avant démarrage des sprints concernés (cross-référence roadmap §8 Q1-Q12) :

- **Q1** (après v1.1-beta) : utilisateurs self-hosted Mealie cherchent-ils réellement un front alternatif ? Si adoption faible, réviser priorité v2.0.
- **Q2** (après v1.1-beta) : mode offline PWA vrai besoin ou nice-to-have ? Tracking `beforeinstallprompt` + retours utilisateurs.
- **Q3** (pendant v1.1) : multi-households nécessaire au-delà d'une famille unique ? Si faible, désactiver feature flag par défaut.
- **Q4** (v2.0) : répartition Anthropic vs autres providers LLM en pratique ? Si Anthropic domine, optimiser parcours planning auto IA en priorité Anthropic.
- **Q5** (v1.1) : audience suffisamment internationale pour justifier i18n EN ? Si < 10% non-FR, rester FR+EN uniquement.
- **Q6** (v2.0-alpha) : service nutrition tiers payant ou base locale OFP ? Prototype V20-2-alpha sur OFP ; si qualité insuffisante, évaluer API payante.
- **Q7** (début V20-4) : page publique non-authentifiée ou mécanisme Mealie natif ? Vérifier endpoint Mealie `/api/recipes/:slug/share`.
- **Q8** (tranché PDL §8.2) : PWA avant import URL — PWA protège l'usage cuisine mobile (cas d'usage principal).
- **Q9** (roadmap) : v1.2 entre v1.1 et v2.0 si v1.1 génère beaucoup de bugfixs ? Décision : patches v1.1.x en Kanban continu, pas de v1.2 structurée.
- **Q10** (après v2.0-alpha) : si v2.0 dépasse horizon 12 mois, pousser V20-4 + V20-5 en v2.1 ?
- **Q11** (tranché) : planning auto IA gratuit — Bonap self-hosted, pas de monétisation, coût absorbé par clé API LLM user.
- **Q12** (tranché) : pas de mini-backend proxy en v2.0 — partage public utilise mécanisme Mealie natif.

---

## 9. Calendrier global

| Sprint | Dates indicatives (marges ±2-3 sem) | Versions livrées |
|--------|-------------------------------------|-------------------|
| S0 | 2026-08-10 → 2026-08-24 (setup skills) | — |
| S1 | 2026-08-24 → 2026-09-14 (V11-1 E2E) | — |
| S2 | 2026-09-14 → 2026-10-05 (V11-2 a11y) | — |
| S3 | 2026-10-05 → 2026-10-26 (V11-3 i18n) | — |
| S4 | 2026-10-26 → 2026-11-23 (V11-4 PWA) | — |
| S5 | 2026-11-23 → 2026-12-14 (V11-5 + V11-6) | — |
| S6 | 2026-12-14 → 2027-01-15 (V11-7 perfs + release v1.1) | v1.1-alpha (T36), v1.1-beta (T37), v1.1-RC + v1.1-prod (T38) |
| S7 | 2027-01-26 → 2027-02-23 (V20-1 planning IA) | — |
| S8 | 2027-02-23 → 2027-03-23 (V20-2 nutrition) | — |
| S9 | 2027-03-23 → 2027-04-20 (V20-3 multi-households) | — |
| S10 | 2027-04-20 → 2027-05-11 (V20-4 partage) | — |
| S11 | 2027-05-11 → 2027-06-08 (V20-5 cookbook) | — |
| S12 | 2027-06-08 → 2027-06-30 (release v2.0) | v2.0-alpha (T62), v2.0-beta (T63), v2.0-RC + v2.0-prod (T64) |

**Total** : 13 sprints (S0 setup + S1-S6 v1.1 + S7-S12 v2.0) = ~64 tickets. v1.0 déjà livrée — pas de tickets v1.0.

---

## 10. Definition of Done — plan d'exécution

Le plan d'exécution est "done" quand :

- [x] Tous les sprints sont planifiés avec tickets, owners (solo-dev), exécutants (claude-code ou skill spécialisé), estimations et dépendances
- [x] Chaque fonctionnalité de roadmap (V11-1 à V11-7, V20-1 à V20-5) est tracée à un module PDL (ou en question ouverte)
- [x] Les dépendances critiques sont listées et sans cycle (DAG vérifié)
- [x] Les points à clarifier (Q1-Q12) sont documentés et assignés à un destinataire (utilisateur / validation en cours de route)
- [x] La DoD du SDLC §5 est référencée et appliquée à chaque ticket (18 critères — qualité code, tests, a11y/perfs, doc/conventions)
- [x] Le calendrier global couvre toutes les versions de la roadmap (v1.1 + v2.0)
- [x] La section "Skills spécialisés à créer (skill-creator)" liste tous les 14 skills nécessaires avec leur prompt skill-creator
- [x] La section "MCP spécialisés à créer / installer" liste tous les 9 MCP nécessaires (3 custom + 6 existants) avec leur spec complète (custom) ou commande d'installation (existants), et cross-référence les tickets outillés

---

## 11. Skills spécialisés à créer (skill-creator)

> 14 skills IA à créer en local via skill-creator pour exécuter ce plan. Cross-référence chaque skill avec les tickets qu'il permet d'exécuter. 5 skills prioritaires (S0) + 6 skills v1.1 séquencés + 1 optionnel + 2 skills v2.0 spécifiques roadmap.

### Skill : `code-review` (priorité immédiate — S0)

**Tickets couverts** : T1 (création) + tous les tickets de merge (T8-T64) — exécuté avant chaque merge de PR.

**Prompt à fournir à skill-creator** : voir SDLC §10.2 — prompt complet inclus dans le document SDLC.

### Skill : `commit-helper` (priorité immédiate — S0)

**Tickets couverts** : T2 (création) + tous les commits (T8-T64) — exécuté à chaque commit.

**Prompt à fournir à skill-creator** : voir SDLC §10.2.

### Skill : `branch-naming` (priorité immédiate — S0)

**Tickets couverts** : T3 (création) + toutes les branches (T8-T64) — exécuté à chaque nouvelle branche.

**Prompt à fournir à skill-creator** : voir SDLC §10.2.

### Skill : `e2e-test-gen` (priorité immédiate — S0)

**Tickets couverts** : T4 (création) + T8-T12 (V11-1 E2E v1.0), T26 (E2E PWA offline), T44 (E2E planning IA), T53 (E2E multi-households), T56 (E2E share), T58 (E2E cookbook).

**Prompt à fournir à skill-creator** : voir MVP-SCOPE §13.

### Skill : `scaffold-ddd-feature` (priorité immédiate — S0)

**Tickets couverts** : T5 (création) + T27 (scrapeUrl), T39 (preferences), T45 (nutrition), T50 (household), T54 (share), T57 (cookbook) — tous les nouveaux domaines v1.1/v2.0.

**Prompt à fournir à skill-creator** : voir MVP-SCOPE §13.

### Skill : `i18n-extract` (v1.1 — S3)

**Tickets couverts** : T18 (création) + T20 (extraction FR) — exécuté sur src/presentation/ puis incrémentalement sur nouvelles pages.

**Prompt à fournir à skill-creator** : voir MVP-SCOPE §13.

### Skill : `accessibility-audit` (v1.1 — S2)

**Tickets couverts** : T13 (création) + T15 (audit pages critiques) — exécuté en fin de ticket a11y + sur les nouvelles pages v2.0 (T43 PreferencesPage, T55 SharedRecipePage, T58 CookbooksPage).

**Prompt à fournir à skill-creator** : voir MVP-SCOPE §13.

### Skill : `pwa-offline-setup` (v1.1 — S4)

**Tickets couverts** : T22 (création) + T23 (vite-plugin-pwa) + T24 (stratégies de cache) — exécuté une fois en début v1.1.

**Prompt à fournir à skill-creator** : voir PDL §11.

### Skill : `pdf-export-builder` (v1.1 — S5)

**Tickets couverts** : T29 (création) + T30 (IPdfExportService) + T59 (export PDF cookbook v2.0) — exécuté en v1.1 puis réutilisé en v2.0 pour cookbook.

**Prompt à fournir à skill-creator** : voir PDL §11.

### Skill : `performance-audit` (v1.1 — S6)

**Tickets couverts** : T32 (création) + T34 (audit perfs v1.1) + T60 (audit perfs v2.0) — exécuté après features v1.1 perfs + à la fin de chaque feature v2.0.

**Prompt à fournir à skill-creator** : voir MVP-SCOPE §13.

### Skill : `tech-debt-audit` (optionnel — trimestriel)

**Tickets couverts** : aucun ticket direct — exécuté trimestriellement pour identifier les modules à refactor, les tests manquants, les dépendances obsolètes. Ajoute des tickets au backlog.

**Prompt à fournir à skill-creator** : voir SDLC §10.2.

### Skill : `recipe-migration` (optionnel — ponctuel)

**Tickets couverts** : aucun ticket direct — exécuté ponctuellement pour migrations externes (Paprika, Mealie JSON, Marmiton scraping, texte libre) vers Mealie.

**Prompt à fournir à skill-creator** : voir MVP-SCOPE §13.

### Skill : `planning-ia-gen` (v2.0 — S7, nouveau spécifique roadmap)

**Tickets couverts** : T41 (création) + T42 (PlanningGeneratorService impl) + T44 (bouton générer).

**Prompt à fournir à skill-creator** : voir roadmap §9 — prompt complet inclus dans le document roadmap.

### Skill : `nutrition-integration` (v2.0 — S8, nouveau spécifique roadmap)

**Tickets couverts** : T46 (création) + T47 (OpenFoodFactsNutritionService) + T48 (computeForRecipe + aggregateForWeek).

**Prompt à fournir à skill-creator** : voir roadmap §9 — prompt complet inclus dans le document roadmap.

### Récapitulatif par version

| Version | Skills nécessaires | Nouveaux skills spécifiques |
|---------|--------------------|------------------------------|
| v1.0 (livrée) | Aucun (skills créés pour v1.1+ utilisés en maintenance) | — |
| v1.1 — début (S0) | `code-review`, `commit-helper`, `branch-naming`, `e2e-test-gen`, `scaffold-ddd-feature` (priorité immédiate) | — |
| v1.1 — séquencé (S1-S6) | `accessibility-audit`, `i18n-extract`, `pwa-offline-setup`, `pdf-export-builder`, `performance-audit`, `tech-debt-audit` (trimestriel) | — |
| v1.1 — optionnel | `recipe-migration` | — |
| v2.0 (S7-S12) | `planning-ia-gen`, `nutrition-integration` (nouveaux spécifiques roadmap) | `planning-ia-gen`, `nutrition-integration` |

**Total skills à créer** : 14 (5 immédiats S0 + 6 séquencés v1.1 + 1 optionnel + 2 nouveaux v2.0).

---

## 12. MCP spécialisés à créer / installer

> 9 MCP nécessaires (3 custom à développer + 6 existants à installer). Cross-référence chaque MCP avec les tickets/modules qu'il outille.

### MCP custom à développer

#### MCP : `mealie-api` (priorité immédiate — v1.1 + v2.0)

**Tickets outillés** : T6 (installation parallèle), T27 (scrapeUrl debug), T39 (preferences debug), T42 (planning IA debug), T47 (nutrition lookup), T50 (household debug), T54 (share debug), T57 (cookbook debug) — debug + tests + analyse de données Mealie pendant tout le dev.

**Modules couverts** : recipe, planning, shopping, organizer, household, share, cookbook.

**Spec d'implémentation** : voir MVP-SCOPE §14 + PDL §12 + SDLC §11 — spec complète (14 outils + 7 resources + 3 prompts templates, transport stdio, TypeScript `@modelcontextprotocol/sdk`, auth Bearer token via env `MEALIE_URL` + `MEALIE_TOKEN`).

**Commande d'installation** :
```bash
claude mcp add mealie-api -- node /home/zephus/Projets/bonap/mcp/mealie-api/server.js
```

#### MCP : `bonap-pdf` (v1.1 — S5)

**Tickets outillés** : T30 (IPdfExportService debug), T59 (export PDF cookbook debug v2.0) — debug des templates PDF pendant V11-6 et V20-5.

**Modules couverts** : infrastructure/pdf, cookbook (v2.0).

**Spec d'implémentation** : voir PDL §12 + SDLC §11 + roadmap §10 — 3 outils (`render_week_menu_pdf`, `render_shopping_list_pdf`, `validate_pdf_template`), transport stdio, TypeScript, pas d'auth (MCP local de debug), dépendances `pdf-lib` ou `@react-pdf/renderer`.

**Commande d'installation** :
```bash
claude mcp add bonap-pdf -- node /home/zephus/Projets/bonap/mcp/bonap-pdf/server.js
```

#### MCP : `bonap-nutrition` (v2.0 — S8)

**Tickets outillés** : T47 (OpenFoodFactsNutritionService debug), T48 (computeForRecipe + aggregateForWeek debug) — wrapper base nutrition (Open Food Facts) pour dev V20-2.

**Modules couverts** : nutrition, recipe, planning.

**Spec d'implémentation** : voir PDL §12 + SDLC §11 + roadmap §10 — 4 outils (`lookup_food_nutrition`, `compute_recipe_nutrition`, `aggregate_week_nutrition`, `clear_nutrition_cache`), transport stdio, TypeScript, pas d'auth pour OFP (public API), API key si service payant (env `NUTRITION_API_KEY`).

**Commande d'installation** :
```bash
claude mcp add bonap-nutrition -- node /home/zephus/Projets/bonap/mcp/bonap-nutrition/server.js
```

### MCP existants à installer

| MCP | Commande d'installation | Tickets outillés | Justification |
|-----|--------------------------|------------------|---------------|
| **Playwright MCP** | `claude mcp add playwright -- npx -y @playwright/mcp-server` | T6, T7, T8-T12 (V11-1 E2E), T26 (E2E PWA), T44, T53, T56, T58 (E2E v2.0) + T15 (captures a11y) | Génération + exécution de tests E2E depuis Claude Code ; captures visuelles pour a11y |
| **Context7 MCP** | `claude mcp add context7 -- npx -y @upstash/context7-mcp` | T19 (i18next), T23 (vite-plugin-pwa), T30 (pdf-lib), T42 (Anthropic tool use), T47 (Open Food Facts), tous les tickets implémentation | Doc libs à jour (React 19, Radix, Vite 8, Tailwind v4, React Router v7, Workbox, i18next, pdf-lib, axe-core) |
| **GitHub MCP** | `claude mcp add github -- npx -y @modelcontextprotocol/server-github` | T1 (code-review), tous les tickets de merge (T8-T64) | Lecture/création de PRs, issues, reviews — utilisé par skill `code-review` pour `gh pr diff` |
| **Filesystem MCP** | `claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem /home/zephus/Projets/bonap` | T1 (code-review), T13 (accessibility-audit), T32 (performance-audit), tech-debt-audit | Accès fichiers étendu pour les skills de revue/audit |
| **Sentry MCP** (v1.1+ — post-déploiement) | `claude mcp add sentry -- npx -y @sentry/mcp-server` | T38 (post-deploy v1.1), T64 (post-deploy v2.0) | Observabilité prod — détecte les régressions PWA/i18n/PDF/nutrition/multi-households post-deploy |
| **Sequential Thinking MCP** | `claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking` | T25 (IndexedDB queue PWA), T42 (planning auto IA), T51 (householdContext mutable), T55 (sécurité partage public) | Raisonnement structuré pour planification glissante, refactoring multi-households, planning auto IA |

### MCP déjà installés à réutiliser

| MCP | Tickets outillés | Rôle dans ce projet |
|-----|------------------|---------------------|
| (à compléter par l'utilisateur — vérifier `claude mcp list` pour les MCP déjà présents sur la machine) | — | À évaluer |

### Récapitulatif par version

| Version | MCP existants à installer | MCP custom à développer |
|---------|---------------------------|------------------------|
| v1.1 — début (S0-S1) | Playwright, Context7, GitHub, Filesystem, Sequential Thinking | `mealie-api` |
| v1.1 — séquencé (S4-S6) | Sentry (post-déploiement v1.1) | `bonap-pdf` |
| v2.0 (S7-S12) | (rien de nouveau — Sentry déjà installé en v1.1) | `bonap-nutrition` |

**Total MCP** : 6 existants à installer + 3 custom à développer = **9 MCP**.

---

## Écho de vérification

### Compréhension du SDLC

Kanban-solo avec sprints courts optionnels (1-2 sessions, déclenchés au cas par cas), WIP limit = 2, throughput cible 1-3 tickets/sem glissante sur 4 semaines. DoR 8 critères (énoncé, CA, périmètre DDD, dépendances, tests, régression v1.0, taille S/M/L, labels). DoD 18 critères répartis en qualité code (6), tests (5), a11y/perfs (3), doc/conventions (4). Trunk-based, branches courtes < 3 sessions, rebase au lieu de merge. Code review par sous-agent `code-review` (bloquant si critique). Environnements : Local (dev Vite proxy) → Preview (vite preview) → CI (GitHub Actions) → Prod (self-hosted Docker multi-arch + addon HA). Gating : lint + typecheck + unit + e2e + docker build en CI, puis code-review IA, puis merge main, puis release.yml tag, puis image ghcr.

### Compréhension de la roadmap

2 versions à livrer sur 12 mois (horizon 2026-08-10 → 2027-08-10). v1.1 cible prod 2027-01-15 (alpha 2026-11-15, beta 2026-12-15, RC 2027-01-05) — ~44h dev (V11-1 E2E, V11-2 a11y, V11-3 i18n, V11-4 PWA, V11-5 import URL, V11-6 export PDF, V11-7 perfs). v2.0 cible prod 2027-06-30 (alpha 2027-03-15, beta 2027-04-30, RC 2027-06-15) — ~52h dev (V20-1 planning IA, V20-2 nutrition, V20-3 multi-households, V20-4 partage, V20-5 cookbook). v2.0 démarre 2 semaines après v1.1-prod stabilisée. 9 dépendances inter-versions documentées (v1.1→v1.0, v2.0→v1.1, V20-1→V11-1, V20-2→V20-1, V20-3→V11-3, V20-3→V11-1, V20-4→V20-3, V20-5→V11-6, v2.0→v1.1 skills, v2.0-alpha→v1.1-prod). v1.0 déjà livrée — pas de tickets v1.0.

### Compréhension du PDL

Architecture DDD 5 couches (domain / application / infrastructure / presentation / shared) avec container singleton pour injection de dépendances. 6 domaines existants (recipe, planning, shopping, organizer, assistant, theme). v1.1 étend recipe (scrapeUrl), planning + shopping (offline IndexedDB), et ajoute 3 nouveaux modules infrastructure (i18n, pwa, pdf). v2.0 ajoute 5 nouveaux domaines (nutrition, household, share, cookbook, preferences) + étend planning (IPlanningGeneratorService). Stack : React 19.2 + TypeScript 6.0 strict + Vite 8 + Tailwind v4 + React Router v7 + shadcn/ui + lucide-react + react-markdown. Backend imposé : Mealie self-hosted (19 endpoints API REST + 5 nouveaux en v1.1/v2.0). State management : useState/useCallback/useRef dans hooks custom, pas de Redux/Zustand/React Query. Séquencement v1.1 : E2E → a11y → i18n → PWA → import URL → export PDF → perfs. Séquencement v2.0 : planning IA → nutrition → multi-households → partage → cookbook.

### Points à clarifier détectés

Aucun point bloquant pour démarrer — l'ordre v1.1 est tranché par PDL §8.2 et l'ordre v2.0 par PDL §8.3. Les 12 questions ouvertes (Q1-Q12) de la roadmap sont des hypothèses à valider en cours d'exécution (après v1.1-beta pour Q1-Q5, après v2.0-alpha pour Q6-Q7, tranchées par PDL pour Q8-Q12), pas des blockers pour démarrer S0 ou S1. Les 11 risques détectés (§8) ont tous une mitigation documentée (feature flags, tests E2E, rollback Docker, MCP custom, fallbacks LLM, etc.).

### Présupposition fondamentale respectée

**Exécution exclusivement solo + Claude Code + sous-agents IA spécialisés créés via skill-creator en local. Pas d'équipe humaine.** Tous les tickets ont Owner = solo-dev (supervision + validation + déploiement HA addon) et Exécutant = claude-code ou un sous-agent spécialisé (14 skills identifiés). Aucune répartition de rôles humains (pas de frontend/backend/devops/data). Le throughput cible (1-3 tickets/sem) est calibré sur la disponibilité déclarée (~8h/sem variable). Les dates cibles sont glissantes et absorbent la variabilité — il n'y a pas de deadline externe. 9 MCP (3 custom + 6 existants) outillent Claude Code pour l'exécution.