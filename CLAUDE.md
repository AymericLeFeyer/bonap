# CLAUDE.md — Bonap

Mémoire projet pour Claude Code. Compressée depuis les 5 livrables `docs/` (MVP-SCOPE, PDL, SDLC, ROADMAP, MVP-EXEC). Mis à jour : 2026-08-10.

## 1. Projet

**Bonap** : front-end React pour [Mealie](https://mealie.io) (app self-hosted de recettes + planning repas). Remplace l'UI Mealie par une interface enrichie (suggestions IA, stats, liste de courses avec "Habituels", thème personnalisable).

**Env** (`.env`) : `VITE_MEALIE_URL` (URL instance Mealie), `VITE_MEALIE_TOKEN` (bearer API). Vite proxie `/api` → Mealie en dev. En prod, Mealie doit être accessible depuis le navigateur.

## 2. Stack

React 19 · TypeScript 5.9 strict · Vite 8 · Tailwind v4 (`@tailwindcss/vite`) · React Router v7 · shadcn/ui (Radix + Tailwind, composants dans `src/presentation/components/ui/`) · lucide-react · react-markdown · ESLint 9 + Prettier. **Pas de React Query/Zustand/Redux** — état via `useState`/`useCallback`/`useRef` dans hooks custom.

## 3. Architecture DDD

```
src/
├── domain/          # Métier pur. organizer/ (foods, units, categories, tags), planning/ (+ services/PlanningStatsService), recipe/, shopping/ (entities + repositories)
├── application/     # Use cases. Une classe par use case, injection de repo. <domaine>/usecases/<Verbe><Nom>UseCase.ts
├── infrastructure/  # container.ts (SINGLETON — toutes les instances repo + use case), llm/ (AssistantService streaming + tools, LLMService single-turn, LLMConfigService), mealie/api/ + mealie/repositories/, shopping/ (FoodLabelStore, RecipeSlugStore — localStorage), theme/ThemeService.ts
├── presentation/    # components/ (ui/ shadcn + Layout, Sidebar, AssistantDrawer, RecipeCard, RecipeDetailModal, RecipeFormDialog, RecipePickerDialog…), hooks/ (useRecipesInfinite, useRecipe, usePlanning, useShopping, useStats, useAssistant, useTheme…), pages/ (RecipesPage, PlanningPage, StatsPage, ShoppingPage, SuggestionsPage, SettingsPage…)
├── shared/types/    # mealie.ts, llm.ts, errors.ts (MealieApiError + 404/401/5xx spécialisés)
├── shared/utils/    # date.ts, duration.ts (ISO 8601 PT1H30M ↔ "1 h 30 min"), food.ts (extractFoodKey), season.ts (tags `saison-`)
└── lib/utils.ts     # cn() (clsx + tailwind-merge)
```

**Container pattern** : `src/infrastructure/container.ts` est le SEUL fichier qui instancie repos + use cases. Les hooks importent depuis ce fichier, jamais `new XxxRepository()` dans un hook/composant.

## 4. Domaines métier

- **recipe** : `MealieRecipe` (id, slug, name, tags, recipeIngredient, recipeInstructions, prepTime/performTime ISO 8601). Use cases : GetRecipes (paginé + filtres), GetRecipe, GetRecipesByIds, Create/Update, UpdateSeasons, UpdateCategories, `resolveIngredients` (crée aliments manquants, ne crée PAS d'unités).
- **planning** : `MealieMealPlan` (date, entryType "lunch"/"dinner", recipeId). Use cases : GetWeekPlanning, GetPlanningRange, AddMeal, DeleteMeal, GetStats. Services : `computeLeftoverPercentage`, `computeStreak`, `computeCategoryStats`.
- **shopping** : `ShoppingItem`/`ShoppingList`/`ShoppingLabel`. Listes auto-créées "Bonap" + "Habituels". Use cases : GetShoppingItems, AddItem, AddRecipesToList, ToggleItem, DeleteItem, ClearList (mode "checked"|"all"). `FoodLabelStore` (localStorage `bonap:food_labels`) mémorise food_key → labelId.
- **organizer** : référentiels Mealie (foods, units, categories, tags). Use cases Get + CreateFood.

## 5. API Mealie (`MealieApiClient`, singleton `mealieApiClient`)

Auth `Authorization: Bearer <VITE_MEALIE_TOKEN>`. Erreurs 401/404/5xx mappées. Endpoints :

| Méthode | Endpoint | Usage |
|---|---|---|
| GET | `/api/recipes?page=&perPage=&search=&categories=&tags=&maxTotalTime=` | Liste paginée |
| GET | `/api/recipes/:slug` · POST `/api/recipes {name}` · PATCH `/api/recipes/:slug` · PUT `/api/recipes/:slug/image` | CRUD recette |
| GET | `/api/households/mealplans?start_date=&end_date=` · POST · DELETE `/api/households/mealplans/:id` | Planning |
| GET `/api/households/shopping/lists` · POST · GET `/api/households/shopping/lists/:id` | Listes courses |
| POST `/api/households/shopping/items/create-bulk` · PUT `/api/households/shopping/items` · DELETE `?ids=&ids=&` | Items courses |
| GET `/api/organizers/categories` · `/api/organizers/tags` · `/api/foods?perPage=-1` · POST `/api/foods` · GET `/api/units` | Référentiels |
| GET `/api/media/recipes/:id/images/min-original.webp` | Images recettes |

## 6. LLM / Assistant

Deux modes : `llmChat` (single-turn, SuggestionsPage) et `sendAssistantMessage` (streaming multi-turn + tools, AssistantDrawer). Providers : **Anthropic** (seul avec streaming + tool use), OpenAI/Google/Mistral/Perplexity/OpenRouter/OpenCode Zen/OpenCode Go (fallback single-turn sans tools), Ollama (local). Config dans localStorage `bonap_llm_config`. Tools : `search_recipe`, `add_to_planning`, `create_recipe` (synchro entre `AssistantService.ts` et `useAssistant.ts`). Proxy Vite dev : `/anthropic`, `/openai`, `/google-ai`, `/api/opencode`, `/api/opencode-go`.

## 7. Pages / routes

`/` → `/recipes` · `/recipes` · `/recipes/new` · `/recipes/:slug` · `/recipes/:slug/edit` · `/planning` (fenêtre 3/5/7j, cache ±14j) · `/stats` (30j/90j/12m) · `/shopping` (Bonap + Habituels) · `/suggestions` (IA) · `/settings` (LLM + thème). `Layout.tsx` wrap tout : Sidebar + AssistantDrawer (bouton flottant Sparkles).

## 8. Patterns / conventions

- **Nouveau use case** : classe + injection repo → instance dans `container.ts` → hook `use<Nom>.ts` qui importe depuis container → page. Jamais de `new XxxRepository()` hors container.
- **Nouveau composant** : TypeScript strict (pas de `any`), classes Tailwind directes, shadcn/ui pour dialog/badge/button/input/label, `cn()` pour classes conditionnelles.
- **Nommage** : PascalCase composants/classes, camelCase utils/hooks. Use cases `<Verbe><Nom>UseCase.ts`. Hooks `use<Nom>.ts` (préfixe `use` obligatoire). Named exports partout (sauf `App.tsx`/`main.tsx`).
- **État** : `useState`/`useCallback` + optimistic updates (pattern `useShopping.toggleItem` — flip immédiat, rollback si erreur). Pas de store global.
- **Scroll infini** : `useRecipesInfinite` avec `loadingRef` (anti double-fetch) + `filtersKey` sérialisé (arrays triés) pour reset stable.

## 9. Thème

light/dark/system (localStorage `bonap_theme`) + 8 couleurs d'accent oklch (localStorage `bonap_accent`, CSS var `--color-primary`). Singleton `themeService` appliqué dans `main.tsx`.

## 10. Commandes

```bash
npm run dev      # Vite dev server (5173), proxy Mealie + LLM actif
npm run build    # tsc -b && vite build → dist/
npm run lint     # ESLint
npm run preview  # Prévisualisation prod
```

## 11. Pièges critiques

- **DELETE shopping items** : query string doit finir par `&` (`?ids=abc&ids=def&`) — sinon Mealie ignore.
- **POST `/api/recipes`** : retourne `"slug"` (string) OU `{ slug }` selon version — le repo gère les deux.
- **Saisons** : Mealie ne connaît pas les saisons nativement. Tags préfixe `saison-` (ex: `saison-ete`). Résoudre les IDs via GET `/api/organizers/tags` avant PATCH.
- **`perPage=-1`** : OK pour référentiels (foods, units, categories, tags). **Pas pour recettes** (potentiellement des milliers).
- **updateItem shopping** : PUT peut retourner `null` (certaines versions Mealie) — fallback sur données envoyées.
- **Durées** : formulaire en minutes integer, API en ISO 8601 (`PT30M`). Conversion dans `RecipeRepository.minutesToIso()`. `formatDuration()` accepte les deux formats.
- **resolveIngredients** : 2 appels API (foods + units) à chaque create/update. Aliments créés auto, unités non créées (unitId reste undefined → texte libre).
- **Anthropic-only streaming + tool use** : les 8 autres providers ont fallback single-turn sans tools — documenté dans Settings.
- **OpenCode Go/Zen** : pas de CORS header → proxy Vite/nginx (`/api/opencode-go`, `/api/opencode`), comme Ollama.

## 12. Roadmap (voir `docs/ROADMAP.md` pour détail)

- **v1.0** : en prod (v1.3.5 courant). Maintenance corrective en parallèle.
- **v1.1** (cible 2027-01-15, ~44h) : PWA/offline, import URL, export PDF, i18n EN/FR, accessibilité WCAG AA, tests E2E couvrant v1.0 (anti-régression avant v2.0). Sprints S0–S6 dans `docs/MVP-EXEC.md`.
- **v2.0** (cible 2027-06-30, ~52h) : planning auto IA, nutrition (OpenFoodFacts), multi-households, partage public de recettes, cookbook. Feature flags `multiHouseholdsEnabled`/`nutritionEnabled`/`cookbooksEnabled`. Sprints S7–S11 dans `docs/MVP-EXEC.md`.
- **Skills à créer** (via skill-creator, sprint S0) : `scaffold-ddd-feature`, `e2e-test-gen`, `i18n-extract`, `accessibility-audit`, `performance-audit`, `recipe-migration` (optionnel). Voir `docs/PDL.md` §11 et `docs/MVP-EXEC.md` Sprint S0.
- **MCP** : Playwright, Context7, GitHub, Filesystem, Sequential Thinking (install Sprint S0 / T6). Custom `bonap-nutrition`, `bonap-pdf` envisagés en v2.0.

## 13. Références livrables

`docs/MVP-SCOPE.md` (cadrage produit) · `docs/PDL.md` (architecture DDD + modules + séquencement) · `docs/SDLC.md` (méthodologie Kanban-solo, DoR/DoD, CI/CD) · `docs/ROADMAP.md` (v1.1/v2.0 jalons + risques) · `docs/MVP-EXEC.md` (sprints S0–S11 + tickets). Présupposition d'exécution : **solo + Claude Code + sous-agents IA spécialisés créés via skill-creator en local** — pas d'équipe humaine.